import {
	Await,
	createFileRoute,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";
import { Loader2, Play } from "lucide-react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { DeleteAccountDialog } from "#/components/offboarding/delete-account-dialog";
import { OffboardingStageTable } from "#/components/offboarding/offboarding-candidates-table";
import { RevokeMitgliederDialog } from "#/components/offboarding/revoke-mitglieder-dialog";
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import {
	type OffboardingCandidate,
	type OffboardingCandidatesResult,
	partitionOffboardingStages,
} from "#/lib/members";
import { listOffboardingCandidatesFn } from "#/lib/members.functions";
import type { OffboardingProcessProgress } from "#/lib/offboarding";
import { planOffboardingProcess } from "#/lib/offboarding";
import {
	deleteAccountFn,
	revokeMitgliederFn,
} from "#/lib/offboarding.functions";
import { requireElevatedUser } from "#/lib/require-app-user";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/offboarding")({
	beforeLoad: ({ context }) => {
		requireElevatedUser(context.user);
	},
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
						<p className="text-sm text-muted-foreground">
							{t("offboarding.process.nothingDue")}
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

function CandidatesSkeleton() {
	const { t } = useI18n();
	return (
		<div className="surface-panel flex min-h-72 items-center justify-center">
			<Spinner label={t("offboarding.candidatesLoading")} />
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
		</>
	);
}

function OffboardingPage() {
	const { candidatesPromise } = Route.useLoaderData();
	const { t } = useI18n();
	const router = useRouter();

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
			<Await
				promise={candidatesPromise}
				fallback={
					<>
						<OffboardingHeader />
						<CandidatesSkeleton />
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
						<CandidatesSections
							data={data}
							onOpenProfile={openProfile}
							onRevoke={openRevoke}
							onDelete={openDelete}
							onProcessDone={refresh}
						/>
					</>
				)}
			</Await>

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
