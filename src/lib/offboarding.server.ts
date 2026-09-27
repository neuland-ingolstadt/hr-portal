import {
	invalidateDirectoryCache,
	listNonMitgliederAccountsFromAuthentik,
	mockDeleteAccount,
	mockRevokeMitgliederMembership,
} from "#/lib/authentik-members.server";
import { serverConfig } from "#/lib/config";
import { partitionOffboardingStages } from "#/lib/members";
import type {
	DeleteAccountResult,
	RevokeMitgliederResult,
} from "#/lib/offboarding";
import {
	isOffboardingLeavingWatchlist,
	MEMBERSHIP_REVOKED_AT_ATTR,
} from "#/lib/offboarding";

type AuthentikPaginated<T> = {
	results?: T[];
};

type AuthentikGroup = {
	pk?: number | string;
	name?: string;
	group_uuid?: string;
	uuid?: string;
};

type AuthentikUser = {
	pk?: number;
	uuid?: string;
	name?: string;
	username?: string;
	is_active?: boolean;
	attributes?: Record<string, unknown>;
};

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type MutationActor = {
	/** Session `sub` — block self-revoke / self-delete. */
	actorSub?: string;
};

function isAuthentikApiConfigured(): boolean {
	const { apiUrl, apiToken } = serverConfig.authentik;
	return Boolean(apiUrl && apiToken);
}

function apiBase(): string {
	return serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
}

function authHeaders(json = false): HeadersInit {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${serverConfig.authentik.apiToken}`,
		Accept: "application/json",
	};
	if (json) headers["Content-Type"] = "application/json";
	return headers;
}

async function authentikFetch<T>(
	path: string,
	init?: RequestInit & { responseType?: "json" | "none" },
): Promise<T> {
	const response = await fetch(`${apiBase()}${path}`, init);
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(
			`Authentik ${init?.method ?? "GET"} ${path} → ${response.status}: ${detail.slice(0, 300)}`,
		);
	}
	if (init?.responseType === "none" || response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

async function resolveUser(id: string): Promise<AuthentikUser | null> {
	const sub = id.trim();
	if (!sub) return null;

	if (UUID_RE.test(sub)) {
		const body = await authentikFetch<AuthentikPaginated<AuthentikUser>>(
			`/api/v3/core/users/?uuid=${encodeURIComponent(sub)}&page_size=5`,
			{ headers: authHeaders() },
		);
		return (
			body.results?.find((entry) => entry.uuid === sub) ??
			body.results?.[0] ??
			null
		);
	}

	try {
		return await authentikFetch<AuthentikUser>(
			`/api/v3/core/users/${encodeURIComponent(sub)}/`,
			{ headers: authHeaders() },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("→ 404")) return null;
		throw error;
	}
}

async function resolveMitgliederGroupId(): Promise<string | null> {
	const name = serverConfig.groups.mitglieder.trim();
	if (!name) return null;

	const expected = name.toLowerCase();
	const body = await authentikFetch<AuthentikPaginated<AuthentikGroup>>(
		`/api/v3/core/groups/?name=${encodeURIComponent(name)}&page_size=5`,
		{ headers: authHeaders() },
	);

	const group =
		body.results?.find(
			(entry) => entry.name?.trim().toLowerCase() === expected,
		) ?? body.results?.[0];
	if (!group) return null;

	return (
		group.group_uuid ??
		group.uuid ??
		(group.pk != null ? String(group.pk) : null)
	);
}

function isSelfTarget(memberId: string, actorSub?: string): boolean {
	if (!actorSub) return false;
	return memberId.trim() === actorSub.trim();
}

/**
 * Re-check against the same candidate list the UI uses.
 * Rejects watchlist (future resignation), technical users, and random IDs.
 */
async function assertOffboardingMutationAllowed(
	memberId: string,
	action: "revoke" | "delete",
): Promise<boolean> {
	const { members } = await listNonMitgliederAccountsFromAuthentik();
	const stages = partitionOffboardingStages(members);

	if (action === "revoke") {
		const candidate = stages.revokeMembership.find(
			(entry) => entry.id === memberId,
		);
		if (!candidate) return false;
		return !isOffboardingLeavingWatchlist(candidate.easyVereinResignationDate);
	}

	return stages.deleteAccount.some((entry) => entry.id === memberId);
}

/**
 * Stage 1: remove Authentik Mitglieder group only — no EasyVerein write.
 * Also stamps `attributes.membershipRevokedAt` for later grace-period checks.
 */
export async function revokeMitgliederGroup(
	memberId: string,
	options?: MutationActor,
): Promise<RevokeMitgliederResult> {
	const id = memberId.trim();
	if (!id) return { success: false, error: "invalid_id" };
	if (isSelfTarget(id, options?.actorSub)) {
		return { success: false, error: "not_eligible" };
	}

	const allowed = await assertOffboardingMutationAllowed(id, "revoke");
	if (!allowed) return { success: false, error: "not_eligible" };

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const ok = mockRevokeMitgliederMembership(id);
			if (!ok) return { success: false, error: "user_not_found" };
			return { success: true, name: id };
		}
		return { success: false, error: "authentik_api_missing" };
	}

	try {
		const user = await resolveUser(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const groupId = await resolveMitgliederGroupId();
		if (!groupId) {
			return { success: false, error: "mitglieder_group_missing" };
		}

		await authentikFetch(`/api/v3/core/groups/${groupId}/remove_user/`, {
			method: "POST",
			headers: authHeaders(true),
			body: JSON.stringify({ pk: user.pk }),
			responseType: "none",
		});

		const current = await authentikFetch<AuthentikUser>(
			`/api/v3/core/users/${user.pk}/`,
			{ headers: authHeaders() },
		);

		await authentikFetch(`/api/v3/core/users/${user.pk}/`, {
			method: "PATCH",
			headers: authHeaders(true),
			body: JSON.stringify({
				attributes: {
					...(current.attributes ?? {}),
					[MEMBERSHIP_REVOKED_AT_ATTR]: new Date().toISOString(),
				},
			}),
		});

		invalidateDirectoryCache();
		return {
			success: true,
			name: current.name?.trim() || user.name?.trim() || id,
		};
	} catch (err) {
		console.error("[offboarding] revoke mitglieder failed", err);
		return { success: false, error: "revoke_failed" };
	}
}

/**
 * Stage 2: permanently delete the Authentik user account.
 * Only accounts already in the delete stage (`membershipRevokedAt` set).
 * No EasyVerein write.
 */
export async function deleteAuthentikAccount(
	memberId: string,
	options?: MutationActor,
): Promise<DeleteAccountResult> {
	const id = memberId.trim();
	if (!id) return { success: false, error: "invalid_id" };
	if (isSelfTarget(id, options?.actorSub)) {
		return { success: false, error: "not_eligible" };
	}

	const allowed = await assertOffboardingMutationAllowed(id, "delete");
	if (!allowed) return { success: false, error: "not_eligible" };

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const ok = mockDeleteAccount(id);
			if (!ok) return { success: false, error: "user_not_found" };
			return { success: true, name: id };
		}
		return { success: false, error: "authentik_api_missing" };
	}

	try {
		const user = await resolveUser(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const name = user.name?.trim() || id;

		await authentikFetch(`/api/v3/core/users/${user.pk}/`, {
			method: "DELETE",
			headers: authHeaders(),
			responseType: "none",
		});

		invalidateDirectoryCache();
		return { success: true, name };
	} catch (err) {
		console.error("[offboarding] delete account failed", err);
		return { success: false, error: "delete_failed" };
	}
}
