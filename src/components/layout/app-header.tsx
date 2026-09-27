import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { LanguageToggle } from "#/components/layout/language-toggle";
import { ThemeToggle } from "#/components/layout/theme-toggle";
import { Button } from "#/components/ui/button";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";

type AppHeaderProps = {
	isSignedIn?: boolean;
	/** When true, logo links home; when false (login), logo is static. */
	showHomeLink?: boolean;
};

/** Compact top bar for auth / no-access pages (no app sidebar). */
export function AppHeader({
	isSignedIn = false,
	showHomeLink = true,
}: AppHeaderProps) {
	const { t } = useI18n();

	const logo = (
		<>
			<NeulandPalm className="h-9 w-auto text-foreground" />
			<div className="font-mono leading-tight">
				<span className="block text-sm font-semibold tracking-wide text-foreground">
					Neuland
				</span>
				<span className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
					HR
				</span>
			</div>
		</>
	);

	return (
		<header className="sticky top-0 z-50 w-full min-w-0 border-b border-border bg-card">
			<div className="page-gutter mx-auto flex h-16 w-full min-w-0 max-w-6xl items-center justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3">
					{showHomeLink ? (
						<Link
							to={ROUTES.HOME}
							className="group flex shrink-0 items-center gap-3 no-underline"
						>
							{logo}
						</Link>
					) : (
						<div className="group flex shrink-0 items-center gap-3">{logo}</div>
					)}
				</div>

				<div className="flex shrink-0 items-center gap-2 sm:gap-3">
					<LanguageToggle />
					<ThemeToggle />

					{isSignedIn ? (
						<Button variant="outline" size="sm" asChild>
							<a href={ROUTES.AUTH_LOGOUT}>
								<LogOut />
								{t("header.logout")}
							</a>
						</Button>
					) : null}
				</div>
			</div>
		</header>
	);
}
