import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Tooltip } from "#/components/ui/tooltip";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import {
	daysSinceMembershipRevoked,
	isOffboardingLeavingWatchlist,
	type OffboardingCandidate,
	type OffboardingStage,
} from "#/lib/offboarding";
import { cn } from "#/lib/utils";

type OffboardingStageTableProps = {
	stage: OffboardingStage;
	candidates: OffboardingCandidate[];
	onOpenProfile: (id: string) => void;
	onAction: (candidate: OffboardingCandidate) => void;
};

const PAGE_SIZE = 40;

type Translate = (key: MessageKey, vars?: Record<string, string>) => string;

function formatLeaveDate(isoDate: string, locale: string): string {
	const date = new Date(`${isoDate}T12:00:00`);
	if (Number.isNaN(date.getTime())) return isoDate;
	return new Intl.DateTimeFormat(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

function rowMeta(
	candidate: OffboardingCandidate,
	stage: OffboardingStage,
	locale: string,
	t: Translate,
): string {
	if (stage === "delete_account") {
		const days = daysSinceMembershipRevoked(candidate.membershipRevokedAt);
		if (days == null) return "";
		if (days === 0) return t("offboarding.revokedToday");
		if (days === 1) return t("offboarding.revokedOneDayAgo");
		return t("offboarding.revokedDaysAgo", { days: String(days) });
	}

	if (candidate.reasons.includes("not_in_easyverein")) {
		return t("offboarding.reason.not_in_easyverein");
	}

	const date = candidate.easyVereinResignationDate;
	if (!date) {
		return candidate.reasons.includes("left_easyverein")
			? t("offboarding.leaveMissing")
			: "";
	}

	const formatted = formatLeaveDate(date, locale);
	if (isOffboardingLeavingWatchlist(date)) {
		return t("offboarding.leaveOn", { date: formatted });
	}
	return t("offboarding.leftOn", { date: formatted });
}

export function OffboardingStageTable({
	stage,
	candidates,
	onOpenProfile,
	onAction,
}: OffboardingStageTableProps) {
	const { t, locale } = useI18n();
	const [nameFilter, setNameFilter] = useState("");
	const [page, setPage] = useState(0);
	const deferredName = useDeferredValue(nameFilter.trim().toLowerCase());

	const filteredCandidates = useMemo(() => {
		let rows = [...candidates].sort((a, b) =>
			a.name.localeCompare(b.name, "de"),
		);
		if (deferredName) {
			rows = rows.filter((candidate) =>
				candidate.name.toLowerCase().includes(deferredName),
			);
		}
		return rows;
	}, [candidates, deferredName]);

	const pageCount = Math.max(
		1,
		Math.ceil(filteredCandidates.length / PAGE_SIZE),
	);
	const safePage = Math.min(page, pageCount - 1);
	const pageRows = useMemo(() => {
		const start = safePage * PAGE_SIZE;
		return filteredCandidates.slice(start, start + PAGE_SIZE);
	}, [filteredCandidates, safePage]);

	const hasFilters = nameFilter.trim().length > 0;
	const emptyKey =
		stage === "revoke_membership"
			? "offboarding.stage1.empty"
			: "offboarding.stage2.empty";
	const actionLabel =
		stage === "revoke_membership"
			? t("offboarding.action.revoke")
			: t("offboarding.action.delete");

	return (
		<div className="min-w-0 border border-border/60">
			<div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
				<div className="relative min-w-0 flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						value={nameFilter}
						onChange={(event) => {
							setPage(0);
							setNameFilter(event.target.value);
						}}
						placeholder={t("members.searchPlaceholder")}
						aria-label={t("members.searchPlaceholder")}
						className="h-8 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0"
					/>
				</div>
				<span className="shrink-0 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
					{filteredCandidates.length}
				</span>
				{hasFilters ? (
					<Tooltip label={t("members.clearFilters")}>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							onClick={() => {
								setNameFilter("");
								setPage(0);
							}}
							aria-label={t("members.clearFilters")}
						>
							<X className="size-3.5" aria-hidden />
						</Button>
					</Tooltip>
				) : null}
			</div>

			<ul className="divide-y divide-border/50">
				{pageRows.length === 0 ? (
					<li className="px-3 py-10 text-center text-sm text-muted-foreground">
						{candidates.length === 0
							? t(emptyKey)
							: hasFilters
								? t("members.emptyFiltered")
								: t(emptyKey)}
					</li>
				) : (
					pageRows.map((candidate) => {
						const meta = rowMeta(candidate, stage, locale, t);
						const watchlist =
							stage === "revoke_membership" &&
							isOffboardingLeavingWatchlist(
								candidate.easyVereinResignationDate,
							);

						return (
							<li
								key={candidate.id}
								className="group flex items-center gap-2 px-3 py-2.5"
							>
								<button
									type="button"
									onClick={() => onOpenProfile(candidate.id)}
									className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									<span className="block truncate text-sm font-medium text-foreground">
										{candidate.name}
									</span>
									{meta ? (
										<span
											className={cn(
												"mt-0.5 block truncate text-xs text-muted-foreground",
												watchlist && "italic",
											)}
										>
											{meta}
										</span>
									) : null}
								</button>
								<Button
									type="button"
									size="sm"
									variant={
										stage === "revoke_membership" ? "outline" : "destructive"
									}
									disabled={watchlist}
									title={
										watchlist
											? t("offboarding.action.revokeWatchlist")
											: undefined
									}
									aria-label={`${actionLabel}: ${candidate.name}`}
									onClick={() => onAction(candidate)}
									className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
								>
									{actionLabel}
								</Button>
							</li>
						);
					})
				)}
			</ul>

			{filteredCandidates.length > PAGE_SIZE ? (
				<div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
					<span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
						{safePage + 1}/{pageCount}
					</span>
					<div className="flex items-center gap-1">
						<Tooltip label={t("offboarding.candidatesPrev")}>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={safePage <= 0}
								onClick={() => setPage((current) => Math.max(0, current - 1))}
								aria-label={t("offboarding.candidatesPrev")}
							>
								<ChevronLeft className="size-4" aria-hidden />
							</Button>
						</Tooltip>
						<Tooltip label={t("offboarding.candidatesNext")}>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								disabled={safePage >= pageCount - 1}
								onClick={() =>
									setPage((current) => Math.min(pageCount - 1, current + 1))
								}
								aria-label={t("offboarding.candidatesNext")}
							>
								<ChevronRight className="size-4" aria-hidden />
							</Button>
						</Tooltip>
					</div>
				</div>
			) : null}
		</div>
	);
}
