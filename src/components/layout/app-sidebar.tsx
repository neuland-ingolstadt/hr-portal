import { Link, useRouterState } from "@tanstack/react-router";
import {
	ClipboardList,
	FileCheck2,
	Home,
	LogOut,
	UserMinus,
	Users,
} from "lucide-react";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { LanguageToggle } from "#/components/layout/language-toggle";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { Button } from "#/components/ui/button";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

type AppSidebarProps = {
	mobileOpen?: boolean;
	onNavigate?: () => void;
};

type NavItem = {
	to: string;
	labelKey: MessageKey;
	icon: typeof Home;
	match: (pathname: string) => boolean;
	soon?: boolean;
};

const overviewItems: NavItem[] = [
	{
		to: ROUTES.HOME,
		labelKey: "nav.home",
		icon: Home,
		match: (pathname) => pathname === ROUTES.HOME,
	},
	{
		to: ROUTES.MITGLIEDER,
		labelKey: "nav.members",
		icon: Users,
		match: (pathname) => pathname.startsWith(ROUTES.MITGLIEDER),
	},
];

const workflowItems: NavItem[] = [
	{
		to: ROUTES.BEWERBUNGEN,
		labelKey: "nav.applications",
		icon: FileCheck2,
		match: (pathname) => pathname.startsWith(ROUTES.BEWERBUNGEN),
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

function NavSection({
	title,
	items,
	pathname,
	onNavigate,
}: {
	title: string;
	items: NavItem[];
	pathname: string;
	onNavigate?: () => void;
}) {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-1">
			<p className="px-2 pb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
				{title}
			</p>
			{items.map((item) => {
				const Icon = item.icon;
				const active = item.match(pathname);
				return (
					<Link
						key={item.to}
						to={item.to}
						onClick={onNavigate}
						className={cn(
							"relative flex items-center gap-3 border border-transparent px-3 py-2.5 text-sm no-underline transition-colors",
							active
								? "border-border bg-muted font-medium text-foreground"
								: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
						)}
						aria-current={active ? "page" : undefined}
					>
						{active ? (
							<span
								aria-hidden
								className="absolute inset-y-0 left-0 w-0.5 bg-primary"
							/>
						) : null}
						<Icon className="size-4 shrink-0" aria-hidden />
						<span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
						{item.soon ? (
							<span className="shrink-0 font-mono text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase">
								{t("home.soon")}
							</span>
						) : null}
					</Link>
				);
			})}
		</div>
	);
}

export function AppSidebar({
	mobileOpen = false,
	onNavigate,
}: AppSidebarProps) {
	const { t } = useI18n();
	const pathname = useRouterState({ select: (s) => s.location.pathname });

	return (
		<aside
			className={cn(
				"app-sidebar flex h-full w-[16.5rem] shrink-0 flex-col border-r border-border bg-card text-card-foreground",
				mobileOpen && "app-sidebar--open",
			)}
		>
			<div className="flex items-center gap-3 border-b border-border px-4 py-4">
				<Link
					to={ROUTES.HOME}
					onClick={onNavigate}
					className="flex min-w-0 items-center gap-3 no-underline"
				>
					<NeulandPalm className="h-7 w-auto shrink-0 text-foreground" />
					<div className="min-w-0 font-mono leading-tight">
						<span className="block truncate text-sm font-semibold tracking-wide">
							Neuland
						</span>
						<span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
							HR
						</span>
					</div>
				</Link>
			</div>

			<nav
				className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-3"
				aria-label="Main"
			>
				<NavSection
					title={t("nav.sectionOverview")}
					items={overviewItems}
					pathname={pathname}
					onNavigate={onNavigate}
				/>
				<NavSection
					title={t("nav.sectionWorkflows")}
					items={workflowItems}
					pathname={pathname}
					onNavigate={onNavigate}
				/>
			</nav>

			<div className="mt-auto space-y-2 border-t border-border p-3">
				<div className="grid grid-cols-2 gap-2">
					<LanguageToggle size="sm" className="w-full justify-center" />
					<ThemeToggle size="sm" className="w-full justify-center" />
				</div>
				<Button
					variant="outline"
					size="sm"
					className="w-full justify-center"
					asChild
				>
					<a href={ROUTES.AUTH_LOGOUT}>
						<LogOut />
						{t("header.logout")}
					</a>
				</Button>
			</div>
		</aside>
	);
}
