/**
 * Authentik directory / members facade.
 * Implementation lives in `#/lib/authentik-members/*` - keep this barrel for stable imports.
 */

export {
	listMembersFromAuthentik,
	listNonMitgliederAccountsFromAuthentik,
	warmActiveDirectoryForOffboarding,
} from "#/lib/authentik-members/directory.server";
export { invalidateDirectoryCache } from "#/lib/authentik-members/invalidation.server";
export {
	mockDeleteAccount,
	mockRevokeMitgliederMembership,
	mockUpdateMemberAssignableGroups,
	mockUpdateMemberOnboardingContact,
	mockUpdateMemberOnboardingStage,
} from "#/lib/authentik-members/mock.server";
export type { OnboardingContactRecipient } from "#/lib/authentik-members/onboarding.server";
export {
	listOnboardingContactsFromAuthentik,
	listRecentOnboardingMembersFromAuthentik,
	resolveOnboardingContactRecipient,
	resolveViewerContactIds,
	updateMemberOnboardingContact,
	updateMemberOnboardingStage,
} from "#/lib/authentik-members/onboarding.server";
export { getMemberProfileByUuid } from "#/lib/authentik-members/profile.server";
export { getDirectoryStatsFromAuthentik } from "#/lib/authentik-members/stats.server";
