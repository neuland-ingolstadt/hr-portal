import {
	type AuthentikUser,
	authentikAuthHeaders,
	authentikFetch,
	authentikGroupKey,
	isAuthentikApiConfigured,
	resolveAuthentikGroupIdByName,
	resolveAuthentikUserByUuidOrPk,
} from "#/lib/authentik-api.server";
import {
	easyVereinMemberIdFromAttributes,
	membershipRevokedAtFromAttributes,
} from "#/lib/authentik-members/shared.server";
import {
	invalidateDirectoryCache,
	listNonMitgliederAccountsFromAuthentik,
	mockDeleteAccount,
	mockRevokeMitgliederMembership,
} from "#/lib/authentik-members.server";
import { serverConfig } from "#/lib/config";
import {
	classifyEasyVereinMemberStatus,
	getEasyVereinMembershipSnapshot,
	isEasyVereinConfigured,
} from "#/lib/easyverein.server";
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
	/** Session `sub` - block self-revoke / self-delete. */
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

/** Match Mitglieder group id against Authentik `user.groups` (UUIDs or objects). */
function userHasGroupId(user: AuthentikUser, groupId: string): boolean {
	const expected = groupId.trim();
	if (!expected) return false;

	for (const entry of user.groups ?? []) {
		if (typeof entry === "string") {
			if (entry === expected) return true;
			continue;
		}
		if (!entry || typeof entry !== "object") continue;
		const key = authentikGroupKey(entry);
		if (key === expected) return true;
		if (entry.pk != null && String(entry.pk) === expected) return true;
	}
	return false;
}

/**
 * AUTH_MOCK: cheap in-memory candidate check (same partition as the UI list).
 */
async function assertMockOffboardingMutationAllowed(
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
 * Stage-2 gate without a full directory dump: user must already have
 * `attributes.membershipRevokedAt` (same rule as the delete-stage list).
 */
function isDeleteEligibleUser(user: AuthentikUser): boolean {
	return membershipRevokedAtFromAttributes(user.attributes) != null;
}

/**
 * Stage-1 gate without a full directory dump: Mitglieder, not yet revoked,
 * and EasyVerein says leave/missing (or no EV link). Watchlist / active stay out.
 */
async function isRevokeEligibleUser(
	user: AuthentikUser,
	mitgliederGroupId: string,
): Promise<boolean> {
	if (membershipRevokedAtFromAttributes(user.attributes)) return false;
	if (!userHasGroupId(user, mitgliederGroupId)) return false;

	const easyVereinId = easyVereinMemberIdFromAttributes(user.attributes);
	if (easyVereinId == null) return true;

	if (!isEasyVereinConfigured()) return false;

	try {
		const snapshot = await getEasyVereinMembershipSnapshot();
		const status = classifyEasyVereinMemberStatus(easyVereinId, snapshot);
		if (status.state === "active" || status.state === "leaving") return false;
		return true;
	} catch (err) {
		console.error("[offboarding] revoke eligibility EV check failed", err);
		return false;
	}
}

/**
 * Stage 1: remove Authentik Mitglieder group only - no EasyVerein write.
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

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const allowed = await assertMockOffboardingMutationAllowed(id, "revoke");
			if (!allowed) return { success: false, error: "not_eligible" };
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

		const allowed = await isRevokeEligibleUser(user, groupId);
		if (!allowed) return { success: false, error: "not_eligible" };

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
 * Only accounts with `membershipRevokedAt` set (same as the delete-stage list).
 * No EasyVerein write. Does not reload the full directory for eligibility.
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

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const allowed = await assertMockOffboardingMutationAllowed(id, "delete");
			if (!allowed) return { success: false, error: "not_eligible" };
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

		if (!isDeleteEligibleUser(user)) {
			return { success: false, error: "not_eligible" };
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
