/** Client-safe types for member group assignment. */

export type UpdateMemberGroupsError =
	| "invalid_id"
	| "invalid_groups"
	| "protected_group"
	| "user_not_found"
	| "group_not_found"
	| "authentik_api_missing"
	| "update_failed";
