import {
	type AuthentikUser,
	authentikAuthHeaders,
	authentikFetch,
	isAuthentikApiConfigured,
	resolveAuthentikGroupIdByName,
	resolveAuthentikUserByUuidOrPk,
} from "#/lib/authentik-api.server";
import {
	invalidateDirectoryCache,
	listNonMitgliederAccountsFromAuthentik,
	mockDeleteAccount,
	mockRevokeMitgliederMembership,
} from "#/lib/authentik-members.server";
import { serverConfig } from "#/lib/config";
import type {
	DeleteAccountResult,
	RevokeMitgliederResult,
} from "#/lib/offboarding";
import {
	isOffboardingLeavingWatchlist,
	MEMBERSHIP_REVOKED_AT_ATTR,
	partitionOffboardingStages,
} from "#/lib/offboarding";

type MutationActor = {
	/** Session `sub` — block self-revoke / self-delete. */
	actorSub?: string;
};

async function resolveMitgliederGroupId(): Promise<string | null> {
	const name = serverConfig.groups.mitglieder.trim();
	if (!name) return null;
	return resolveAuthentikGroupIdByName(name);
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
		const user = await resolveAuthentikUserByUuidOrPk(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const groupId = await resolveMitgliederGroupId();
		if (!groupId) {
			return { success: false, error: "mitglieder_group_missing" };
		}

		await authentikFetch(`/api/v3/core/groups/${groupId}/remove_user/`, {
			method: "POST",
			headers: authentikAuthHeaders(true),
			body: JSON.stringify({ pk: user.pk }),
			responseType: "none",
		});

		const current = await authentikFetch<AuthentikUser>(
			`/api/v3/core/users/${user.pk}/`,
			{ headers: authentikAuthHeaders() },
		);

		await authentikFetch(`/api/v3/core/users/${user.pk}/`, {
			method: "PATCH",
			headers: authentikAuthHeaders(true),
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
		const user = await resolveAuthentikUserByUuidOrPk(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const name = user.name?.trim() || id;

		await authentikFetch(`/api/v3/core/users/${user.pk}/`, {
			method: "DELETE",
			headers: authentikAuthHeaders(),
			responseType: "none",
		});

		invalidateDirectoryCache();
		return { success: true, name };
	} catch (err) {
		console.error("[offboarding] delete account failed", err);
		return { success: false, error: "delete_failed" };
	}
}
