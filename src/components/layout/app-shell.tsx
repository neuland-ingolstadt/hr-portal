import { Menu, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { AppSidebar } from "#/components/layout/app-sidebar";
import { LegalFooter } from "#/components/layout/legal-footer";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

type AppShellProps = {
	children: ReactNode;
	mainClassName?: string;
};

export function AppShell({ children, mainClassName }: AppShellProps) {
	const { t } = useI18n();
	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<div className="relative flex min-h-screen w-full min-w-0">
			<div
				className="pointer-events-none fixed inset-0 -z-10 neuland-grid-bg neuland-glow"
				aria-hidden="true"
			/>

			{/* Desktop sidebar */}
			<div className="sticky top-0 hidden h-svh w-[16.5rem] shrink-0 md:block">
				<AppSidebar />
			</div>

			{/* Mobile drawer */}
			<div
				className={cn(
					"fixed inset-0 z-50 md:hidden",
					mobileOpen ? "pointer-events-auto" : "pointer-events-none",
				)}
			>
				<button
					type="button"
					aria-label={t("nav.closeMenu")}
					className={cn(
						"absolute inset-0 bg-foreground/25 transition-opacity",
						mobileOpen ? "opacity-100" : "opacity-0",
					)}
					onClick={() => setMobileOpen(false)}
				/>
				<div
					className={cn(
						"absolute inset-y-0 left-0 flex transition-transform duration-200 ease-out",
						mobileOpen ? "translate-x-0" : "-translate-x-full",
					)}
				>
					<AppSidebar
						mobileOpen={mobileOpen}
						onNavigate={() => setMobileOpen(false)}
					/>
				</div>
			</div>

			<div className="flex min-h-screen min-w-0 flex-1 flex-col">
				<header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:hidden">
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						aria-label={t("nav.openMenu")}
						aria-expanded={mobileOpen}
						onClick={() => setMobileOpen((open) => !open)}
					>
						{mobileOpen ? <X aria-hidden /> : <Menu aria-hidden />}
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
