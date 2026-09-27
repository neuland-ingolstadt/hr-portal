import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "#/components/ui/badge";
import { Input } from "#/components/ui/input";
import { useI18n } from "#/lib/i18n/locale-context";
import type { Member } from "#/lib/members";
import { cn } from "#/lib/utils";

type OffboardingCandidatesTableProps = {
	candidates: Member[];
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function groupBadgeVariant(group: string) {
	const key = group.toLowerCase();
	if (key === "vorstand") return "vorstand" as const;
	if (key === "hr") return "hr" as const;
	return "muted" as const;
}

export function OffboardingCandidatesTable({
	candidates,
}: OffboardingCandidatesTableProps) {
	const { t } = useI18n();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "name", desc: false },
	]);
	const [nameFilter, setNameFilter] = useState("");

	const columns = useMemo<ColumnDef<Member>[]>(
		() => [
			{
				accessorKey: "name",
				header: t("members.colName"),
				cell: ({ row }) => (
					<div className="flex min-w-0 items-center gap-3">
						<span
							aria-hidden
							className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground"
						>
							{initials(row.original.name)}
						</span>
						<span className="truncate font-medium text-foreground">
							{row.original.name}
						</span>
					</div>
				),
			},
			{
				id: "groups",
				accessorFn: (row) => row.groups.join(", "),
				header: t("members.colGroups"),
				cell: ({ row }) => {
					const groups = row.original.groups;
					if (groups.length === 0) {
						return (
							<span className="text-muted-foreground">
								{t("offboarding.noGroups")}
							</span>
						);
					}
					return (
						<div className="flex flex-wrap gap-1.5">
							{groups.map((group) => (
								<Badge key={group} variant={groupBadgeVariant(group)}>
									{group}
								</Badge>
							))}
						</div>
					);
				},
				sortingFn: (a, b) =>
					a.original.groups
						.join(",")
						.localeCompare(b.original.groups.join(","), "de"),
			},
		],
		[t],
	);

	const table = useReactTable({
		data: candidates,
		columns,
		state: {
			sorting,
			columnFilters: nameFilter ? [{ id: "name", value: nameFilter }] : [],
		},
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const filteredCount = table.getFilteredRowModel().rows.length;

	return (
		<div className="surface-panel min-w-0 overflow-hidden">
			<div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
				<div className="relative w-full max-w-md">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						value={nameFilter}
						onChange={(event) => setNameFilter(event.target.value)}
						placeholder={t("members.searchPlaceholder")}
						aria-label={t("members.searchPlaceholder")}
						className="pl-9"
					/>
				</div>
				<p className="shrink-0 text-sm text-muted-foreground tabular-nums">
					{t("offboarding.candidatesShowing", {
						filtered: String(filteredCount),
						total: String(candidates.length),
					})}
				</p>
			</div>

			<div className="w-full min-w-0 overflow-x-auto">
				<table className="w-full min-w-[32rem] border-collapse text-left">
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
												isName ? "w-[40%]" : "w-[60%]",
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
										: t("members.emptyFiltered")}
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row, index) => (
								<tr
									key={row.id}
									className={cn(
										"border-b border-border/70 transition-colors last:border-b-0 hover:bg-primary/[0.04]",
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
		</div>
	);
}
