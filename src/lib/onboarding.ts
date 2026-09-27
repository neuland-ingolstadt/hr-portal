import type { MemberProfile } from "#/lib/members";

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

/** Manual human-onboarding ladder on Authentik `attributes.onboardingStage`. */
export const ONBOARDING_STAGE_MAX = 4 as const;

export type OnboardingStage = 0 | 1 | 2 | 3 | 4;

export const ONBOARDING_STAGES: readonly OnboardingStage[] = [
	0, 1, 2, 3, 4,
] as const;

/** i18n keys for stage labels (DE/EN in messages.ts). */
export const ONBOARDING_STAGE_LABEL_KEYS = {
	0: "onboarding.stage.new",
	1: "onboarding.stage.conversation",
	2: "onboarding.stage.project",
	3: "onboarding.stage.contributing",
	4: "onboarding.stage.done",
} as const;

export type OnboardingStageLabelKey =
	(typeof ONBOARDING_STAGE_LABEL_KEYS)[OnboardingStage];

/** Authentik attribute key for the human onboarding stage. */
export const ONBOARDING_STAGE_ATTR = "onboardingStage" as const;

/**
 * Parse / clamp an Authentik attribute value to 0–4.
 * Missing or invalid → 0 (new).
 */
export function parseOnboardingStage(value: unknown): OnboardingStage {
	let n: number | null = null;
	if (typeof value === "number" && Number.isFinite(value)) {
		n = Math.trunc(value);
	} else if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
		n = Number.parseInt(value.trim(), 10);
	}
	if (n == null || n < 0) return 0;
	if (n > ONBOARDING_STAGE_MAX) return ONBOARDING_STAGE_MAX;
	return n as OnboardingStage;
}

export function isOnboardingStage(value: unknown): value is OnboardingStage {
	return (
		typeof value === "number" &&
		Number.isInteger(value) &&
		value >= 0 &&
		value <= ONBOARDING_STAGE_MAX
	);
}

/** MVP: Mitglieder whose Authentik account was created recently. */
export type RecentOnboardingMember = {
	id: string;
	name: string;
	username: string | null;
	/** Authentik `date_joined` (ISO). */
	dateJoined: string;
	/** Human onboarding stage from Authentik `attributes.onboardingStage`. */
	onboardingStage: OnboardingStage;
};

export type RecentOnboardingMembersResult = {
	members: RecentOnboardingMember[];
	/** Lookback window in weeks. */
	weeks: number;
	source: "authentik" | "mock";
};

export type UpdateMemberOnboardingStageError =
	| "invalid_id"
	| "invalid_stage"
	| "user_not_found"
	| "authentik_api_missing"
	| "update_failed";

export type UpdateMemberOnboardingStageResult =
	| { success: true; profile: MemberProfile }
	| { success: false; error: UpdateMemberOnboardingStageError };

/** Default onboarding MVP lookback. */
export const RECENT_ONBOARDING_WEEKS = 8;
