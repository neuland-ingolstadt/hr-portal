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
 * Authentik attribute key for the HR/staff onboarding contact (Betreuung).
 * Value is the contact's Authentik user UUID (OIDC `uuid` claim / user.uuid).
 */
export const ONBOARDING_CONTACT_ATTR = "onboardingContact" as const;

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

/** Staff person as point of contact for a Mitglied's onboarding (Betreuung). */
export type OnboardingContactRef = {
	/** Authentik user UUID (OIDC `uuid` claim). */
	id: string;
	name: string;
	username: string | null;
};

/**
 * Parse Authentik contact id (UUID string).
 * Missing / blank → null.
 */
export function parseOnboardingContactId(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const id = value.trim();
	return id.length > 0 ? id : null;
}

/** Match contact id against the viewer's Authentik UUID(s). */
export function contactIdMatchesAnyViewer(
	contactId: string | null | undefined,
	viewerContactIds: readonly string[],
): boolean {
	if (!contactId || viewerContactIds.length === 0) return false;
	const needle = contactId.trim().toLowerCase();
	return viewerContactIds.some((id) => id.trim().toLowerCase() === needle);
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
	/** Contact Authentik UUID from `attributes.onboardingContact`. */
	onboardingContactId: string | null;
	/** Display name when resolved (e.g. after assign). */
	onboardingContactName: string | null;
	/** True when `onboardingContactId` matches the current session user. */
	onboardingContactIsMe?: boolean;
};

export type RecentOnboardingMembersResult = {
	members: RecentOnboardingMember[];
	/** Lookback window in weeks. */
	weeks: number;
	source: "authentik" | "mock";
	/** Current viewer's Authentik user UUID(s) for the “mine” filter. */
	viewerContactIds: string[];
};

export type OnboardingContactsResult = {
	contacts: OnboardingContactRef[];
	source: "authentik" | "mock";
	/** Authentik UUID to store for “assign to me”. */
	myContactId: string | null;
	/** Same as `RecentOnboardingMembersResult.viewerContactIds`. */
	viewerContactIds: string[];
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

export type UpdateMemberOnboardingContactError =
	| "invalid_id"
	| "invalid_contact"
	| "user_not_found"
	| "authentik_api_missing"
	| "update_failed";

export type UpdateMemberOnboardingContactResult =
	| {
			success: true;
			profile: MemberProfile;
			/**
			 * Mentor notify attempt: `true` sent, `false` failed/skipped,
			 * `null` not attempted (self-assign or clear).
			 */
			notifyEmailSent: boolean | null;
	  }
	| { success: false; error: UpdateMemberOnboardingContactError };

/** First token of a display name — privacy-minimal mentee label in mail. */
export function firstNameFromDisplayName(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "Mitglied";
	return trimmed.split(/\s+/)[0] ?? trimmed;
}

/** Default onboarding MVP lookback. */
export const RECENT_ONBOARDING_WEEKS = 12;
