import { Menu } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AppSidebar } from "#/components/layout/app-sidebar";
import {
	KeyboardShortcuts,
	KeyboardShortcutsHelpButton,
	openKeyboardShortcutsHelp,
} from "#/components/layout/keyboard-shortcuts";
import { LegalFooter } from "#/components/layout/legal-footer";
import { MobileNavSheet } from "#/components/layout/mobile-nav-sheet";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import { readSidebarCollapsed, writeSidebarCollapsed } from "#/lib/sidebar";
import { cn } from "#/lib/utils";

type AppShellProps = {
	children: ReactNode;
	mainClassName?: string;
};

export function AppShell({ children, mainClassName }: AppShellProps) {
	const { t } = useI18n();
	const [mobileOpen, setMobileOpen] = useState(false);
	// SSR defaults to expanded; client-shell + CSS apply the stored rail before paint.
	const [collapsed, setCollapsed] = useState(false);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		setCollapsed(readSidebarCollapsed());
		setReady(true);
	}, []);

	function handleCollapsedChange(next: boolean) {
		setCollapsed(next);
		writeSidebarCollapsed(next);
	}

	const handleToggleSidebar = useCallback(() => {
		const isDesktop = window.matchMedia("(min-width: 768px)").matches;
		if (isDesktop) {
			setCollapsed((prev) => {
				const next = !prev;
				writeSidebarCollapsed(next);
				return next;
			});
			return;
		}
		setMobileOpen((prev) => !prev);
	}, []);

	return (
		<div className="relative flex min-h-screen w-full min-w-0">
			<div
				className="pointer-events-none fixed inset-0 -z-10 neuland-grid-bg neuland-glow"
				aria-hidden="true"
			/>

			{/* Desktop sidebar */}
			<div
				data-app-sidebar-shell
				className={cn(
					"sticky top-0 hidden h-svh shrink-0 md:block",
					ready && "transition-[width] duration-200 ease-out",
					collapsed ? "w-[4.25rem]" : "w-[16.5rem]",
				)}
			>
				<AppSidebar
					collapsed={collapsed}
					onCollapsedChange={handleCollapsedChange}
					animateWidth={ready}
					onOpenShortcuts={openKeyboardShortcutsHelp}
				/>
			</div>

			<MobileNavSheet
				open={mobileOpen}
				onOpenChange={setMobileOpen}
				onOpenShortcuts={openKeyboardShortcutsHelp}
			/>

			<KeyboardShortcuts onToggleSidebar={handleToggleSidebar} />

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
					<KeyboardShortcutsHelpButton
						onOpen={openKeyboardShortcutsHelp}
						className="ml-auto"
					/>
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
