import type { CreateMemberError } from "#/lib/onboarding";

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

export type AcceptApplicationInput = {
	memberId: number;
};

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
	  }
	| {
			success: false;
			error: AcceptApplicationError;
			/** Set when Authentik succeeded but EasyVerein accept failed. */
			username?: string;
			emailSent?: boolean;
			easyVereinAccepted?: boolean;
	  };
