/** Client-safe member types (no email or other PII). */

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

export type DirectoryStats = {
	memberCount: number;
	groupCount: number;
	source: "authentik" | "mock";
};
