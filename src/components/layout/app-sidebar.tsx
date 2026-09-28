import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { KeyboardShortcutsHelpButton } from "#/components/layout/keyboard-shortcuts";
import { LanguageToggle } from "#/components/layout/language-toggle";
import {
	type NavItem,
	bottomNavItems,
	navItemsForRoles,
	overviewItems,
	workflowItems,
} from "#/components/layout/nav-items";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { Button } from "#/components/ui/button";
import { Tooltip } from "#/components/ui/tooltip";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

const appRouteApi = getRouteApi("/_app");

type AppSidebarProps = {
	collapsed?: boolean;
	onCollapsedChange?: (collapsed: boolean) => void;
	/** When false, skip width transition (initial hydrate from localStorage). */
	animateWidth?: boolean;
	onOpenShortcuts?: () => void;
};

function NavSection({
	title,
	items,
	pathname,
	collapsed,
	hideTitle = false,
}: {
	title: string;
	items: NavItem[];
	pathname: string;
	collapsed: boolean;
	hideTitle?: boolean;
}) {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-1">
			{hideTitle || collapsed ? (
				<span className="sr-only">{title}</span>
			) : (
				<p
					data-sidebar-label
					className="px-2 pb-2 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
				>
					{title}
				</p>
			)}
			{items.map((item) => {
				const Icon = item.icon;
				const active = item.match(pathname);
				const label = t(item.labelKey);
				return (
					<Tooltip
						key={item.to}
						label={label}
						side="right"
						enabled={collapsed}
						className="w-full"
					>
						<Link
							to={item.to}
							className={cn(
								"relative flex w-full items-center border border-transparent text-sm no-underline transition-colors",
								collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
								active
									? "border-border bg-muted font-medium text-foreground"
									: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
							)}
							aria-current={active ? "page" : undefined}
							aria-label={collapsed ? label : undefined}
						>
							{active ? (
								<span
									aria-hidden
									className="absolute inset-y-0 left-0 w-0.5 bg-primary"
								/>
							) : null}
							<Icon className="size-4 shrink-0" aria-hidden />
							{collapsed ? null : (
								<span data-sidebar-label className="min-w-0 flex-1 truncate">
									{label}
								</span>
							)}
						</Link>
					</Tooltip>
				);
			})}
		</div>
	);
}

export function AppSidebar({
	collapsed = false,
	onCollapsedChange,
	animateWidth = true,
	onOpenShortcuts,
}: AppSidebarProps) {
	const { t } = useI18n();
	const { user } = appRouteApi.useRouteContext();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const canCollapse = typeof onCollapsedChange === "function";
	const visibleWorkflows = navItemsForRoles(workflowItems, user.roles);
	const visibleBottom = navItemsForRoles(bottomNavItems, user.roles);

	return (
		<aside
			className={cn(
				"app-sidebar flex h-full shrink-0 flex-col overflow-hidden border-r border-border bg-card text-card-foreground",
				animateWidth && "transition-[width] duration-200 ease-out",
				collapsed ? "w-[4.25rem]" : "w-[16.5rem]",
			)}
			data-collapsed={collapsed || undefined}
		>
			<div
				className={cn(
					"flex items-center border-b border-border",
					collapsed ? "flex-col gap-2 px-2 py-3" : "gap-2 px-3 py-3",
				)}
			>
				<Tooltip label="Neuland HR" side="right" enabled={collapsed}>
					<Link
						to={ROUTES.HOME}
						data-sidebar-brand
						className={cn(
							"flex min-w-0 flex-1 items-center no-underline",
							collapsed ? "justify-center" : "gap-3 px-1",
						)}
						aria-label={collapsed ? "Neuland HR" : undefined}
					>
						<NeulandPalm className="h-7 w-auto shrink-0 text-foreground" />
						{collapsed ? null : (
							<div
								data-sidebar-label
								className="min-w-0 font-mono leading-tight"
							>
								<span className="block truncate text-sm font-semibold tracking-wide">
									Neuland
								</span>
								<span className="block text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
									HR
								</span>
							</div>
						)}
					</Link>
				</Tooltip>
				{canCollapse ? (
					<Tooltip
						label={
							collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
						}
						side="right"
						enabled
					>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className="shrink-0 text-muted-foreground"
							aria-label={
								collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
							}
							aria-expanded={!collapsed}
							onClick={() => onCollapsedChange(!collapsed)}
						>
							{collapsed ? (
								<PanelLeftOpen aria-hidden />
							) : (
								<PanelLeftClose aria-hidden />
							)}
						</Button>
					</Tooltip>
				) : null}
			</div>

			<nav
				className={cn(
					"flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto",
					collapsed ? "p-2" : "p-3",
				)}
				aria-label="Main"
			>
				<NavSection
					title={t("nav.sectionOverview")}
					items={overviewItems}
					pathname={pathname}
					collapsed={collapsed}
				/>
				<NavSection
					title={t("nav.sectionWorkflows")}
					items={visibleWorkflows}
					pathname={pathname}
					collapsed={collapsed}
				/>
				{visibleBottom.length > 0 ? (
					<div className="mt-auto">
						<NavSection
							title={t("nav.audit")}
							items={visibleBottom}
							pathname={pathname}
							collapsed={collapsed}
							hideTitle
						/>
					</div>
				) : null}
			</nav>

			<div
				className={cn(
					"mt-auto border-t border-border",
					collapsed ? "flex flex-col items-center gap-1 p-2" : "p-2",
				)}
			>
				<div
					className={cn(
						"flex items-center text-muted-foreground",
						collapsed ? "flex-col gap-0.5" : "gap-0.5 px-1",
					)}
				>
					<Tooltip
						label={t("header.language")}
						side="right"
						enabled={collapsed}
					>
						<LanguageToggle
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
						/>
					</Tooltip>
					<Tooltip label="Theme" side="right" enabled={collapsed}>
						<ThemeToggle
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
						/>
					</Tooltip>
					{onOpenShortcuts ? (
						<Tooltip
							label={t("shortcuts.showHelp")}
							side="right"
							enabled={collapsed}
						>
							<KeyboardShortcutsHelpButton onOpen={onOpenShortcuts} />
						</Tooltip>
					) : null}
					{collapsed ? null : (
						<a
							href={ROUTES.AUTH_LOGOUT}
							data-sidebar-label
							className="ml-auto inline-flex h-9 items-center gap-2 px-2.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
						>
							<LogOut className="size-4 shrink-0" aria-hidden />
							{t("header.logout")}
						</a>
					)}
				</div>
				{collapsed ? (
					<Tooltip label={t("header.logout")} side="right" enabled>
						<a
							href={ROUTES.AUTH_LOGOUT}
							aria-label={t("header.logout")}
							className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<LogOut className="size-4" aria-hidden />
						</a>
					</Tooltip>
				) : null}
			</div>
		</aside>
	);
}
