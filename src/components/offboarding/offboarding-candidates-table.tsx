import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	ChevronLeft,
	ChevronRight,
	Search,
	X,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	groupBadgeVariant,
	ressortLabelKey,
	sortGroupsForDisplay,
} from "#/lib/groups";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import {
	OFFBOARDING_REASONS,
	type OffboardingCandidate,
	type OffboardingReason,
} from "#/lib/members";
import { cn } from "#/lib/utils";

type OffboardingCandidatesTableProps = {
	candidates: OffboardingCandidate[];
	onOpenProfile: (id: string) => void;
};

const REASON_MESSAGE_KEYS: Record<OffboardingReason, MessageKey> = {
	missing_mitglieder: "offboarding.reason.missing_mitglieder",
	not_in_easyverein: "offboarding.reason.not_in_easyverein",
};

const PAGE_SIZE = 50;

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function OffboardingCandidatesTable({
	candidates,
	onOpenProfile,
}: OffboardingCandidatesTableProps) {
	const { t } = useI18n();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "name", desc: false },
	]);
	const [nameFilter, setNameFilter] = useState("");
	const [selectedReasons, setSelectedReasons] = useState<OffboardingReason[]>(
		[],
	);
	const [page, setPage] = useState(0);

	const deferredName = useDeferredValue(nameFilter.trim().toLowerCase());

	const reasonCounts = useMemo(() => {
		const counts = new Map<OffboardingReason, number>();
		for (const reason of OFFBOARDING_REASONS) counts.set(reason, 0);
		for (const candidate of candidates) {
			for (const reason of candidate.reasons) {
				counts.set(reason, (counts.get(reason) ?? 0) + 1);
			}
		}
		return counts;
	}, [candidates]);

	const filteredCandidates = useMemo(() => {
		let rows = candidates;

		if (selectedReasons.length > 0) {
			rows = rows.filter((candidate) =>
				selectedReasons.some((reason) => candidate.reasons.includes(reason)),
			);
		}

		if (deferredName) {
			rows = rows.filter((candidate) =>
				candidate.name.toLowerCase().includes(deferredName),
			);
		}

		const sort = sorting[0];
		if (sort) {
			const dir = sort.desc ? -1 : 1;
			rows = [...rows].sort((a, b) => {
				if (sort.id === "reasons") {
					return (
						a.reasons.join(",").localeCompare(b.reasons.join(","), "de") * dir
					);
				}
				if (sort.id === "groups") {
					return (
						a.groups.join(",").localeCompare(b.groups.join(","), "de") * dir
					);
				}
				return a.name.localeCompare(b.name, "de") * dir;
			});
		}

		return rows;
	}, [candidates, selectedReasons, deferredName, sorting]);

	const pageCount = Math.max(
		1,
		Math.ceil(filteredCandidates.length / PAGE_SIZE),
	);
	const safePage = Math.min(page, pageCount - 1);
	const pageRows = useMemo(() => {
		const start = safePage * PAGE_SIZE;
		return filteredCandidates.slice(start, start + PAGE_SIZE);
	}, [filteredCandidates, safePage]);

	function toggleReason(reason: OffboardingReason) {
		setPage(0);
		setSelectedReasons((current) =>
			current.includes(reason)
				? current.filter((entry) => entry !== reason)
				: [...current, reason],
		);
	}

	function onNameChange(value: string) {
		setPage(0);
		setNameFilter(value);
	}

	const columns = useMemo<ColumnDef<OffboardingCandidate>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("members.colName"),
				enableSorting: true,
				cell: ({ row }) => (
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							onOpenProfile(row.original.id);
						}}
						className="flex min-w-0 max-w-full items-center gap-3 text-left transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<span
							aria-hidden
							className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground"
						>
							{initials(row.original.name)}
						</span>
						<span className="truncate font-medium text-foreground">
							{row.original.name}
						</span>
					</button>
				),
			},
			{
				id: "reasons",
				accessorFn: (row) => row.reasons.join(", "),
				header: t("offboarding.colReason"),
				enableSorting: true,
				cell: ({ row }) => (
					<div className="flex flex-wrap gap-1.5">
						{row.original.reasons.map((reason) => (
							<Badge key={reason} variant="destructive">
								{t(REASON_MESSAGE_KEYS[reason])}
							</Badge>
						))}
					</div>
				),
			},
			{
				id: "groups",
				accessorFn: (row) => row.groups.join(", "),
				header: t("members.colGroups"),
				enableSorting: true,
				cell: ({ row }) => {
					const groups = sortGroupsForDisplay(row.original.groups);
					if (groups.length === 0) {
						return (
							<span className="text-muted-foreground">
								{t("offboarding.noGroups")}
							</span>
						);
					}
					return (
						<div className="flex flex-wrap gap-1.5">
							{groups.map((group) => {
								const labelKey = ressortLabelKey(group);
								return (
									<Badge key={group} variant={groupBadgeVariant(group)}>
										{labelKey ? t(labelKey) : group}
									</Badge>
								);
							})}
						</div>
					);
				},
			},
		],
		[t, onOpenProfile],
	);

	const table = useReactTable({
		data: pageRows,
		columns,
		state: { sorting },
		onSortingChange: (updater) => {
			setPage(0);
			setSorting(updater);
		},
		getCoreRowModel: getCoreRowModel(),
		manualFiltering: true,
		manualPagination: true,
		manualSorting: true,
		pageCount,
	});

	const hasFilters = selectedReasons.length > 0 || nameFilter.trim().length > 0;
	const rangeStart =
		filteredCandidates.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
	const rangeEnd = Math.min(
		(safePage + 1) * PAGE_SIZE,
		filteredCandidates.length,
	);

	return (
		<div className="surface-panel min-w-0 overflow-hidden">
			<div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
				<div className="flex flex-col gap-2">
					<p className="text-xs font-medium text-muted-foreground">
						{t("offboarding.filterReasons")}
					</p>
					<div className="flex flex-wrap gap-2">
						{OFFBOARDING_REASONS.map((reason) => {
							const active = selectedReasons.includes(reason);
							const count = reasonCounts.get(reason) ?? 0;
							return (
								<button
									key={reason}
									type="button"
									onClick={() => toggleReason(reason)}
									aria-pressed={active}
									className={cn(
										"inline-flex items-center gap-2 border px-2.5 py-1.5 text-sm transition-colors",
										active
											? "border-border bg-muted font-medium text-foreground"
											: "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
									)}
								>
									<span>{t(REASON_MESSAGE_KEYS[reason])}</span>
									<span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
										{count}
									</span>
								</button>
							);
						})}
						{hasFilters ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setSelectedReasons([]);
									setNameFilter("");
									setPage(0);
								}}
							>
								<X className="size-3.5" aria-hidden />
								{t("members.clearFilters")}
							</Button>
						) : null}
					</div>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="relative w-full max-w-md">
						<Search
							className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<Input
							data-shortcut="search"
							value={nameFilter}
							onChange={(event) => onNameChange(event.target.value)}
							placeholder={t("members.searchPlaceholder")}
							aria-label={t("members.searchPlaceholder")}
							className="pl-9"
						/>
					</div>
					<p className="shrink-0 text-sm text-muted-foreground tabular-nums">
						{t("offboarding.candidatesShowing", {
							filtered: String(filteredCandidates.length),
							total: String(candidates.length),
						})}
					</p>
				</div>
			</div>

			<div className="w-full min-w-0 overflow-x-auto">
				<table className="w-full min-w-[40rem] border-collapse text-left">
					<thead className="sticky top-0 z-10 bg-card">
						{table.getHeaderGroups().map((headerGroup) => (
							<tr key={headerGroup.id} className="border-b border-border">
								{headerGroup.headers.map((header) => {
									const sorted = header.column.getIsSorted();
									const widthClass =
										header.column.id === "name"
											? "w-[32%]"
											: header.column.id === "reasons"
												? "w-[28%]"
												: "w-[40%]";
									return (
										<th
											key={header.id}
											className={cn(
												"bg-muted/45 px-4 py-3 text-left text-[0.7rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase sm:px-5",
												widthClass,
											)}
										>
											{header.isPlaceholder ? null : header.column.getCanSort() ? (
												<button
													type="button"
													className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
													onClick={header.column.getToggleSortingHandler()}
												>
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
													{sorted === "asc" ? (
														<ArrowUp className="size-3.5" aria-hidden />
													) : sorted === "desc" ? (
														<ArrowDown className="size-3.5" aria-hidden />
													) : (
														<ArrowUpDown
															className="size-3.5 opacity-40"
															aria-hidden
														/>
													)}
												</button>
											) : (
												flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)
											)}
										</th>
									);
								})}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-4 py-16 text-center text-sm text-muted-foreground sm:px-5"
								>
									{candidates.length === 0
										? t("offboarding.candidatesEmpty")
										: hasFilters
											? t("members.emptyFiltered")
											: t("offboarding.candidatesEmpty")}
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row, index) => (
								<tr
									key={row.original.id}
									onClick={() => onOpenProfile(row.original.id)}
									className={cn(
										"cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-primary/[0.04]",
										index % 2 === 1 && "bg-muted/20",
									)}
								>
									{row.getVisibleCells().map((cell) => (
										<td
											key={cell.id}
											className="px-4 py-3.5 align-middle text-sm sm:px-5"
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									))}
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>

			{filteredCandidates.length > PAGE_SIZE ? (
				<div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5">
					<p className="text-sm text-muted-foreground tabular-nums">
						{t("offboarding.candidatesPage", {
							from: String(rangeStart),
							to: String(rangeEnd),
							total: String(filteredCandidates.length),
						})}
					</p>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={safePage <= 0}
							onClick={() => setPage((current) => Math.max(0, current - 1))}
							aria-label={t("offboarding.candidatesPrev")}
						>
							<ChevronLeft className="size-4" aria-hidden />
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							disabled={safePage >= pageCount - 1}
							onClick={() =>
								setPage((current) => Math.min(pageCount - 1, current + 1))
							}
							aria-label={t("offboarding.candidatesNext")}
						>
							<ChevronRight className="size-4" aria-hidden />
						</Button>
					</div>
				</div>
			) : null}
		</div>
	);
}
