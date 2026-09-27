import {
	Await,
	createFileRoute,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { RecentMembersGrid } from "#/components/onboarding/recent-members-grid";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { RecentOnboardingMembersResult } from "#/lib/onboarding";
import { listRecentOnboardingMembersFn } from "#/lib/onboarding.functions";

export const Route = createFileRoute("/_app/onboarding")({
	loader: () => ({
		recentPromise: listRecentOnboardingMembersFn(),
	}),
	staleTime: 30_000,
	preloadStaleTime: 30_000,
	errorComponent: OnboardingError,
	component: OnboardingPage,
});

function OnboardingHeader({ lead, meta }: { lead: string; meta?: string }) {
	const { t } = useI18n();
	return (
		<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0 space-y-2">
				<p className="eyebrow mb-0">{t("onboarding.eyebrow")}</p>
				<h1 className="page-title text-balance">{t("onboarding.title")}</h1>
				<p className="page-lead max-w-2xl">{lead}</p>
			</div>
			{meta ? <p className="page-meta shrink-0 sm:pb-1">{meta}</p> : null}
		</header>
	);
}

function OnboardingSkeleton() {
	const { t } = useI18n();
	return (
		<div className="surface-panel flex min-h-72 items-center justify-center">
			<Spinner label={t("onboarding.recent.loading")} />
		</div>
	);
}

function OnboardingBody({ data }: { data: RecentOnboardingMembersResult }) {
	const { t } = useI18n();

	return (
		<>
			{data.source === "mock" ? (
				<p className="hint m-0 -mt-3">{t("onboarding.recent.mockHint")}</p>
			) : null}

			<section className="space-y-3">
				<div className="space-y-1">
					<h2 className="text-base font-semibold tracking-tight">
						{t("onboarding.recent.title", { weeks: String(data.weeks) })}
					</h2>
					<p className="text-sm text-muted-foreground">
						{t("onboarding.recent.lead")}
					</p>
				</div>

				{data.members.length === 0 ? (
					<div className="surface-panel flex min-h-48 items-center justify-center p-6">
						<p className="text-sm text-muted-foreground">
							{t("onboarding.recent.empty", { weeks: String(data.weeks) })}
						</p>
					</div>
				) : (
					<RecentMembersGrid members={data.members} />
				)}
			</section>
		</>
	);
}

function OnboardingError({ error, reset }: ErrorComponentProps) {
	const { t } = useI18n();
	const message = error instanceof Error ? error.message : "";
	const key: MessageKey =
		message === "authentik_api_missing"
			? "onboarding.recent.errorApiMissing"
			: "onboarding.recent.errorLoad";

	return (
		<>
			<OnboardingHeader lead={t("onboarding.leadLive")} />
			<div className="surface-panel space-y-4 p-5 sm:p-6">
				<p className="error-banner" role="alert">
					{t(key)}
				</p>
				<Button type="button" variant="outline" onClick={reset}>
					{t("onboarding.recent.retry")}
				</Button>
			</div>
		</>
	);
}

function OnboardingPage() {
	const { recentPromise } = Route.useLoaderData();
	const { t } = useI18n();

	return (
		<Await
			promise={recentPromise}
			fallback={
				<>
					<OnboardingHeader lead={t("onboarding.recent.loading")} />
					<OnboardingSkeleton />
				</>
			}
		>
			{(data) => (
				<>
					<OnboardingHeader
						lead={t("onboarding.leadLive")}
						meta={
							data.members.length > 0
								? t("onboarding.recent.count", {
										count: String(data.members.length),
									})
								: undefined
						}
					/>
					<OnboardingBody data={data} />
				</>
			)}
		</Await>
	);
}
