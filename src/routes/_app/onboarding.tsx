import {
	createFileRoute,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "#/components/layout/page-header";
import { RecentMembersGrid } from "#/components/onboarding/recent-members-grid";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { RecentOnboardingMembersResult } from "#/lib/onboarding";
import { listRecentOnboardingMembersFn } from "#/lib/onboarding.functions";
import { cn } from "#/lib/utils";

/** Brief pause after the last phase so completed checks are visible. */
const LOADING_COMPLETE_HOLD_MS = 400;
/** Skip the step theatre when the list resolves almost instantly. */
const LOADING_THEATRE_MIN_MS = 450;
/** Stagger conceptual phases while the single Authentik list call is in flight. */
const LOADING_PHASE_STAGGER_MS = 520;

export const Route = createFileRoute("/_app/onboarding")({
	loader: () => ({
		recentPromise: listRecentOnboardingMembersFn(),
	}),
	staleTime: 30_000,
	preloadStaleTime: 30_000,
	errorComponent: OnboardingError,
	component: OnboardingPage,
});

/** Conceptual load phases - mirrors the Authentik list path (accounts → Mitglieder → stages). */
const LOADING_PHASES = [
	{ id: "accounts", key: "onboarding.loadingStepAccounts" },
	{ id: "mitglieder", key: "onboarding.loadingStepMitglieder" },
	{ id: "stages", key: "onboarding.loadingStepStages" },
] as const satisfies ReadonlyArray<{ id: string; key: MessageKey }>;

type LoadingPhaseId = (typeof LOADING_PHASES)[number]["id"];
type PhaseStatus = "pending" | "active" | "done";
type LoadingPhases = Record<LoadingPhaseId, PhaseStatus>;

const INITIAL_LOADING_PHASES: LoadingPhases = {
	accounts: "active",
	mitglieder: "pending",
	stages: "pending",
};

function OnboardingHeader({ lead, meta }: { lead: string; meta?: string }) {
	const { t } = useI18n();
	return (
		<PageHeader
			eyebrow={t("onboarding.eyebrow")}
			title={t("onboarding.title")}
			lead={lead}
			end={meta ? <p className="page-meta m-0">{meta}</p> : undefined}
		/>
	);
}

function OnboardingLoadingStatus({ phases }: { phases: LoadingPhases }) {
	const { t } = useI18n();
	const doneCount = LOADING_PHASES.filter(
		(phase) => phases[phase.id] === "done",
	).length;
	const allDone = doneCount === LOADING_PHASES.length;
	const percent = Math.round((doneCount / LOADING_PHASES.length) * 100);

	return (
		<section
			className="surface-panel grid gap-3 p-5 sm:p-6"
			aria-live="polite"
			aria-busy={!allDone}
			aria-label={t("onboarding.recent.loading")}
		>
			<div className="h-1 overflow-hidden bg-muted">
				{allDone ? (
					<div className="h-full w-full bg-primary transition-[width] duration-300" />
				) : doneCount > 0 ? (
					<div
						className="h-full bg-primary transition-[width] duration-300 ease-out"
						style={{ width: `${percent}%` }}
					/>
				) : (
					<div className="h-full w-1/3 animate-accept-progress bg-primary" />
				)}
			</div>
			<ol className="m-0 grid list-none gap-2.5 p-0">
				{LOADING_PHASES.map(({ id, key }) => {
					const status = phases[id];
					const done = status === "done";
					const active = status === "active";
					return (
						<li
							key={id}
							className={cn(
								"flex items-center gap-2.5 text-sm",
								done && "text-foreground",
								active && "font-medium text-foreground",
								!done && !active && "text-muted-foreground",
							)}
						>
							<span
								className={cn(
									"flex size-5 shrink-0 items-center justify-center",
									(done || active) && "text-primary",
								)}
								aria-hidden
							>
								{done ? (
									<Check className="size-4" strokeWidth={2.5} />
								) : active ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<span className="size-1.5 rounded-full bg-muted-foreground/40" />
								)}
							</span>
							<span>{t(key)}</span>
						</li>
					);
				})}
			</ol>
			<p className="m-0 text-xs text-muted-foreground">
				{t("onboarding.loadingHint")}
			</p>
		</section>
	);
}

function MemberCardSkeleton() {
	return (
		<li className="surface-panel relative flex flex-col gap-4 overflow-hidden p-4">
			<span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-muted">
				<span className="block h-full w-[12%] animate-pulse bg-primary/40" />
			</span>
			<div className="flex items-start gap-3">
				<div className="size-10 shrink-0 animate-pulse bg-muted" />
				<div className="min-w-0 flex-1 space-y-2 pt-1">
					<div className="h-3.5 w-3/4 animate-pulse bg-muted" />
					<div className="h-3 w-1/2 animate-pulse bg-muted" />
				</div>
			</div>
			<div className="mt-auto space-y-2">
				<div className="h-3 w-2/5 animate-pulse bg-muted" />
				<div className="h-3 w-1/3 animate-pulse bg-muted" />
			</div>
		</li>
	);
}

function StageSectionSkeleton({ cards }: { cards: number }) {
	return (
		<section className="min-w-0 space-y-3" aria-hidden>
			<div className="flex items-center gap-2">
				<div className="size-4 shrink-0 animate-pulse bg-muted" />
				<div className="h-3.5 min-w-0 flex-1 max-w-28 animate-pulse bg-muted" />
				<div className="h-3 w-5 shrink-0 animate-pulse bg-muted" />
			</div>
			<ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{Array.from({ length: cards }, (_, i) => (
					<MemberCardSkeleton key={`onboarding-card-skel-${String(i)}`} />
				))}
			</ul>
		</section>
	);
}

function OnboardingSkeleton({ phases }: { phases: LoadingPhases }) {
	return (
		<div className="space-y-8" aria-busy="true">
			<OnboardingLoadingStatus phases={phases} />

			<section className="space-y-3">
				<div className="space-y-2" aria-hidden>
					<div className="h-4 w-52 max-w-full animate-pulse bg-muted" />
					<div className="h-3 w-80 max-w-full animate-pulse bg-muted" />
				</div>

				<div className="flex flex-wrap gap-2" aria-hidden>
					{Array.from({ length: 3 }, (_, i) => (
						<div
							key={`onboarding-filter-skel-${String(i)}`}
							className="h-8 w-16 animate-pulse bg-muted"
						/>
					))}
				</div>

				<div className="space-y-8">
					<StageSectionSkeleton cards={4} />
					<StageSectionSkeleton cards={3} />
				</div>
			</section>
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
					<RecentMembersGrid
						members={data.members}
						viewerContactIds={data.viewerContactIds}
					/>
				)}
			</section>
		</>
	);
}

/** Shared error UI - do not reuse the route `errorComponent` in the page (breaks tsr-split). */
function OnboardingErrorView({ error, reset }: ErrorComponentProps) {
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

function OnboardingError(props: ErrorComponentProps) {
	return <OnboardingErrorView {...props} />;
}

function OnboardingPage() {
	const { recentPromise } = Route.useLoaderData();
	const { t } = useI18n();
	const router = useRouter();

	const [phases, setPhases] = useState<LoadingPhases>(INITIAL_LOADING_PHASES);
	const [data, setData] = useState<RecentOnboardingMembersResult | null>(null);
	const [loadError, setLoadError] = useState<unknown>(null);

	useEffect(() => {
		let cancelled = false;
		const startedAt = performance.now();
		const timers: number[] = [];

		setPhases(INITIAL_LOADING_PHASES);
		setData(null);
		setLoadError(null);

		const markDone = (id: LoadingPhaseId) => {
			if (cancelled) return;
			setPhases((current) =>
				current[id] === "done" ? current : { ...current, [id]: "done" },
			);
		};

		const activate = (id: LoadingPhaseId) => {
			if (cancelled) return;
			setPhases((current) =>
				current[id] === "pending" ? { ...current, [id]: "active" } : current,
			);
		};

		// Advance conceptual phases while Authentik work is in flight.
		timers.push(
			window.setTimeout(() => {
				markDone("accounts");
				activate("mitglieder");
			}, LOADING_PHASE_STAGGER_MS),
		);
		timers.push(
			window.setTimeout(() => {
				markDone("mitglieder");
				activate("stages");
			}, LOADING_PHASE_STAGGER_MS * 2),
		);

		void (async () => {
			try {
				const result = await recentPromise;
				if (cancelled) return;

				for (const id of timers) window.clearTimeout(id);

				setPhases({
					accounts: "done",
					mitglieder: "done",
					stages: "done",
				});

				const elapsed = performance.now() - startedAt;
				if (elapsed >= LOADING_THEATRE_MIN_MS) {
					await new Promise((resolve) =>
						window.setTimeout(resolve, LOADING_COMPLETE_HOLD_MS),
					);
					if (cancelled) return;
				}

				setData(result);
			} catch (error) {
				if (!cancelled) setLoadError(error);
			}
		})();

		return () => {
			cancelled = true;
			for (const id of timers) window.clearTimeout(id);
		};
	}, [recentPromise]);

	if (loadError) {
		return (
			<OnboardingErrorView
				error={
					loadError instanceof Error
						? loadError
						: new Error("onboarding_load_failed")
				}
				reset={() => {
					void router.invalidate();
				}}
			/>
		);
	}

	if (!data) {
		return (
			<>
				<OnboardingHeader lead={t("onboarding.leadLive")} />
				<OnboardingSkeleton phases={phases} />
			</>
		);
	}

	return (
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
	);
}
