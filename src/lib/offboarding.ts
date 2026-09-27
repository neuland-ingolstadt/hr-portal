/** Client-safe offboarding action types. */

/** Authentik user attribute stamped when Mitglieder is revoked (stage 1). */
export const MEMBERSHIP_REVOKED_AT_ATTR = "membershipRevokedAt" as const;

export type RevokeMitgliederError =
	| "unauthorized"
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
	| "unauthorized"
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

export type ProcessOffboardingResult = {
	revoked: number;
	deleted: number;
	skippedLeaving: number;
	errors: number;
	graceDays: number;
};

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

/** Whole days since `membershipRevokedAt`. */
export function daysSinceMembershipRevoked(
	iso: string | null | undefined,
): number | null {
	if (!iso) return null;
	const at = Date.parse(iso);
	if (Number.isNaN(at)) return null;
	return Math.max(0, Math.floor((Date.now() - at) / 86_400_000));
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

	const toDelete = deleteAccount
		.filter((candidate) =>
			isPastOffboardingDeleteGrace(candidate.membershipRevokedAt, graceDays),
		)
		.map((candidate) => ({ id: candidate.id, name: candidate.name }));

	return { toRevoke, toDelete, skippedLeaving };
}
