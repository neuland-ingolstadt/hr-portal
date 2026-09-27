import {
	type ColumnDef,
	columnFilteringFeature,
	createFilteredRowModel,
	createSortedRowModel,
	filterFn_includesString,
	flexRender,
	globalFilteringFeature,
	rowSortingFeature,
	type SortingState,
	sortFn_alphanumeric,
	sortFn_text,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { PendingApplication } from "#/lib/applications";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

const features = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	filterFns: {
		includesString: filterFn_includesString,
	},
	sortFns: {
		alphanumeric: sortFn_alphanumeric,
		text: sortFn_text,
	},
});

type ApplicationsTableProps = {
	applications: PendingApplication[];
	onAccept: (application: PendingApplication) => void;
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatDate(value: string | null, locale: string): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function ApplicationsTable({
	applications,
	onAccept,
}: ApplicationsTableProps) {
	const { t, locale } = useI18n();
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "applicationDate", desc: true },
	]);
	const [nameFilter, setNameFilter] = useState("");

	const columns = useMemo<ColumnDef<typeof features, PendingApplication>[]>(
		() => [
			{
				accessorKey: "displayName",
				header: t("applications.colName"),
				cell: ({ row }) => (
					<div className="flex min-w-0 max-w-full items-center gap-3">
						<span
							aria-hidden
							className="flex size-9 shrink-0 items-center justify-center border border-border bg-muted font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground"
						>
							{initials(row.original.displayName)}
						</span>
						<span className="truncate font-medium text-foreground">
							{row.original.displayName}
						</span>
					</div>
				),
			},
			{
				accessorKey: "email",
				header: t("applications.colEmail"),
				cell: ({ row }) => (
					<span className="truncate text-sm text-muted-foreground">
						{row.original.email || "—"}
					</span>
				),
			},
			{
				id: "applicationDate",
				accessorFn: (row) => row.applicationDate ?? "",
				header: t("applications.colDate"),
				cell: ({ row }) => (
					<span className="whitespace-nowrap text-sm text-muted-foreground">
						{formatDate(row.original.applicationDate, locale)}
					</span>
				),
			},
			{
				id: "actions",
				enableSorting: false,
				header: () => (
					<span className="sr-only">{t("applications.colActions")}</span>
				),
				cell: ({ row }) => (
					<div className="flex justify-end">
						<Button
							type="button"
							size="sm"
							onClick={() => onAccept(row.original)}
						>
							{t("applications.accept")}
						</Button>
					</div>
				),
			},
		],
		[locale, onAccept, t],
	);

	const table = useTable({
		features,
		data: applications,
		columns,
		state: {
			sorting,
			globalFilter: nameFilter,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setNameFilter,
		globalFilterFn: (row, _columnId, filterValue) => {
			const query = String(filterValue ?? "")
				.trim()
				.toLowerCase();
			if (!query) return true;
			const app = row.original;
			return (
				app.displayName.toLowerCase().includes(query) ||
				app.email.toLowerCase().includes(query) ||
				app.firstName.toLowerCase().includes(query) ||
				app.lastName.toLowerCase().includes(query)
			);
		},
	});

	const filtered = table.getFilteredRowModel().rows.length;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative max-w-sm flex-1">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						value={nameFilter}
						onChange={(event) => setNameFilter(event.target.value)}
						placeholder={t("applications.searchPlaceholder")}
						className="pl-9"
						aria-label={t("applications.searchPlaceholder")}
					/>
				</div>
				<p className="page-meta m-0 shrink-0">
					{nameFilter
						? t("applications.showing", {
								filtered: String(filtered),
								total: String(applications.length),
							})
						: t("applications.count", {
								count: String(applications.length),
							})}
				</p>
			</div>

			<div className="surface-panel overflow-x-auto">
				<table className="w-full min-w-[40rem] border-collapse text-left text-sm">
					<thead>
						{table.getHeaderGroups().map((headerGroup) => (
							<tr
								key={headerGroup.id}
								className="border-b border-border bg-muted/40"
							>
								{headerGroup.headers.map((header) => {
									const canSort = header.column.getCanSort();
									const sorted = header.column.getIsSorted();
									return (
										<th
											key={header.id}
											className="px-4 py-3 font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase"
										>
											{canSort ? (
												<button
													type="button"
													className="inline-flex items-center gap-1.5 hover:text-foreground"
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
									className="px-4 py-10 text-center text-muted-foreground"
								>
									{t("applications.emptyFiltered")}
								</td>
							</tr>
						) : (
							table.getRowModel().rows.map((row) => (
								<tr
									key={row.id}
									className={cn(
										"border-b border-border last:border-b-0",
										"hover:bg-muted/30",
									)}
								>
									{row.getAllCells().map((cell) => (
										<td key={cell.id} className="px-4 py-3 align-middle">
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
