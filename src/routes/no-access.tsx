import { createFileRoute, redirect } from "@tanstack/react-router";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { AppHeader } from "#/components/layout/app-header";
import { LegalFooter } from "#/components/layout/legal-footer";
import { PageShell } from "#/components/layout/page-shell";
import { Button } from "#/components/ui/button";
import { getAuthStatusFn } from "#/lib/auth.functions";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";

export const Route = createFileRoute("/no-access")({
	beforeLoad: async () => {
		const status = await getAuthStatusFn();
		if (!status.user) {
			throw redirect({ to: "/login" });
		}
		return status;
	},
	component: NoAccessPage,
});

function NoAccessPage() {
	const { user } = Route.useRouteContext();
	const { t, locale } = useI18n();
	const name = user?.name || (locale === "de" ? "du" : "there");

	return (
		<PageShell>
			<AppHeader isSignedIn showHomeLink={false} />

			<div className="flex w-full min-w-0 flex-1 items-center justify-center p-4">
				<section className="panel w-full max-w-md">
					<div className="mb-5 flex justify-center">
						<NeulandPalm className="h-14 w-auto text-foreground" />
					</div>
					<p className="eyebrow text-center">{t("access.eyebrow")}</p>
					<h1 className="panel-title text-center">{t("access.title")}</h1>
					<p className="panel-lead text-center">{t("access.lead", { name })}</p>
					<p className="hint text-center">{t("access.hint")}</p>
					<div className="mt-5">
						<Button asChild variant="outline" className="w-full">
							<a href={ROUTES.AUTH_LOGOUT}>{t("header.logout")}</a>
						</Button>
					</div>
				</section>
			</div>

			<LegalFooter />
		</PageShell>
	);
}
