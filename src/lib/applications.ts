import type { CreateMemberError, CreateMemberStage } from "#/lib/onboarding";

export type AcceptApplicationStage = CreateMemberStage | "easyverein_accept";

export type PendingApplication = {
	id: number;
	firstName: string;
	lastName: string;
	email: string;
	displayName: string;
	applicationDate: string | null;
};

export type ApplicationsResult = {
	applications: PendingApplication[];
};

/** Dashboard badge - no application payloads. */
export type PendingApplicationCountResult = {
	count: number | null;
	source: "easyverein" | "unavailable";
};

export type AcceptApplicationInput = {
	memberId: number;
};

export type SepaMandateStatus =
	| "set"
	| "already_set"
	| "skipped_no_iban"
	| "skipped_no_contact"
	| "failed"
	| null;

export type AcceptApplicationError =
	| CreateMemberError
	| "easyverein_api_missing"
	| "easyverein_not_found"
	| "easyverein_not_pending"
	| "easyverein_accept_failed";

export type AcceptApplicationResult =
	| {
			success: true;
			username: string;
			emailSent: boolean;
			easyVereinAccepted: true;
			sepaMandate: SepaMandateStatus;
	  }
	| {
			success: false;
			error: AcceptApplicationError;
			/** Set when Authentik succeeded but EasyVerein accept failed. */
			username?: string;
			emailSent?: boolean;
			easyVereinAccepted?: boolean;
			sepaMandate?: SepaMandateStatus;
			/** Where the flow stopped (logs / failed-accept audit). */
			stage?: AcceptApplicationStage;
	  };

/** Soft-delete pending EV application (wastebasket). Reason is audit-only. */
export type DeclineApplicationInput = {
	memberId: number;
	reason: string;
};

export type DeclineApplicationError =
	| "invalid_input"
	| "easyverein_api_missing"
	| "easyverein_not_found"
	| "easyverein_not_pending"
	| "easyverein_decline_failed";

export type DeclineApplicationResult =
	| { success: true; reason: string; displayName: string }
	| { success: false; error: DeclineApplicationError };

/** UI step index for the accept progress list (0 account … 3 SEPA). */
export function acceptStageToStepIndex(
	stage: AcceptApplicationStage | undefined,
): number {
	switch (stage) {
		case "lookup":
		case "create_user":
		case "set_password":
			return 0;
		case "email":
			return 1;
		case "easyverein_accept":
			return 2;
		default:
			return 0;
	}
}

export const DECLINE_REASON_MIN_LENGTH = 3;
export const DECLINE_REASON_MAX_LENGTH = 500;

export function normalizeDeclineReason(raw: unknown): string | null {
	if (typeof raw !== "string") return null;
	const reason = raw.trim().replace(/\s+/g, " ");
	if (
		reason.length < DECLINE_REASON_MIN_LENGTH ||
		reason.length > DECLINE_REASON_MAX_LENGTH
	) {
		return null;
	}
	return reason;
}
