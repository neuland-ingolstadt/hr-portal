/** Client-safe member types (no email or other PII in list payloads). */

import type { OnboardingStage } from "#/lib/onboarding";

export type Member = {
	id: string;
	name: string;
	groups: string[];
	/**
	 * EasyVerein member pk from Authentik `attributes.easyVereinMemberId`.
	 * `null` = known missing; `undefined` = not loaded (e.g. mitglieder-only list).
	 */
	easyVereinMemberId?: number | null;
	/**
	 * ISO timestamp from Authentik `attributes.membershipRevokedAt`
	 * (set when Mitglieder is removed in offboarding stage 1).
	 * `null` = known missing; `undefined` = not loaded.
	 */
	membershipRevokedAt?: string | null;
};

export type MembersResult = {
	members: Member[];
	/** Distinct group names across the result set (for filters). */
	availableGroups: string[];
	source: "authentik" | "mock";
};

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

export type DirectoryStats = {
	memberCount: number;
	groupCount: number;
	source: "authentik" | "mock";
};

/**
 * Detail profile for the member side sheet.
 * `email` is only populated for Vorstand/Admin callers (server-enforced).
 */
export type MemberProfile = {
	id: string;
	name: string;
	username: string | null;
	email: string | null;
	groups: string[];
	githubConnected: boolean;
	discordConnected: boolean;
	/**
	 * Human onboarding stage from Authentik `attributes.onboardingStage`
	 * (0 = new … 4 = done).
	 */
	onboardingStage: OnboardingStage;
	source: "authentik" | "mock";
};

export type MemberProfileResult =
	| { status: "found"; profile: MemberProfile }
	| { status: "not_found"; source: "authentik" | "mock" }
	| { status: "error"; error: "authentik_api_missing" | "lookup_failed" };
