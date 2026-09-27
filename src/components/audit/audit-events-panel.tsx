import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "#/components/ui/input";
import {
	AUDIT_ACTION_LABEL_KEYS,
	AUDIT_ACTIONS,
	type AuditAction,
	type AuditEvent,
} from "#/lib/audit";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

type StatusFilter = "all" | "ok" | "failed";
type ActionFilter = "all" | AuditAction;

type AuditEventsPanelProps = {
	events: AuditEvent[];
};

function formatWhen(iso: string, locale: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(date);
}

function actionLabelKey(action: AuditAction): MessageKey {
	return AUDIT_ACTION_LABEL_KEYS[action];
}

function matchesQuery(
	event: AuditEvent,
	query: string,
	actionLabel: string,
): boolean {
	const q = query.trim().toLowerCase();
	if (!q) return true;
	const haystack = [
		event.actorName,
		event.targetId ?? "",
		event.targetLabel ?? "",
		event.error ?? "",
		event.action,
		actionLabel,
		...event.actorRoles,
	]
		.join("\n")
		.toLowerCase();
	return haystack.includes(q);
}

function AuditRow({ event }: { event: AuditEvent }) {
	const { t, locale } = useI18n();
	const target =
		event.targetLabel?.trim() ||
		event.targetId?.trim() ||
		t("audit.targetNone");

	return (
		<li className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-medium text-foreground">
						{t(actionLabelKey(event.action))}
					</span>
					<span
						className={cn(
							"font-mono text-[0.65rem] font-semibold uppercase tracking-[0.08em]",
							event.success ? "text-emerald-700" : "text-destructive",
						)}
					>
						{event.success ? t("audit.status.ok") : t("audit.status.failed")}
					</span>
				</div>
				<p className="m-0 text-sm text-muted-foreground">
					<span className="text-foreground">{event.actorName}</span>
					<span className="text-muted-foreground"> → {target}</span>
				</p>
				{!event.success && event.error ? (
					<p className="m-0 font-mono text-xs text-destructive">
						{event.error}
					</p>
				) : null}
			</div>
			<time
				dateTime={event.at}
				className="shrink-0 font-mono text-xs text-muted-foreground sm:pt-0.5"
			>
				{formatWhen(event.at, locale)}
			</time>
		</li>
	);
}

const selectClassName = cn(
	"h-10 min-w-0 border border-border bg-background px-3 font-sans text-sm text-foreground",
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

export function AuditEventsPanel({ events }: AuditEventsPanelProps) {
	const { t } = useI18n();
	const [query, setQuery] = useState("");
	const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	const filtered = useMemo(() => {
		return events.filter((event) => {
			if (actionFilter !== "all" && event.action !== actionFilter) {
				return false;
			}
			if (statusFilter === "ok" && !event.success) return false;
			if (statusFilter === "failed" && event.success) return false;
			return matchesQuery(event, query, t(actionLabelKey(event.action)));
		});
	}, [actionFilter, events, query, statusFilter, t]);

	const hasFilters =
		Boolean(query.trim()) || actionFilter !== "all" || statusFilter !== "all";

	if (events.length === 0) {
		return (
			<div className="surface-panel flex min-h-64 items-center justify-center p-6">
				<p className="m-0 text-center text-sm text-muted-foreground">
					{t("audit.empty")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="relative min-w-0 flex-1 lg:max-w-sm">
					<Search
						className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
						aria-hidden
					/>
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder={t("audit.searchPlaceholder")}
						className="pl-9"
						aria-label={t("audit.searchPlaceholder")}
						data-shortcut="search"
					/>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[14rem]">
						<span className="font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
							{t("audit.filterAction")}
						</span>
						<select
							className={selectClassName}
							value={actionFilter}
							onChange={(event) =>
								setActionFilter(event.target.value as ActionFilter)
							}
							aria-label={t("audit.filterAction")}
						>
							<option value="all">{t("audit.filterActionAll")}</option>
							{AUDIT_ACTIONS.map((action) => (
								<option key={action} value={action}>
									{t(actionLabelKey(action))}
								</option>
							))}
						</select>
					</label>
					<label className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-[11rem]">
						<span className="font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
							{t("audit.filterStatus")}
						</span>
						<select
							className={selectClassName}
							value={statusFilter}
							onChange={(event) =>
								setStatusFilter(event.target.value as StatusFilter)
							}
							aria-label={t("audit.filterStatus")}
						>
							<option value="all">{t("audit.filterStatusAll")}</option>
							<option value="ok">{t("audit.status.ok")}</option>
							<option value="failed">{t("audit.status.failed")}</option>
						</select>
					</label>
				</div>
			</div>

			<section className="surface-panel min-w-0 overflow-hidden">
				<div className="border-b border-border px-4 py-3.5 sm:px-5">
					<p className="m-0 text-sm font-medium text-foreground">
						{hasFilters
							? t("audit.showing", {
									filtered: String(filtered.length),
									total: String(events.length),
								})
							: t("audit.count", { count: String(events.length) })}
					</p>
				</div>
				{filtered.length === 0 ? (
					<div className="flex min-h-40 items-center justify-center p-6">
						<p className="m-0 text-center text-sm text-muted-foreground">
							{t("audit.emptyFiltered")}
						</p>
					</div>
				) : (
					<ul className="divide-y divide-border">
						{filtered.map((event) => (
							<AuditRow key={event.id} event={event} />
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
