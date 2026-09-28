import { getRouteApi, Link, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { LanguageToggle } from "#/components/layout/language-toggle";
import {
	bottomNavItems,
	type NavItem,
	navItemsForRoles,
	overviewItems,
	workflowItems,
} from "#/components/layout/nav-items";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

const appRouteApi = getRouteApi("/_app");

type MobileNavSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function MobileNavSection({
	title,
	items,
	pathname,
	onNavigate,
	hideTitle = false,
}: {
	title: string;
	items: NavItem[];
	pathname: string;
	onNavigate: () => void;
	hideTitle?: boolean;
}) {
	const { t } = useI18n();

	return (
		<div className="flex flex-col gap-1">
			{hideTitle ? (
				<span className="sr-only">{title}</span>
			) : (
				<p className="px-1 pb-1.5 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
					{title}
				</p>
			)}
			{items.map((item) => {
				const Icon = item.icon;
				const active = item.match(pathname);
				const label = t(item.labelKey);
				return (
					<Link
						key={item.to}
						to={item.to}
						onClick={onNavigate}
						className={cn(
							"relative flex items-center gap-3 border border-transparent px-3 py-3 text-sm no-underline transition-colors",
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
						<span className="min-w-0 flex-1 truncate">{label}</span>
					</Link>
				);
			})}
		</div>
	);
}

export function MobileNavSheet({ open, onOpenChange }: MobileNavSheetProps) {
	const { t } = useI18n();
	const { user } = appRouteApi.useRouteContext();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const visibleWorkflows = navItemsForRoles(workflowItems, user.roles);
	const visibleBottom = navItemsForRoles(bottomNavItems, user.roles);

	function close() {
		onOpenChange(false);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="bottom"
				showClose
				className="max-h-[85dvh] gap-0 overflow-hidden p-0 md:hidden"
			>
				<div aria-hidden className="mx-auto mt-3 h-1 w-10 shrink-0 bg-border" />
				<SheetHeader className="border-b border-border px-4 py-4 pr-12">
					<div className="flex items-center gap-3">
						<NeulandPalm className="h-7 w-auto shrink-0 text-foreground" />
						<div className="min-w-0">
							<SheetTitle>Neuland HR</SheetTitle>
							<SheetDescription className="sr-only">
								{t("nav.section")}
							</SheetDescription>
						</div>
					</div>
				</SheetHeader>

				<nav
					className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4"
					aria-label="Main"
				>
					<MobileNavSection
						title={t("nav.sectionOverview")}
						items={overviewItems}
						pathname={pathname}
						onNavigate={close}
					/>
					<MobileNavSection
						title={t("nav.sectionWorkflows")}
						items={visibleWorkflows}
						pathname={pathname}
						onNavigate={close}
					/>
					{visibleBottom.length > 0 ? (
						<div className="mt-auto">
							<MobileNavSection
								title={t("nav.audit")}
								items={visibleBottom}
								pathname={pathname}
								onNavigate={close}
								hideTitle
							/>
						</div>
					) : null}
				</nav>

				<div className="flex items-center gap-1 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
					<LanguageToggle
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground"
					/>
					<ThemeToggle
						variant="ghost"
						size="icon-sm"
						className="text-muted-foreground"
					/>
					<a
						href={ROUTES.AUTH_LOGOUT}
						className="ml-auto inline-flex h-9 items-center gap-2 px-2.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
					>
						<LogOut className="size-4 shrink-0" aria-hidden />
						{t("header.logout")}
					</a>
				</div>
			</SheetContent>
		</Sheet>
	);
}
