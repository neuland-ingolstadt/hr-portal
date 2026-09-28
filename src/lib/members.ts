/** Client-safe member types (no email or other PII in list payloads). */

import type { OnboardingContactRef, OnboardingStage } from "#/lib/onboarding";

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

export type DirectoryStats = {
	memberCount: number;
	/** Mitglieder assigned to at least one ressort group. */
	ressortMemberCount: number;
	/** Recent Mitglieder still below onboarding stage “done”. */
	onboardingMemberCount: number;
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
	/**
	 * HR/staff point of contact (Betreuung) from Authentik
	 * `attributes.onboardingContact` (Authentik user UUID). `null` when unset.
	 */
	onboardingContact: OnboardingContactRef | null;
	/**
	 * Deep link into Authentik admin user detail (`/if/admin/#/identity/users/{pk}`).
	 * `null` when PK or API base URL is unavailable (e.g. mock).
	 */
	authentikAdminUrl: string | null;
	/**
	 * Same admin user UI, Groups tab
	 * (`…/users/{pk};{"page":"page-groups"}`).
	 */
	authentikAdminGroupsUrl: string | null;
	source: "authentik" | "mock";
};

export type MemberProfileResult =
	| { status: "found"; profile: MemberProfile }
	| { status: "not_found"; source: "authentik" | "mock" }
	| { status: "error"; error: "authentik_api_missing" | "lookup_failed" };
