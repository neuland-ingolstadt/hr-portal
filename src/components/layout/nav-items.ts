import {
	ClipboardList,
	FileCheck2,
	Home,
	ScanQrCode,
	UserMinus,
	Users,
} from "lucide-react";
import { type AppRole, hasElevatedAccess } from "#/lib/auth";
import { ROUTES } from "#/lib/constants";
import type { MessageKey } from "#/lib/i18n/messages";

export type NavItem = {
	to: string;
	labelKey: MessageKey;
	icon: typeof Home;
	match: (pathname: string) => boolean;
	/** Vorstand/Admin only (hidden from HR in nav). */
	elevatedOnly?: boolean;
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
		elevatedOnly: true,
	},
	{
		to: ROUTES.ONBOARDING,
		labelKey: "nav.onboarding",
		icon: ClipboardList,
		match: (pathname) => pathname.startsWith(ROUTES.ONBOARDING),
	},
	{
		to: ROUTES.OFFBOARDING,
		labelKey: "nav.offboarding",
		icon: UserMinus,
		match: (pathname) => pathname.startsWith(ROUTES.OFFBOARDING),
		elevatedOnly: true,
	},
];

export function navItemsForRoles(
	items: NavItem[],
	roles: AppRole[],
): NavItem[] {
	const elevated = hasElevatedAccess(roles);
	return items.filter((item) => !item.elevatedOnly || elevated);
}
