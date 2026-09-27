import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { KeyboardShortcutsHelpButton } from "#/components/layout/keyboard-shortcuts";
import { LanguageToggle } from "#/components/layout/language-toggle";
import {
	type NavItem,
	navItemsForRoles,
	overviewItems,
	workflowItems,
} from "#/components/layout/nav-items";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { Button } from "#/components/ui/button";
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

function SidebarHoverLabel({
	label,
	enabled,
	className,
	children,
}: {
	label: string;
	enabled: boolean;
	className?: string;
	children: ReactNode;
}) {
	const triggerRef = useRef<HTMLSpanElement>(null);
	const tooltipId = useId();
	const [open, setOpen] = useState(false);
	const [coords, setCoords] = useState<{ top: number; left: number } | null>(
		null,
	);

	const updatePosition = useCallback(() => {
		const el = triggerRef.current;
		if (!el) return;
		const target = (el.firstElementChild as HTMLElement | null) ?? el;
		const rect = target.getBoundingClientRect();
		setCoords({
			top: rect.top + rect.height / 2,
			left: rect.right + 10,
		});
	}, []);

	const show = useCallback(() => {
		if (!enabled) return;
		updatePosition();
		setOpen(true);
	}, [enabled, updatePosition]);

	const hide = useCallback(() => {
		setOpen(false);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onScroll = () => updatePosition();
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onScroll);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onScroll);
		};
	}, [open, updatePosition]);

	useEffect(() => {
		if (!enabled) setOpen(false);
	}, [enabled]);

	if (!enabled) {
		return children;
	}

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: tooltip trigger wraps interactive children */}
			<span
				ref={triggerRef}
				className={cn("inline-flex max-w-full", className)}
				onMouseEnter={show}
				onMouseLeave={hide}
				onFocus={show}
				onBlur={hide}
				aria-describedby={open ? tooltipId : undefined}
			>
				{children}
			</span>
			{open && coords
				? createPortal(
						<span
							id={tooltipId}
							role="tooltip"
							className="pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap border border-border bg-card px-2.5 py-1.5 font-mono text-xs font-medium text-card-foreground shadow-sm"
							style={{ top: coords.top, left: coords.left }}
						>
							{label}
						</span>,
						document.body,
					)
				: null}
		</>
	);
}

function NavSection({
	title,
	items,
	pathname,
	collapsed,
}: {
	title: string;
	items: NavItem[];
	pathname: string;
	collapsed: boolean;
}) {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-1">
			{collapsed ? (
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
					<SidebarHoverLabel
						key={item.to}
						label={label}
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
					</SidebarHoverLabel>
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
				<SidebarHoverLabel label="Neuland HR" enabled={collapsed}>
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
				</SidebarHoverLabel>
				{canCollapse ? (
					<SidebarHoverLabel
						label={
							collapsed ? t("nav.expandSidebar") : t("nav.collapseSidebar")
						}
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
					</SidebarHoverLabel>
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
					<SidebarHoverLabel label={t("header.language")} enabled={collapsed}>
						<LanguageToggle
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
						/>
					</SidebarHoverLabel>
					<SidebarHoverLabel label="Theme" enabled={collapsed}>
						<ThemeToggle
							variant="ghost"
							size="icon-sm"
							className="text-muted-foreground"
						/>
					</SidebarHoverLabel>
					{onOpenShortcuts ? (
						<SidebarHoverLabel
							label={t("shortcuts.showHelp")}
							enabled={collapsed}
						>
							<KeyboardShortcutsHelpButton onOpen={onOpenShortcuts} />
						</SidebarHoverLabel>
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
					<SidebarHoverLabel label={t("header.logout")} enabled>
						<a
							href={ROUTES.AUTH_LOGOUT}
							aria-label={t("header.logout")}
							className="inline-flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<LogOut className="size-4" aria-hidden />
						</a>
					</SidebarHoverLabel>
				) : null}
			</div>
		</aside>
	);
}
