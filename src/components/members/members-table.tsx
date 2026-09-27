import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Filter,
	Search,
	X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
	groupBadgeVariant,
	isRessortGroup,
	ressortLabelKey,
	sortGroupsForDisplay,
} from "#/lib/groups";
import { useI18n } from "#/lib/i18n/locale-context";
import type { Member } from "#/lib/members";
import { cn } from "#/lib/utils";

type MembersTableProps = {
	members: Member[];
	availableGroups: string[];
};

type GroupMatchMode = "any" | "all";

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export function MembersTable({ members, availableGroups }: MembersTableProps) {
	const { t } = useI18n();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "name", desc: false },
	]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
	const [matchMode, setMatchMode] = useState<GroupMatchMode>("any");
	const [groupQuery, setGroupQuery] = useState("");
	const [profileId, setProfileId] = useState<string | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);

	const openProfile = useCallback((id: string) => {
		setProfileId(id);
		setProfileOpen(true);
	}, []);

	const handleProfileOpenChange = useCallback((open: boolean) => {
		setProfileOpen(open);
		if (!open) setProfileId(null);
	}, []);

	const groupCounts = useMemo(() => {
		const counts = new Map<string, number>();
		for (const member of members) {
			for (const group of member.groups) {
				counts.set(group, (counts.get(group) ?? 0) + 1);
			}
		}
		return counts;
	}, [members]);

	const visibleGroups = useMemo(() => {
		const q = groupQuery.trim().toLowerCase();
		const base = q
			? availableGroups.filter((group) => group.toLowerCase().includes(q))
			: availableGroups;
		return sortGroupsForDisplay(base);
	}, [availableGroups, groupQuery]);

	const columns = useMemo<ColumnDef<Member>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("members.colName"),
				cell: ({ row }) => (
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							openProfile(row.original.id);
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
				id: "groups",
				accessorFn: (row) => row.groups.join(", "),
				header: t("members.colGroups"),
				cell: ({ row }) => {
					const groups = sortGroupsForDisplay(row.original.groups);
					if (groups.length === 0) {
						return (
							<span className="text-muted-foreground">{t("home.empty")}</span>
						);
					}
					return (
						<div className="flex flex-wrap gap-1.5">
							{groups.map((group) => {
								const labelKey = ressortLabelKey(group);
								return (
									<Badge
										key={group}
										variant={groupBadgeVariant(group)}
										className={cn(isRessortGroup(group) && "font-semibold")}
									>
										{labelKey ? t(labelKey) : group}
									</Badge>
								);
							})}
						</div>
					);
				},
				sortingFn: (a, b) =>
					a.original.groups
						.join(",")
						.localeCompare(b.original.groups.join(","), "de"),
				filterFn: (
					row,
					_id,
					filterValue: { groups: string[]; mode: GroupMatchMode },
				) => {
					const groups = filterValue?.groups ?? [];
					if (!groups.length) return true;
					const memberGroups = row.original.groups;
					if (filterValue.mode === "all") {
						return groups.every((group) => memberGroups.includes(group));
					}
					return groups.some((group) => memberGroups.includes(group));
				},
			},
		],
		[t, openProfile],
	);

	const table = useReactTable({
		data: members,
		columns,
		state: { sorting, columnFilters },
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const nameFilter =
		(table.getColumn("name")?.getFilterValue() as string | undefined) ?? "";

	function applyGroupFilter(nextGroups: string[], nextMode: GroupMatchMode) {
		table
			.getColumn("groups")
			?.setFilterValue(
				nextGroups.length ? { groups: nextGroups, mode: nextMode } : undefined,
			);
	}

	function toggleGroup(group: string) {
		setSelectedGroups((current) => {
			const next = current.includes(group)
				? current.filter((g) => g !== group)
				: [...current, group];
			applyGroupFilter(next, matchMode);
			return next;
		});
	}

	function setMode(nextMode: GroupMatchMode) {
		setMatchMode(nextMode);
		applyGroupFilter(selectedGroups, nextMode);
	}

	function clearFilters() {
		setSelectedGroups([]);
		setGroupQuery("");
		table.resetColumnFilters();
	}

	const filteredCount = table.getFilteredRowModel().rows.length;
	const hasFilters = Boolean(nameFilter) || selectedGroups.length > 0;

	return (
		<>
			<div className="members-workspace grid w-full min-w-0 gap-4 xl:grid-cols-[minmax(17rem,19rem)_minmax(0,1fr)] xl:items-start">
				<aside className="surface-panel flex flex-col xl:sticky xl:top-6">
					<div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
						<div className="flex items-center gap-2">
							<Filter className="size-4 text-primary" aria-hidden />
							<p className="text-sm font-semibold tracking-tight">
								{t("members.filterTitle")}
							</p>
						</div>
						{hasFilters ? (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="h-7 px-2 text-xs"
							>
								<X className="size-3.5" aria-hidden />
								{t("members.clearFilters")}
							</Button>
						) : null}
					</div>

					<div className="flex flex-col gap-5 p-4">
						<div className="space-y-2">
							<label
								htmlFor="members-search"
								className="text-xs font-medium text-muted-foreground"
							>
								{t("members.colName")}
							</label>
							<div className="relative">
								<Search
									className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
									aria-hidden
								/>
								<Input
									id="members-search"
									data-shortcut="search"
									value={nameFilter}
									onChange={(event) =>
										table.getColumn("name")?.setFilterValue(event.target.value)
									}
									placeholder={t("members.searchPlaceholder")}
									aria-label={t("members.searchPlaceholder")}
									className="pl-9"
								/>
							</div>
						</div>

						{availableGroups.length > 0 ? (
							<div className="space-y-3">
								<div className="flex items-center justify-between gap-2">
									<p className="text-xs font-medium text-muted-foreground">
										{t("members.filterGroups")}
									</p>
									<fieldset
										className="m-0 inline-flex min-w-0 border border-border bg-background p-0.5"
										aria-label={t("members.filterMatchHint")}
									>
										{(["any", "all"] as const).map((mode) => (
											<button
												key={mode}
												type="button"
												onClick={() => setMode(mode)}
												className={cn(
													"px-2 py-1 text-[0.7rem] font-medium transition-colors",
													matchMode === mode
														? "bg-foreground text-background"
														: "text-muted-foreground hover:text-foreground",
												)}
											>
												{mode === "any"
													? t("members.filterMatchAny")
													: t("members.filterMatchAll")}
											</button>
										))}
									</fieldset>
								</div>

								{availableGroups.length > 8 ? (
									<Input
										value={groupQuery}
										onChange={(event) => setGroupQuery(event.target.value)}
										placeholder={`${t("members.filterGroups")}…`}
										aria-label={t("members.filterGroups")}
										className="h-9"
									/>
								) : null}

								<ul className="flex max-h-[min(28rem,55vh)] flex-col gap-0.5 overflow-y-auto pr-1">
									{visibleGroups.map((group) => {
										const active = selectedGroups.includes(group);
										const count = groupCounts.get(group) ?? 0;
										const labelKey = ressortLabelKey(group);
										const isRessort = isRessortGroup(group);
										return (
											<li key={group}>
												<button
													type="button"
													onClick={() => toggleGroup(group)}
													aria-pressed={active}
													className={cn(
														"flex w-full items-center gap-2.5 border px-2.5 py-2 text-left text-sm transition-colors",
														active
															? "border-border bg-muted/70 text-foreground"
															: "border-transparent hover:border-border hover:bg-muted/60",
													)}
												>
													<span
														aria-hidden
														className={cn(
															"flex size-4 shrink-0 items-center justify-center border",
															active
																? "border-primary bg-primary text-primary-foreground"
																: "border-border bg-background",
														)}
													>
														{active ? (
															<svg
																viewBox="0 0 12 12"
																className="size-2.5"
																fill="none"
																aria-hidden
															>
																<title>Selected</title>
																<path
																	d="M2.5 6.2 4.8 8.5 9.5 3.5"
																	stroke="currentColor"
																	strokeWidth="1.8"
																	strokeLinecap="square"
																/>
															</svg>
														) : null}
													</span>
													<span
														className={cn(
															"min-w-0 flex-1 truncate",
															isRessort && "font-medium",
														)}
													>
														{labelKey ? t(labelKey) : group}
													</span>
													<span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
														{count}
													</span>
												</button>
											</li>
										);
									})}
									{visibleGroups.length === 0 ? (
										<li className="px-1 py-3 text-sm text-muted-foreground">
											{t("members.emptyFiltered")}
										</li>
									) : null}
								</ul>
							</div>
						) : null}
					</div>
				</aside>

				<section className="surface-panel min-w-0 overflow-hidden">
					<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
						<p className="text-sm text-muted-foreground tabular-nums">
							{t("members.showing", {
								filtered: String(filteredCount),
								total: String(members.length),
							})}
						</p>
						{selectedGroups.length > 0 ? (
							<div className="flex max-w-full flex-wrap gap-1.5">
								{selectedGroups.map((group) => {
									const labelKey = ressortLabelKey(group);
									return (
										<button
											key={group}
											type="button"
											onClick={() => toggleGroup(group)}
											className="inline-flex items-center gap-1 border border-primary/30 bg-primary/10 px-2 py-0.5 text-[0.7rem] font-medium text-primary transition-colors hover:bg-primary/15"
										>
											{labelKey ? t(labelKey) : group}
											<X className="size-3" aria-hidden />
										</button>
									);
								})}
							</div>
						) : null}
					</div>

					<div className="w-full min-w-0 overflow-x-auto">
						<table className="w-full min-w-[36rem] border-collapse text-left">
							<thead className="sticky top-0 z-10 bg-card">
								{table.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id} className="border-b border-border">
										{headerGroup.headers.map((header) => {
											const sorted = header.column.getIsSorted();
											const isName = header.column.id === "name";
											return (
												<th
													key={header.id}
													className={cn(
														"bg-muted/45 px-4 py-3 text-left text-[0.7rem] font-semibold tracking-[0.06em] text-muted-foreground uppercase sm:px-5",
														isName ? "w-[38%]" : "w-[62%]",
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
											className="px-4 py-20 text-center text-sm text-muted-foreground sm:px-5"
										>
											{t("members.emptyFiltered")}
										</td>
									</tr>
								) : (
									table.getRowModel().rows.map((row, index) => (
										<tr
											key={row.id}
											onClick={() => openProfile(row.original.id)}
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
				</section>
			</div>

			<MemberProfileSheet
				memberId={profileId}
				open={profileOpen}
				onOpenChange={handleProfileOpenChange}
			/>
		</>
	);
}
