import { ROUTES } from "#/lib/constants";
import type { MessageKey } from "#/lib/i18n/messages";

export type HelpTopicId =
	| "home"
	| "members"
	| "scanner"
	| "applications"
	| "onboarding"
	| "offboarding"
	| "audit";

export type HelpSection = {
	headingKey: MessageKey;
	bodyKey: MessageKey;
};

export type HelpTopic = {
	id: HelpTopicId;
	/** Hidden from topic chips for HR. */
	elevatedOnly?: boolean;
	titleKey: MessageKey;
	leadKey: MessageKey;
	/** Longer intro under the lead. */
	introKey: MessageKey;
	sections: readonly HelpSection[];
};

export const HELP_TOPICS: Record<HelpTopicId, HelpTopic> = {
	home: {
		id: "home",
		titleKey: "help.home.title",
		leadKey: "help.home.lead",
		introKey: "help.home.intro",
		sections: [
			{ headingKey: "help.home.s1.heading", bodyKey: "help.home.s1.body" },
			{ headingKey: "help.home.s2.heading", bodyKey: "help.home.s2.body" },
			{ headingKey: "help.home.s3.heading", bodyKey: "help.home.s3.body" },
			{ headingKey: "help.home.s4.heading", bodyKey: "help.home.s4.body" },
		],
	},
	members: {
		id: "members",
		titleKey: "help.members.title",
		leadKey: "help.members.lead",
		introKey: "help.members.intro",
		sections: [
			{
				headingKey: "help.members.s1.heading",
				bodyKey: "help.members.s1.body",
			},
			{
				headingKey: "help.members.s2.heading",
				bodyKey: "help.members.s2.body",
			},
			{
				headingKey: "help.members.s3.heading",
				bodyKey: "help.members.s3.body",
			},
			{
				headingKey: "help.members.s4.heading",
				bodyKey: "help.members.s4.body",
			},
		],
	},
	scanner: {
		id: "scanner",
		titleKey: "help.scanner.title",
		leadKey: "help.scanner.lead",
		introKey: "help.scanner.intro",
		sections: [
			{
				headingKey: "help.scanner.s1.heading",
				bodyKey: "help.scanner.s1.body",
			},
			{
				headingKey: "help.scanner.s2.heading",
				bodyKey: "help.scanner.s2.body",
			},
			{
				headingKey: "help.scanner.s3.heading",
				bodyKey: "help.scanner.s3.body",
			},
		],
	},
	applications: {
		id: "applications",
		elevatedOnly: true,
		titleKey: "help.applications.title",
		leadKey: "help.applications.lead",
		introKey: "help.applications.intro",
		sections: [
			{
				headingKey: "help.applications.s1.heading",
				bodyKey: "help.applications.s1.body",
			},
			{
				headingKey: "help.applications.s2.heading",
				bodyKey: "help.applications.s2.body",
			},
			{
				headingKey: "help.applications.s3.heading",
				bodyKey: "help.applications.s3.body",
			},
			{
				headingKey: "help.applications.s4.heading",
				bodyKey: "help.applications.s4.body",
			},
		],
	},
	onboarding: {
		id: "onboarding",
		titleKey: "help.onboarding.title",
		leadKey: "help.onboarding.lead",
		introKey: "help.onboarding.intro",
		sections: [
			{
				headingKey: "help.onboarding.s1.heading",
				bodyKey: "help.onboarding.s1.body",
			},
			{
				headingKey: "help.onboarding.s2.heading",
				bodyKey: "help.onboarding.s2.body",
			},
			{
				headingKey: "help.onboarding.s3.heading",
				bodyKey: "help.onboarding.s3.body",
			},
			{
				headingKey: "help.onboarding.s4.heading",
				bodyKey: "help.onboarding.s4.body",
			},
		],
	},
	offboarding: {
		id: "offboarding",
		elevatedOnly: true,
		titleKey: "help.offboarding.title",
		leadKey: "help.offboarding.lead",
		introKey: "help.offboarding.intro",
		sections: [
			{
				headingKey: "help.offboarding.s1.heading",
				bodyKey: "help.offboarding.s1.body",
			},
			{
				headingKey: "help.offboarding.s2.heading",
				bodyKey: "help.offboarding.s2.body",
			},
			{
				headingKey: "help.offboarding.s3.heading",
				bodyKey: "help.offboarding.s3.body",
			},
			{
				headingKey: "help.offboarding.s4.heading",
				bodyKey: "help.offboarding.s4.body",
			},
		],
	},
	audit: {
		id: "audit",
		elevatedOnly: true,
		titleKey: "help.audit.title",
		leadKey: "help.audit.lead",
		introKey: "help.audit.intro",
		sections: [
			{ headingKey: "help.audit.s1.heading", bodyKey: "help.audit.s1.body" },
			{ headingKey: "help.audit.s2.heading", bodyKey: "help.audit.s2.body" },
			{ headingKey: "help.audit.s3.heading", bodyKey: "help.audit.s3.body" },
		],
	},
};

const PATH_TOPICS: { match: (pathname: string) => boolean; id: HelpTopicId }[] =
	[
		{ match: (p) => p.startsWith(ROUTES.MEMBERS), id: "members" },
		{ match: (p) => p.startsWith(ROUTES.SCANNER), id: "scanner" },
		{ match: (p) => p.startsWith(ROUTES.APPLICATIONS), id: "applications" },
		{ match: (p) => p.startsWith(ROUTES.ONBOARDING), id: "onboarding" },
		{ match: (p) => p.startsWith(ROUTES.OFFBOARDING), id: "offboarding" },
		{ match: (p) => p.startsWith(ROUTES.AUDIT), id: "audit" },
		{ match: (p) => p === ROUTES.HOME, id: "home" },
	];

export function helpTopicIdFromPathname(pathname: string): HelpTopicId {
	for (const entry of PATH_TOPICS) {
		if (entry.match(pathname)) return entry.id;
	}
	return "home";
}

export function getHelpTopic(pathname: string): HelpTopic {
	return HELP_TOPICS[helpTopicIdFromPathname(pathname)];
}
