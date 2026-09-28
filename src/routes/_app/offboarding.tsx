import {
	createFileRoute,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";
import { Check, Loader2, Play } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { PageHeader } from "#/components/layout/page-header";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { DeleteAccountDialog } from "#/components/offboarding/delete-account-dialog";
import { OffboardingStageTable } from "#/components/offboarding/offboarding-candidates-table";
import { RevokeMitgliederDialog } from "#/components/offboarding/revoke-mitglieder-dialog";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { OffboardingProcessProgress } from "#/lib/offboarding";
import {
	type OffboardingCandidate,
	type OffboardingCandidatesResult,
	partitionOffboardingStages,
	planOffboardingProcess,
} from "#/lib/offboarding";
import {
	deleteAccountFn,
	listOffboardingCandidatesFn,
	revokeMitgliederFn,
	warmOffboardingAuthentikFn,
	warmOffboardingEasyVereinFn,
} from "#/lib/offboarding.functions";
import { requireElevatedUser } from "#/lib/require-app-user";
import { cn } from "#/lib/utils";

/** Brief pause after the last real phase so completed checks are visible. */
const LOADING_COMPLETE_HOLD_MS = 400;
/** Skip the step theatre when caches are warm and everything resolves instantly. */
const LOADING_THEATRE_MIN_MS = 450;

export const Route = createFileRoute("/_app/offboarding")({
	beforeLoad: ({ context }) => {
		requireElevatedUser(context.user);
	},
	loader: () => {
		// Start EasyVerein + Authentik in parallel; advance UI as each settles.
		// EasyVerein is listed first in the loading theatre (usually finishes sooner).
		const easyVereinPromise = warmOffboardingEasyVereinFn();
		const authentikPromise = warmOffboardingAuthentikFn();
		const candidatesPromise = Promise.all([
			easyVereinPromise,
			authentikPromise,
		]).then(() => listOffboardingCandidatesFn());
		return { easyVereinPromise, authentikPromise, candidatesPromise };
	},
	staleTime: 30_000,
	preloadStaleTime: 30_000,
	errorComponent: OffboardingError,
	component: OffboardingPage,
});

function OffboardingHeader({ meta }: { meta?: string }) {
	const { t } = useI18n();
	return (
		<PageHeader
			eyebrow={t("offboarding.eyebrow")}
			title={t("offboarding.title")}
			lead={t("offboarding.leadLive")}
			end={meta ? <p className="page-meta m-0">{meta}</p> : undefined}
		/>
	);
}

function ProcessPanel({
	graceDays,
	revokeCandidates,
	deleteCandidates,
	running,
	progress,
	onStart,
}: {
	graceDays: number;
	revokeCandidates: OffboardingCandidate[];
	deleteCandidates: OffboardingCandidate[];
	running: boolean;
	progress: OffboardingProcessProgress | null;
	onStart: () => void;
}) {
	const { t } = useI18n();
	const plan = useMemo(
		() => planOffboardingProcess(revokeCandidates, deleteCandidates, graceDays),
		[revokeCandidates, deleteCandidates, graceDays],
	);
	const dueTotal = plan.toRevoke.length + plan.toDelete.length;
	const percent =
		progress && progress.total > 0
			? Math.round((progress.done / progress.total) * 100)
			: 0;
	const leaving = plan.skippedLeaving;
	const grace = plan.waitingGrace;
	const nothingDue =
		leaving > 0 && grace > 0
			? {
					text: t("offboarding.process.nothingDue.both", {
						leaving: String(leaving),
						grace: String(grace),
						days: String(graceDays),
					}),
					tone: "waiting" as const,
				}
			: leaving > 0
				? {
						text: t("offboarding.process.nothingDue.leaving", {
							count: String(leaving),
						}),
						tone: "waiting" as const,
					}
				: grace > 0
					? {
							text: t("offboarding.process.nothingDue.grace", {
								count: String(grace),
								days: String(graceDays),
							}),
							tone: "waiting" as const,
						}
					: {
							text: t("offboarding.process.nothingDue.empty"),
							tone: "empty" as const,
						};

	return (
		<section className="surface-panel flex flex-col gap-4 p-5 sm:p-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0 space-y-1">
					<h2 className="text-base font-semibold tracking-tight">
						{t("offboarding.process.title")}
					</h2>
					<p className="max-w-xl text-sm text-muted-foreground text-pretty">
						{t("offboarding.process.lead", { days: String(graceDays) })}
					</p>
					{!running && dueTotal === 0 ? (
						<p
							className={
								nothingDue.tone === "waiting"
									? "text-sm font-medium text-foreground"
									: "text-sm text-muted-foreground"
							}
						>
							{nothingDue.text}
						</p>
					) : null}
				</div>
				<Button
					type="button"
					size="lg"
					disabled={running || dueTotal === 0}
					onClick={onStart}
					className="shrink-0"
				>
					{running ? (
						<>
							<Loader2 className="size-4 animate-spin" aria-hidden />
							{t("offboarding.process.running")}
						</>
					) : (
						<>
							<Play className="size-4" aria-hidden />
							{t("offboarding.process.button")}
						</>
					)}
				</Button>
			</div>

			{progress ? (
				<div className="space-y-3" aria-live="polite">
					<div className="h-2 w-full overflow-hidden border border-border bg-muted">
						<div
							className="h-full bg-primary transition-[width] duration-300 ease-out"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<p className="font-mono text-xs font-semibold tracking-[0.1em] text-muted-foreground uppercase">
							{progress.phase === "revoke"
								? t("offboarding.process.phaseRevoke")
								: progress.phase === "delete"
									? t("offboarding.process.phaseDelete")
									: t("offboarding.process.result", {
											revoked: String(progress.revoked),
											deleted: String(progress.deleted),
											skipped: String(progress.skippedLeaving),
											errors: String(progress.errors),
										})}
						</p>
						{progress.phase !== "done" ? (
							<p className="font-mono text-xs tabular-nums text-muted-foreground">
								{t("offboarding.process.progressCount", {
									done: String(progress.done),
									total: String(progress.total),
								})}
							</p>
						) : null}
					</div>
					{progress.phase !== "done" && progress.currentName ? (
						<p className="text-sm font-medium text-foreground">
							{t("offboarding.process.current", {
								name: progress.currentName,
							})}
						</p>
					) : null}
					{progress.phase !== "done" ? (
						<p className="text-sm tabular-nums text-muted-foreground">
							{t("offboarding.process.counts", {
								revoked: String(progress.revoked),
								revokeTotal: String(progress.revokeTotal),
								deleted: String(progress.deleted),
								deleteTotal: String(progress.deleteTotal),
								errors: String(progress.errors),
							})}
						</p>
					) : null}
				</div>
			) : null}
		</section>
	);
}

function StageSection({
	stage,
	count,
	children,
}: {
	stage: 1 | 2;
	count: number;
	children: ReactNode;
}) {
	const { t } = useI18n();
	const titleKey =
		stage === 1
			? "offboarding.stage1.listTitle"
			: "offboarding.stage2.listTitle";

	return (
		<section className="min-w-0 space-y-2">
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-sm font-semibold tracking-tight text-foreground">
					{t(titleKey)}
				</h2>
				<span className="font-mono text-xs tabular-nums text-muted-foreground">
					{count}
				</span>
			</div>
			{children}
		</section>
	);
}

/** Real load phases - EasyVerein + Authentik run in parallel; assemble after both. */
const LOADING_PHASES = [
	{ id: "easyVerein", key: "offboarding.loadingStepEasyVerein" },
	{ id: "authentik", key: "offboarding.loadingStepAuthentik" },
	{ id: "candidates", key: "offboarding.loadingStepCandidates" },
] as const satisfies ReadonlyArray<{ id: string; key: MessageKey }>;

type LoadingPhaseId = (typeof LOADING_PHASES)[number]["id"];
type PhaseStatus = "pending" | "active" | "done";
type LoadingPhases = Record<LoadingPhaseId, PhaseStatus>;

const INITIAL_LOADING_PHASES: LoadingPhases = {
	easyVerein: "active",
	authentik: "active",
	candidates: "pending",
};

function StageTableSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="min-w-0 border border-border/60" aria-hidden>
			<div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
				<div className="h-8 min-w-0 flex-1 animate-pulse bg-muted" />
				<div className="h-3 w-6 shrink-0 animate-pulse bg-muted" />
			</div>
			<ul className="divide-y divide-border/50">
				{Array.from({ length: rows }, (_, i) => (
					<li
						key={`offboarding-skel-${String(i)}`}
						className="flex items-center gap-3 px-3 py-3"
					>
						<div className="min-w-0 flex-1 space-y-2">
							<div className="h-3.5 w-36 max-w-full animate-pulse bg-muted" />
							<div className="h-3 w-24 max-w-full animate-pulse bg-muted" />
						</div>
						<div className="h-8 w-8 shrink-0 animate-pulse bg-muted" />
					</li>
				))}
			</ul>
		</div>
	);
}

function CandidatesLoadingStatus({ phases }: { phases: LoadingPhases }) {
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
			aria-label={t("offboarding.candidatesLoading")}
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
				{t("offboarding.loadingHint")}
			</p>
		</section>
	);
}

function CandidatesSkeleton({ phases }: { phases: LoadingPhases }) {
	return (
		<div className="space-y-8" aria-busy="true">
			<CandidatesLoadingStatus phases={phases} />

			<div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-6">
				<section className="min-w-0 space-y-2">
					<div
						className="flex items-baseline justify-between gap-3"
						aria-hidden
					>
						<div className="h-4 w-36 animate-pulse bg-muted" />
						<div className="h-3 w-6 animate-pulse bg-muted" />
					</div>
					<StageTableSkeleton />
				</section>
				<section className="min-w-0 space-y-2">
					<div
						className="flex items-baseline justify-between gap-3"
						aria-hidden
					>
						<div className="h-4 w-40 animate-pulse bg-muted" />
						<div className="h-3 w-6 animate-pulse bg-muted" />
					</div>
					<StageTableSkeleton />
				</section>
			</div>
		</div>
	);
}

function CandidatesSections({
	data,
	onOpenProfile,
	onRevoke,
	onDelete,
	onProcessDone,
}: {
	data: OffboardingCandidatesResult;
	onOpenProfile: (id: string) => void;
	onRevoke: (candidate: OffboardingCandidate) => void;
	onDelete: (candidate: OffboardingCandidate) => void;
	onProcessDone: () => void;
}) {
	const { t } = useI18n();
	const graceDays = data.deleteGraceDays ?? 14;

	const [members, setMembers] = useState(data.members);
	const [running, setRunning] = useState(false);
	const [progress, setProgress] = useState<OffboardingProcessProgress | null>(
		null,
	);

	useEffect(() => {
		if (!running) setMembers(data.members);
	}, [data.members, running]);

	const stages = useMemo(() => partitionOffboardingStages(members), [members]);

	const markRevoked = useCallback((id: string) => {
		setMembers((current) =>
			current.map((member) =>
				member.id === id
					? {
							...member,
							membershipRevokedAt: new Date().toISOString(),
							reasons: ["membership_revoked"],
							easyVereinResignationDate: undefined,
						}
					: member,
			),
		);
	}, []);

	const markDeleted = useCallback((id: string) => {
		setMembers((current) => current.filter((member) => member.id !== id));
	}, []);

	const runProcess = useCallback(async () => {
		const plan = planOffboardingProcess(
			stages.revokeMembership,
			stages.deleteAccount,
			graceDays,
		);
		const total = plan.toRevoke.length + plan.toDelete.length;
		if (total === 0) return;

		if (
			typeof window !== "undefined" &&
			!window.confirm(t("offboarding.process.confirm"))
		) {
			return;
		}

		setRunning(true);
		const next: OffboardingProcessProgress = {
			phase: plan.toRevoke.length > 0 ? "revoke" : "delete",
			currentName: null,
			done: 0,
			total,
			revoked: 0,
			revokeTotal: plan.toRevoke.length,
			deleted: 0,
			deleteTotal: plan.toDelete.length,
			errors: 0,
			skippedLeaving: plan.skippedLeaving,
		};
		setProgress({ ...next });

		for (const candidate of plan.toRevoke) {
			next.phase = "revoke";
			next.currentName = candidate.name;
			setProgress({ ...next });
			try {
				const result = await revokeMitgliederFn({
					data: { memberId: candidate.id },
				});
				if (result.success) {
					next.revoked += 1;
					markRevoked(candidate.id);
				} else {
					next.errors += 1;
				}
			} catch {
				next.errors += 1;
			}
			next.done += 1;
			setProgress({ ...next });
		}

		for (const candidate of plan.toDelete) {
			next.phase = "delete";
			next.currentName = candidate.name;
			setProgress({ ...next });
			try {
				const result = await deleteAccountFn({
					data: { memberId: candidate.id },
				});
				if (result.success) {
					next.deleted += 1;
					markDeleted(candidate.id);
				} else {
					next.errors += 1;
				}
			} catch {
				next.errors += 1;
			}
			next.done += 1;
			setProgress({ ...next });
		}

		next.phase = "done";
		next.currentName = null;
		setProgress({ ...next });
		setRunning(false);
		onProcessDone();
	}, [
		stages.revokeMembership,
		stages.deleteAccount,
		graceDays,
		t,
		markRevoked,
		markDeleted,
		onProcessDone,
	]);

	return (
		<div className="space-y-8">
			{data.source === "mock" ? (
				<p className="hint m-0">{t("members.mockHint")}</p>
			) : null}

			<ProcessPanel
				graceDays={graceDays}
				revokeCandidates={stages.revokeMembership}
				deleteCandidates={stages.deleteAccount}
				running={running}
				progress={progress}
				onStart={() => void runProcess()}
			/>

			<div
				className={cn(
					"grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-6",
					running && "pointer-events-none opacity-70",
				)}
			>
				<StageSection stage={1} count={stages.revokeMembership.length}>
					<OffboardingStageTable
						stage="revoke_membership"
						candidates={stages.revokeMembership}
						onOpenProfile={onOpenProfile}
						onAction={onRevoke}
					/>
				</StageSection>

				<StageSection stage={2} count={stages.deleteAccount.length}>
					<OffboardingStageTable
						stage="delete_account"
						candidates={stages.deleteAccount}
						onOpenProfile={onOpenProfile}
						onAction={onDelete}
					/>
				</StageSection>
			</div>
		</div>
	);
}

/** Shared error UI - do not reuse the route `errorComponent` in the page (breaks tsr-split). */
function OffboardingErrorView({ error, reset }: ErrorComponentProps) {
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
		</>
	);
}

function OffboardingError(props: ErrorComponentProps) {
	return <OffboardingErrorView {...props} />;
}

function OffboardingPage() {
	const { easyVereinPromise, authentikPromise, candidatesPromise } =
		Route.useLoaderData();
	const { t } = useI18n();
	const router = useRouter();

	const [phases, setPhases] = useState<LoadingPhases>(INITIAL_LOADING_PHASES);
	const [data, setData] = useState<OffboardingCandidatesResult | null>(null);
	const [loadError, setLoadError] = useState<unknown>(null);

	const [profileId, setProfileId] = useState<string | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);

	const [revokeTarget, setRevokeTarget] = useState<OffboardingCandidate | null>(
		null,
	);
	const [revokeOpen, setRevokeOpen] = useState(false);

	const [deleteTarget, setDeleteTarget] = useState<OffboardingCandidate | null>(
		null,
	);
	const [deleteOpen, setDeleteOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;
		const startedAt = performance.now();

		setPhases(INITIAL_LOADING_PHASES);
		setData(null);
		setLoadError(null);

		const markDone = (id: LoadingPhaseId) => {
			if (cancelled) return;
			setPhases((current) =>
				current[id] === "done" ? current : { ...current, [id]: "done" },
			);
		};

		void (async () => {
			try {
				// EasyVerein + Authentik warm in parallel; either may finish first.
				await Promise.all([
					easyVereinPromise.then(() => markDone("easyVerein")),
					authentikPromise.then(() => markDone("authentik")),
				]);
				if (cancelled) return;

				setPhases((current) => ({ ...current, candidates: "active" }));
				const result = await candidatesPromise;
				if (cancelled) return;
				markDone("candidates");

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
		};
	}, [easyVereinPromise, authentikPromise, candidatesPromise]);

	const openProfile = useCallback((id: string) => {
		setProfileId(id);
		setProfileOpen(true);
	}, []);

	const openRevoke = useCallback((candidate: OffboardingCandidate) => {
		setRevokeTarget(candidate);
		setRevokeOpen(true);
	}, []);

	const openDelete = useCallback((candidate: OffboardingCandidate) => {
		setDeleteTarget(candidate);
		setDeleteOpen(true);
	}, []);

	const refresh = useCallback(() => {
		void router.invalidate();
	}, [router]);

	return (
		<>
			{loadError ? (
				<OffboardingErrorView
					error={
						loadError instanceof Error
							? loadError
							: new Error("offboarding_load_failed")
					}
					reset={refresh}
				/>
			) : data ? (
				<>
					<OffboardingHeader
						meta={t("offboarding.candidatesCount", {
							count: String(data.members.length),
						})}
					/>
					<CandidatesSections
						data={data}
						onOpenProfile={openProfile}
						onRevoke={openRevoke}
						onDelete={openDelete}
						onProcessDone={refresh}
					/>
				</>
			) : (
				<>
					<OffboardingHeader />
					<CandidatesSkeleton phases={phases} />
				</>
			)}

			<MemberProfileSheet
				memberId={profileId}
				open={profileOpen}
				onOpenChange={setProfileOpen}
			/>
			<RevokeMitgliederDialog
				candidate={revokeTarget}
				open={revokeOpen}
				onOpenChange={setRevokeOpen}
				onDone={refresh}
			/>
			<DeleteAccountDialog
				candidate={deleteTarget}
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				onDone={refresh}
			/>
		</>
	);
}
