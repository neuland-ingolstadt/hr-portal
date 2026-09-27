export type NewMemberInput = {
	firstName: string;
	lastName: string;
	email: string;
	/** EasyVerein member pk — stored on Authentik `attributes.easyVereinMemberId`. */
	easyVereinMemberId?: number;
};

export type CreateMemberResult =
	| { success: true; username: string; emailSent: boolean }
	| { success: false; error: CreateMemberError };

export type CreateMemberError =
	| "unauthorized"
	| "invalid_input"
	| "authentik_api_missing"
	| "username_exists"
	| "create_failed";

/** MVP: Mitglieder whose Authentik account was created recently. */
export type RecentOnboardingMember = {
	id: string;
	name: string;
	username: string | null;
	/** Authentik `date_joined` (ISO). */
	dateJoined: string;
};

export type RecentOnboardingMembersResult = {
	members: RecentOnboardingMember[];
	/** Lookback window in weeks. */
	weeks: number;
	source: "authentik" | "mock";
};

/** Default onboarding MVP lookback. */
export const RECENT_ONBOARDING_WEEKS = 8;