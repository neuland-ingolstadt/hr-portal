/** Client-safe member types (no email or other PII in list payloads). */

export type Member = {
	id: string;
	name: string;
	groups: string[];
};

export type MembersResult = {
	members: Member[];
	/** Distinct group names across the result set (for filters). */
	availableGroups: string[];
	source: "authentik" | "mock";
};

/**
 * Why a directory account appears on the offboarding list.
 * Add new codes here as more checks land (e.g. EasyVerein).
 */
export type OffboardingReason =
	| "missing_mitglieder"
	| "not_in_easyverein";

export type OffboardingCandidate = Member & {
	reasons: OffboardingReason[];
};

export type OffboardingCandidatesResult = {
	members: OffboardingCandidate[];
	availableGroups: string[];
	source: "authentik" | "mock";
};

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
	source: "authentik" | "mock";
};

export type MemberProfileResult =
	| { status: "found"; profile: MemberProfile }
	| { status: "not_found"; source: "authentik" | "mock" }
	| { status: "error"; error: "authentik_api_missing" | "lookup_failed" };
