import {
	ClipboardList,
	FileCheck2,
	Home,
	ScanQrCode,
	UserMinus,
	Users,
} from "lucide-react";
import { ROUTES } from "#/lib/constants";
import type { MessageKey } from "#/lib/i18n/messages";

export type NavItem = {
	to: string;
	labelKey: MessageKey;
	icon: typeof Home;
	match: (pathname: string) => boolean;
	soon?: boolean;
};

export const overviewItems: NavItem[] = [
	{
		to: ROUTES.HOME,
		labelKey: "nav.home",
		icon: Home,
		match: (pathname) => pathname === ROUTES.HOME,
	},
	{
		to: ROUTES.MEMBERS,
		labelKey: "nav.members",
		icon: Users,
		match: (pathname) => pathname.startsWith(ROUTES.MEMBERS),
	},
	{
		to: ROUTES.SCANNER,
		labelKey: "nav.scanner",
		icon: ScanQrCode,
		match: (pathname) => pathname.startsWith(ROUTES.SCANNER),
	},
];

export const workflowItems: NavItem[] = [
	{
		to: ROUTES.APPLICATIONS,
		labelKey: "nav.applications",
		icon: FileCheck2,
		match: (pathname) => pathname.startsWith(ROUTES.APPLICATIONS),
		soon: true,
	},
	{
		to: ROUTES.ONBOARDING,
		labelKey: "nav.onboarding",
		icon: ClipboardList,
		match: (pathname) => pathname.startsWith(ROUTES.ONBOARDING),
		soon: true,
	},
	{
		to: ROUTES.OFFBOARDING,
		labelKey: "nav.offboarding",
		icon: UserMinus,
		match: (pathname) => pathname.startsWith(ROUTES.OFFBOARDING),
	},
];
