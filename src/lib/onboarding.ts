export type NewMemberInput = {
	firstName: string;
	lastName: string;
	email: string;
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
