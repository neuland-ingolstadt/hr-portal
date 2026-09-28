import { invalidateDirectoryCache } from "#/lib/authentik-members/invalidation.server";
import {
	daysAgoIso,
	RESSORT_KEYS,
} from "#/lib/authentik-members/shared.server";
import { serverConfig } from "#/lib/config";
import type { Member, MemberProfile } from "#/lib/members";
import type { OnboardingContactRef, OnboardingStage } from "#/lib/onboarding";

export const MOCK_MEMBERS: Member[] = [
	{
		id: "mock-1",
		name: "Alex Berger",
		groups: ["HR", "Mitglieder", "management"],
		easyVereinMemberId: 1001,
		membershipRevokedAt: null,
	},
	{
		id: "mock-2",
		name: "Sam Kovacs",
		groups: ["Vorstand", "Mitglieder", "engineering"],
		easyVereinMemberId: null,
		membershipRevokedAt: null,
	},
	{
		id: "mock-3",
		name: "Jordan Weiss",
		groups: ["Mitglieder", "events"],
		easyVereinMemberId: 1003,
		membershipRevokedAt: null,
	},
	{
		id: "mock-4",
		name: "Riley Hartmann",
		groups: ["HR", "design-marketing"],
		easyVereinMemberId: null,
		membershipRevokedAt: daysAgoIso(5),
	},
	{
		id: "mock-5",
		name: "Casey Vogel",
		groups: ["Mitglieder", "events", "engineering"],
		easyVereinMemberId: null,
		membershipRevokedAt: null,
	},
	{
		id: "mock-6",
		name: "Taylor Neumann",
		groups: ["design-marketing"],
		easyVereinMemberId: null,
		membershipRevokedAt: null,
	},
];

/** Soft-deleted from mock directory after stage-2 delete. */
export const mockDeletedIds = new Set<string>();

export function activeMockMembers(): Member[] {
	return MOCK_MEMBERS.filter((member) => !mockDeletedIds.has(member.id));
}

export const MOCK_PROFILES: Record<
	string,
	Omit<MemberProfile, "email"> & { email: string }
> = {
	"mock-1": {
		id: "mock-1",
		name: "Alex Berger",
		username: "aberger",
		email: "alex.berger@neuland.local",
		groups: ["HR", "Mitglieder", "management"],
		githubConnected: true,
		discordConnected: true,
		onboardingStage: 4,
		onboardingContact: null,
		authentikAdminUrl: null,
		authentikAdminGroupsUrl: null,
		source: "mock",
	},
	"mock-2": {
		id: "mock-2",
		name: "Sam Kovacs",
		username: "skovacs",
		email: "sam.kovacs@neuland.local",
		groups: ["Vorstand", "Mitglieder", "engineering"],
		githubConnected: true,
		discordConnected: false,
		onboardingStage: 2,
		onboardingContact: {
			id: "mock-hr",
			name: "Mock HR",
			username: "hr",
		},
		authentikAdminUrl: null,
		authentikAdminGroupsUrl: null,
		source: "mock",
	},
	"mock-3": {
		id: "mock-3",
		name: "Jordan Weiss",
		username: "jweiss",
		email: "jordan.weiss@neuland.local",
		groups: ["Mitglieder", "events"],
		githubConnected: false,
		discordConnected: true,
		onboardingStage: 1,
		onboardingContact: {
			id: "mock-1",
			name: "Alex Berger",
			username: "aberger",
		},
		authentikAdminUrl: null,
		authentikAdminGroupsUrl: null,
		source: "mock",
	},
	"mock-4": {
		id: "mock-4",
		name: "Riley Hartmann",
		username: "rhartmann",
		email: "riley.hartmann@neuland.local",
		groups: ["HR", "design-marketing"],
		githubConnected: false,
		discordConnected: false,
		onboardingStage: 0,
		onboardingContact: null,
		authentikAdminUrl: null,
		authentikAdminGroupsUrl: null,
		source: "mock",
	},
	"mock-5": {
		id: "mock-5",
		name: "Casey Vogel",
		username: "cvogel",
		email: "casey.vogel@neuland.local",
		groups: ["Mitglieder", "events", "engineering"],
		githubConnected: true,
		discordConnected: true,
		onboardingStage: 3,
		onboardingContact: null,
		authentikAdminUrl: null,
		authentikAdminGroupsUrl: null,
		source: "mock",
	},
};

/**
 * AUTH_MOCK helper: strip Mitglieder group so the account moves to stage 2.
 */
export function mockRevokeMitgliederMembership(memberId: string): boolean {
	const member = MOCK_MEMBERS.find((entry) => entry.id === memberId);
	if (!member) return false;
	const expected =
		serverConfig.groups.mitglieder.trim().toLowerCase() || "mitglieder";
	member.groups = member.groups.filter(
		(group) => group.trim().toLowerCase() !== expected,
	);
	member.membershipRevokedAt = new Date().toISOString();
	invalidateDirectoryCache();
	return true;
}

/**
 * AUTH_MOCK helper: permanently remove account from mock directory.
 */
export function mockDeleteAccount(memberId: string): boolean {
	if (!MOCK_MEMBERS.some((entry) => entry.id === memberId)) return false;
	mockDeletedIds.add(memberId);
	invalidateDirectoryCache();
	return true;
}

/**
 * AUTH_MOCK helper: set human onboarding stage on mock profile.
 */
export function mockUpdateMemberOnboardingStage(
	memberId: string,
	stage: OnboardingStage,
): boolean {
	const profile = MOCK_PROFILES[memberId];
	if (!profile) return false;
	profile.onboardingStage = stage;
	return true;
}

export const MOCK_CONTACT_BY_ID: Record<string, OnboardingContactRef> = {
	"mock-hr": { id: "mock-hr", name: "Mock HR", username: "hr" },
	"mock-vorstand": {
		id: "mock-vorstand",
		name: "Mock Vorstand",
		username: "vorstand",
	},
	"mock-admin": { id: "mock-admin", name: "Mock Admin", username: "admin" },
	"mock-1": { id: "mock-1", name: "Alex Berger", username: "aberger" },
	"mock-4": { id: "mock-4", name: "Riley Hartmann", username: "rhartmann" },
};

/**
 * AUTH_MOCK helper: set / clear onboarding contact on mock profile.
 */
export function mockUpdateMemberOnboardingContact(
	memberId: string,
	contactId: string | null,
): boolean {
	const profile = MOCK_PROFILES[memberId];
	if (!profile) return false;
	if (contactId == null) {
		profile.onboardingContact = null;
		return true;
	}
	const contact = MOCK_CONTACT_BY_ID[contactId];
	if (!contact) return false;
	profile.onboardingContact = { ...contact };
	return true;
}

/**
 * AUTH_MOCK helper: replace assignable ressorts, keep other groups.
 */
export function mockUpdateMemberAssignableGroups(
	memberId: string,
	desiredAssignable: string[],
): boolean {
	const member = MOCK_MEMBERS.find((entry) => entry.id === memberId);
	const profile = MOCK_PROFILES[memberId];
	if (!member && !profile) return false;

	const mergeGroups = (current: string[]): string[] => {
		const kept = current.filter((group) => {
			const key = group.trim().toLowerCase();
			return !RESSORT_KEYS.has(key);
		});
		return [...kept, ...desiredAssignable.map((g) => g.trim()).filter(Boolean)];
	};

	if (member) member.groups = mergeGroups(member.groups);
	if (profile) profile.groups = mergeGroups(profile.groups);

	invalidateDirectoryCache();
	return true;
}

export const MOCK_RECENT_JOINED: Record<string, string> = {
	"mock-1": daysAgoIso(3),
	"mock-3": daysAgoIso(14),
	"mock-5": daysAgoIso(28),
	"mock-2": daysAgoIso(45),
};
