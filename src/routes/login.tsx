import { createFileRoute, redirect } from "@tanstack/react-router";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { AppHeader } from "#/components/layout/app-header";
import { LegalFooter } from "#/components/layout/legal-footer";
import { PageShell } from "#/components/layout/page-shell";
import { Button } from "#/components/ui/button";
import { hasAppAccess } from "#/lib/auth";
import { getAuthStatusFn } from "#/lib/auth.functions";
import { APP_NAME, ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";

const ERROR_KEYS = new Set<string>([
	"oauth_session_missing",
	"id_token_missing_sub",
	"login_failed",
]);

export const Route = createFileRoute("/login")({
	validateSearch: (
		search: Record<string, unknown>,
	): { error?: string; mock?: boolean } => {
		const next: { error?: string; mock?: boolean } = {};
		if (typeof search.error === "string") next.error = search.error;
		if (search.mock === "1" || search.mock === true) next.mock = true;
		return next;
	},
	beforeLoad: async () => {
		const status = await getAuthStatusFn();
		if (status.user && hasAppAccess(status.user.roles)) {
			throw redirect({ to: "/" });
		}
		if (status.user && !hasAppAccess(status.user.roles)) {
			throw redirect({ to: "/kein-zugang" });
		}
		return status;
	},
	component: LoginPage,
});

function LoginPage() {
	const { authMock, authConfigured } = Route.useRouteContext();
	const { error } = Route.useSearch();
	const { t } = useI18n();

	const errorMessage = error
		? ERROR_KEYS.has(error)
			? t(`error.${error}` as MessageKey)
			: t("error.generic")
		: null;

	return (
		<PageShell>
			<AppHeader showHomeLink={false} />

			<div className="flex w-full min-w-0 flex-1 items-center justify-center p-4">
				<section className="panel w-full max-w-md">
					<div className="mb-5 flex justify-center">
						<NeulandPalm className="h-14 w-auto text-foreground" />
					</div>
					<p className="eyebrow text-center">{t("login.eyebrow")}</p>
					<h1 className="panel-title text-center">{APP_NAME}</h1>
					<p className="panel-lead text-center">{t("login.lead")}</p>

					{errorMessage ? (
						<p className="error-banner" role="alert">
							{errorMessage}
						</p>
					) : null}

					{authConfigured ? (
						<Button asChild className="w-full" size="lg">
							<a href={ROUTES.AUTH_LOGIN}>{t("login.cta")}</a>
						</Button>
					) : (
						<p className="hint text-center">{t("login.mockHint")}</p>
					)}

					{authMock ? (
						<div className="mock-block">
							<p className="mock-label">{t("login.mockLabel")}</p>
							<div className="mock-actions">
								<Button asChild variant="secondary" className="w-full">
									<a href="/api/auth/mock?role=hr">{t("login.mockHr")}</a>
								</Button>
								<Button asChild variant="outline" className="w-full">
									<a href="/api/auth/mock?role=vorstand">
										{t("login.mockVorstand")}
									</a>
								</Button>
								<Button asChild variant="ghost" className="w-full">
									<a href="/api/auth/mock?role=none">{t("login.mockGuest")}</a>
								</Button>
							</div>
						</div>
					) : null}
				</section>
			</div>

			<LegalFooter />
		</PageShell>
	);
}
