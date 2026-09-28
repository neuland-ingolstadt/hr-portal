/** Client-safe offboarding types and helpers. */

import type { Member } from "#/lib/members";

/** Authentik user attribute stamped when Mitglieder is revoked (stage 1). */
export const MEMBERSHIP_REVOKED_AT_ATTR = "membershipRevokedAt" as const;

/**
 * Why a directory account appears on the offboarding list.
 */
export type OffboardingReason =
	| "membership_revoked"
	| "not_in_easyverein"
	| "left_easyverein";

export const OFFBOARDING_REASONS: OffboardingReason[] = [
	"membership_revoked",
	"not_in_easyverein",
	"left_easyverein",
];

export type OffboardingCandidate = Member & {
	reasons: OffboardingReason[];
	/**
	 * EasyVerein `resignation_date` (YYYY-MM-DD) when known for leave/leaving.
	 */
	easyVereinResignationDate?: string | null;
};

export type OffboardingCandidatesResult = {
	members: OffboardingCandidate[];
	availableGroups: string[];
	source: "authentik" | "mock";
	/** True when EV reconciliation ran (false if EV API missing). */
	easyVereinReconciled?: boolean;
	/** Days after revoke before process may auto-delete. */
	deleteGraceDays?: number;
};

/**
 * Stage 1: revoke Mitglieder (missing EV link, or EV leave/missing).
 * Stage 2: has `membershipRevokedAt` → delete Authentik account.
 */
export function partitionOffboardingStages(
	candidates: OffboardingCandidate[],
): {
	revokeMembership: OffboardingCandidate[];
	deleteAccount: OffboardingCandidate[];
} {
	const revokeMembership: OffboardingCandidate[] = [];
	const deleteAccount: OffboardingCandidate[] = [];

	for (const candidate of candidates) {
		if (candidate.reasons.includes("membership_revoked")) {
			deleteAccount.push(candidate);
		} else if (
			candidate.reasons.includes("not_in_easyverein") ||
			candidate.reasons.includes("left_easyverein")
		) {
			revokeMembership.push(candidate);
		}
	}

	return { revokeMembership, deleteAccount };
}

export type RevokeMitgliederError =
	| "invalid_id"
	| "not_eligible"
	| "authentik_api_missing"
	| "user_not_found"
	| "mitglieder_group_missing"
	| "revoke_failed";

export type RevokeMitgliederResult =
	| { success: true; name: string }
	| { success: false; error: RevokeMitgliederError };

export type DeleteAccountError =
	| "invalid_id"
	| "not_eligible"
	| "authentik_api_missing"
	| "user_not_found"
	| "delete_failed";

export type DeleteAccountResult =
	| { success: true; name: string }
	| { success: false; error: DeleteAccountError };

/** Offboarding pipeline stage. */
export type OffboardingStage = "revoke_membership" | "delete_account";

export type OffboardingProcessProgress = {
	phase: "revoke" | "delete" | "done";
	currentName: string | null;
	done: number;
	total: number;
	revoked: number;
	revokeTotal: number;
	deleted: number;
	deleteTotal: number;
	errors: number;
	skippedLeaving: number;
};

/** Local calendar days since `membershipRevokedAt` (not elapsed 24h blocks). */
export function daysSinceMembershipRevoked(
	iso: string | null | undefined,
	now = new Date(),
): number | null {
	if (!iso) return null;
	const at = new Date(iso);
	if (Number.isNaN(at.getTime())) return null;
	const startOfToday = Date.UTC(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
	);
	const startOfRevokeDay = Date.UTC(
		at.getFullYear(),
		at.getMonth(),
		at.getDate(),
	);
	return Math.max(
		0,
		Math.floor((startOfToday - startOfRevokeDay) / 86_400_000),
	);
}

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

/**
 * Future EasyVerein resignation → watchlist only (do not auto-revoke yet).
 */
export function isOffboardingLeavingWatchlist(
	resignationDate: string | null | undefined,
	today = todayIsoDate(),
): boolean {
	if (!resignationDate) return false;
	return resignationDate.localeCompare(today) > 0;
}

/** Stage 2: past grace after membershipRevokedAt. */
export function isPastOffboardingDeleteGrace(
	membershipRevokedAt: string | null | undefined,
	graceDays: number,
): boolean {
	const days = daysSinceMembershipRevoked(membershipRevokedAt);
	if (days == null) return false;
	return days >= graceDays;
}

export type OffboardingProcessPlan = {
	toRevoke: { id: string; name: string }[];
	toDelete: { id: string; name: string }[];
	skippedLeaving: number;
	/** Stage-2 accounts still inside the delete grace window. */
	waitingGrace: number;
};

/** Who the “Prozess starten” button will touch (client-side plan). */
export function planOffboardingProcess(
	revokeMembership: {
		id: string;
		name: string;
		easyVereinResignationDate?: string | null;
	}[],
	deleteAccount: {
		id: string;
		name: string;
		membershipRevokedAt?: string | null;
	}[],
	graceDays: number,
): OffboardingProcessPlan {
	const toRevoke: OffboardingProcessPlan["toRevoke"] = [];
	let skippedLeaving = 0;

	for (const candidate of revokeMembership) {
		if (isOffboardingLeavingWatchlist(candidate.easyVereinResignationDate)) {
			skippedLeaving += 1;
			continue;
		}
		toRevoke.push({ id: candidate.id, name: candidate.name });
	}

	const toDelete: OffboardingProcessPlan["toDelete"] = [];
	let waitingGrace = 0;
	for (const candidate of deleteAccount) {
		if (
			isPastOffboardingDeleteGrace(candidate.membershipRevokedAt, graceDays)
		) {
			toDelete.push({ id: candidate.id, name: candidate.name });
		} else {
			waitingGrace += 1;
		}
	}

	return { toRevoke, toDelete, skippedLeaving, waitingGrace };
}
