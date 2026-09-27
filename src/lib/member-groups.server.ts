import {
	getMemberProfileByUuid,
	invalidateDirectoryCache,
	mockUpdateMemberAssignableGroups,
} from "#/lib/authentik-members.server";
import { serverConfig } from "#/lib/config";
import {
	canonicalizeAssignableGroup,
	filterCurrentAssignable,
	groupsEqualIgnoreOrder,
	isProtectedGroupName,
} from "#/lib/groups.server";
import type { UpdateMemberGroupsError } from "#/lib/member-groups";
import type { MemberProfile } from "#/lib/members";

export type { UpdateMemberGroupsError };

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
};

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type UpdateMemberGroupsResult =
	| { success: true; profile: MemberProfile }
	| { success: false; error: UpdateMemberGroupsError };

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

async function resolveGroupIdByName(name: string): Promise<string | null> {
	const expected = name.trim().toLowerCase();
	if (!expected) return null;

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

function parseDesiredAssignable(
	groups: string[],
):
	| { ok: true; desired: string[] }
	| { ok: false; error: "invalid_groups" | "protected_group" } {
	if (!Array.isArray(groups)) {
		return { ok: false, error: "invalid_groups" };
	}

	const desired = new Set<string>();
	for (const raw of groups) {
		if (typeof raw !== "string") {
			return { ok: false, error: "invalid_groups" };
		}
		const trimmed = raw.trim();
		if (!trimmed) continue;

		if (isProtectedGroupName(trimmed)) {
			return { ok: false, error: "protected_group" };
		}

		const canonical = canonicalizeAssignableGroup(trimmed);
		if (!canonical) {
			return { ok: false, error: "invalid_groups" };
		}
		desired.add(canonical);
	}

	return { ok: true, desired: [...desired] };
}

async function setGroupMembership(
	groupId: string,
	userPk: number,
	action: "add" | "remove",
): Promise<void> {
	const endpoint = action === "add" ? "add_user" : "remove_user";
	await authentikFetch(`/api/v3/core/groups/${groupId}/${endpoint}/`, {
		method: "POST",
		headers: authHeaders(true),
		body: JSON.stringify({ pk: userPk }),
		responseType: "none",
	});
}

/**
 * Replace assignable Authentik groups (ressorts) for a member.
 * Protected groups (HR, Vorstand, Admin, Ehrenmitglied, technical-users, mitglieder)
 * are never touched.
 */
export async function updateMemberAssignableGroups(
	memberId: string,
	groups: string[],
	options: { includeEmail: boolean },
): Promise<UpdateMemberGroupsResult> {
	const id = memberId.trim();
	if (!id) return { success: false, error: "invalid_id" };

	const parsed = parseDesiredAssignable(groups);
	if (!parsed.ok) return { success: false, error: parsed.error };

	const desired = parsed.desired;

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const ok = mockUpdateMemberAssignableGroups(id, desired);
			if (!ok) return { success: false, error: "user_not_found" };
			const profileResult = await getMemberProfileByUuid(id, {
				includeEmail: options.includeEmail,
			});
			if (profileResult.status !== "found") {
				return { success: false, error: "user_not_found" };
			}
			return { success: true, profile: profileResult.profile };
		}
		return { success: false, error: "authentik_api_missing" };
	}

	try {
		const user = await resolveUser(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const currentProfile = await getMemberProfileByUuid(id, {
			includeEmail: options.includeEmail,
		});
		if (currentProfile.status !== "found") {
			return {
				success: false,
				error:
					currentProfile.status === "not_found"
						? "user_not_found"
						: "update_failed",
			};
		}

		const currentAssignable = filterCurrentAssignable(
			currentProfile.profile.groups,
		);

		if (groupsEqualIgnoreOrder(currentAssignable, desired)) {
			return { success: true, profile: currentProfile.profile };
		}

		const currentSet = new Set(
			currentAssignable.map((group) => group.toLowerCase()),
		);
		const desiredSet = new Set(desired.map((group) => group.toLowerCase()));

		const toAdd = desired.filter(
			(group) => !currentSet.has(group.toLowerCase()),
		);
		const toRemove = currentAssignable.filter(
			(group) => !desiredSet.has(group.toLowerCase()),
		);

		for (const groupName of toRemove) {
			if (isProtectedGroupName(groupName)) {
				return { success: false, error: "protected_group" };
			}
			const groupId = await resolveGroupIdByName(groupName);
			if (!groupId) {
				return { success: false, error: "group_not_found" };
			}
			await setGroupMembership(groupId, user.pk, "remove");
		}

		for (const groupName of toAdd) {
			if (isProtectedGroupName(groupName)) {
				return { success: false, error: "protected_group" };
			}
			const groupId = await resolveGroupIdByName(groupName);
			if (!groupId) {
				return { success: false, error: "group_not_found" };
			}
			await setGroupMembership(groupId, user.pk, "add");
		}

		invalidateDirectoryCache();

		const refreshed = await getMemberProfileByUuid(id, {
			includeEmail: options.includeEmail,
		});
		if (refreshed.status !== "found") {
			return { success: false, error: "update_failed" };
		}
		return { success: true, profile: refreshed.profile };
	} catch (err) {
		console.error("[members] update assignable groups failed", err);
		return { success: false, error: "update_failed" };
	}
}
