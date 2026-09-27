import { Menu } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { AppSidebar } from "#/components/layout/app-sidebar";
import { LegalFooter } from "#/components/layout/legal-footer";
import { MobileNavSheet } from "#/components/layout/mobile-nav-sheet";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

const SIDEBAR_COLLAPSED_KEY = "neuland-sidebar-collapsed";

type AppShellProps = {
	children: ReactNode;
	mainClassName?: string;
};

export function AppShell({ children, mainClassName }: AppShellProps) {
	const { t } = useI18n();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	useEffect(() => {
		try {
			setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
		} catch {
			/* ignore */
		}
	}, []);

	function handleCollapsedChange(next: boolean) {
		setCollapsed(next);
		try {
			localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
		} catch {
			/* ignore */
		}
	}

	return (
		<div className="relative flex min-h-screen w-full min-w-0">
			<div
				className="pointer-events-none fixed inset-0 -z-10 neuland-grid-bg neuland-glow"
				aria-hidden="true"
			/>

			{/* Desktop sidebar */}
			<div
				className={cn(
					"sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 ease-out md:block",
					collapsed ? "w-[4.25rem]" : "w-[16.5rem]",
				)}
			>
				<AppSidebar
					collapsed={collapsed}
					onCollapsedChange={handleCollapsedChange}
				/>
			</div>

			<MobileNavSheet open={mobileOpen} onOpenChange={setMobileOpen} />

			<div className="flex min-h-screen min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label={t("nav.openMenu")}
						aria-expanded={mobileOpen}
						aria-haspopup="dialog"
						onClick={() => setMobileOpen(true)}
					>
						<Menu aria-hidden />
					</Button>
					<span className="font-mono text-sm font-semibold tracking-wide">
						Neuland HR
					</span>
				</header>

				<main
					className={cn(
						"page-gutter mx-auto w-full min-w-0 max-w-6xl flex-1 py-6 sm:py-8 md:p-8 md:pt-8",
						mainClassName,
					)}
				>
					{children}
				</main>

				<LegalFooter />
			</div>
		</div>
	);
}
