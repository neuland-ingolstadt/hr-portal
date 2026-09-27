import {
	Await,
	createFileRoute,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { OffboardingCandidatesTable } from "#/components/offboarding/offboarding-candidates-table";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { MembersResult } from "#/lib/members";
import { listOffboardingCandidatesFn } from "#/lib/members.functions";

export const Route = createFileRoute("/_app/offboarding")({
	loader: () => ({
		// Do not await — page chrome stays interactive while Authentik loads.
		candidatesPromise: listOffboardingCandidatesFn(),
	}),
	staleTime: 30_000,
	preloadStaleTime: 30_000,
	errorComponent: OffboardingError,
	component: OffboardingPage,
});

function OffboardingHeader({ meta }: { meta?: string }) {
	const { t } = useI18n();
	return (
		<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0 space-y-2">
				<p className="eyebrow mb-0">{t("offboarding.eyebrow")}</p>
				<h1 className="page-title text-balance">{t("offboarding.title")}</h1>
				<p className="page-lead max-w-2xl">{t("offboarding.leadLive")}</p>
			</div>
			{meta ? <p className="page-meta shrink-0 sm:pb-1">{meta}</p> : null}
		</header>
	);
}

function OffboardingSoonSection() {
	const { t } = useI18n();
	return (
		<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{(
				[
					"offboarding.bulletChecklist",
					"offboarding.bulletAccess",
					"offboarding.bulletHandover",
					"offboarding.bulletArchive",
				] as const
			).map((key) => (
				<div
					key={key}
					className="surface-panel border-dashed p-4 text-sm text-muted-foreground"
				>
					<span className="mb-2 inline-block border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold tracking-wide uppercase">
						{t("home.soon")}
					</span>
					<p>{t(key)}</p>
				</div>
			))}
		</section>
	);
}

function CandidatesSkeleton() {
	const { t } = useI18n();
	return (
		<div
			className="surface-panel flex min-h-64 items-center justify-center"
			aria-busy="true"
		>
			<p className="text-sm text-muted-foreground">
				{t("offboarding.candidatesLoading")}
			</p>
		</div>
	);
}

function CandidatesSection({ data }: { data: MembersResult }) {
	const { t } = useI18n();
	const { members, source } = data;

	return (
		<section className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div className="space-y-1">
					<h2 className="text-base font-semibold tracking-tight">
						{t("offboarding.candidatesTitle")}
					</h2>
					<p className="max-w-2xl text-sm text-muted-foreground">
						{t("offboarding.candidatesLead")}
					</p>
				</div>
			</div>

			{source === "mock" ? (
				<p className="hint m-0">{t("members.mockHint")}</p>
			) : null}

			<OffboardingCandidatesTable candidates={members} />
		</section>
	);
}

function OffboardingError({ error, reset }: ErrorComponentProps) {
	const { t } = useI18n();
	const message = error instanceof Error ? error.message : "";
	const key: MessageKey =
		message === "authentik_api_missing"
			? "members.errorApiMissing"
			: "offboarding.candidatesError";

	return (
		<>
			<OffboardingHeader />
			<div className="surface-panel p-5 sm:p-6">
				<p className="error-banner" role="alert">
					{t(key)}
				</p>
				<Button type="button" variant="outline" onClick={reset}>
					{t("members.retry")}
				</Button>
			</div>
			<OffboardingSoonSection />
		</>
	);
}

function OffboardingPage() {
	const { candidatesPromise } = Route.useLoaderData();
	const { t } = useI18n();

	return (
		<>
			<Await
				promise={candidatesPromise}
				fallback={
					<>
						<OffboardingHeader />
						<section className="space-y-3">
							<div className="space-y-1">
								<h2 className="text-base font-semibold tracking-tight">
									{t("offboarding.candidatesTitle")}
								</h2>
								<p className="max-w-2xl text-sm text-muted-foreground">
									{t("offboarding.candidatesLead")}
								</p>
							</div>
							<CandidatesSkeleton />
						</section>
					</>
				}
			>
				{(data) => (
					<>
						<OffboardingHeader
							meta={t("offboarding.candidatesCount", {
								count: String(data.members.length),
							})}
						/>
						<CandidatesSection data={data} />
					</>
				)}
			</Await>
			<OffboardingSoonSection />
		</>
	);
}
