import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "#/components/ui/input";
import {
	AUDIT_ACTION_LABEL_KEYS,
	AUDIT_ACTIONS,
	type AuditAction,
	type AuditEvent,
	type AuditMeta,
	type AuditMetaValue,
} from "#/lib/audit";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

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

function metaEntries(meta: AuditMeta | null): [string, AuditMetaValue][] {
	if (!meta) return [];
	return Object.entries(meta).sort(([a], [b]) => a.localeCompare(b, "en"));
}

function formatMetaValue(
	value: AuditMetaValue,
	t: (key: MessageKey) => string,
): string {
	if (value === null) return t("audit.metaEmpty");
	if (typeof value === "boolean") {
		return value ? t("audit.metaTrue") : t("audit.metaFalse");
	}
	if (Array.isArray(value)) {
		return value.length > 0 ? value.join(", ") : t("audit.metaEmpty");
	}
	return String(value);
}

function metaSearchText(meta: AuditMeta | null): string {
	return metaEntries(meta)
		.flatMap(([key, value]) => {
			if (value === null) return [key];
			if (Array.isArray(value)) return [key, ...value];
			return [key, String(value)];
		})
		.join("\n");
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
		event.action,
		actionLabel,
		...event.actorRoles,
		metaSearchText(event.meta),
	]
		.join("\n")
		.toLowerCase();
	return haystack.includes(q);
}

function AuditRow({ event }: { event: AuditEvent }) {
	const { t, locale } = useI18n();
	const [expanded, setExpanded] = useState(false);
	const entries = metaEntries(event.meta);
	const hasMeta = entries.length > 0;
	const target =
		event.targetLabel?.trim() ||
		event.targetId?.trim() ||
		t("audit.targetNone");

	const summary = (
		<>
			<div className="flex min-w-0 flex-1 items-start gap-2">
				{hasMeta ? (
					<ChevronDown
						className={cn(
							"mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
							expanded && "rotate-180",
						)}
						aria-hidden
					/>
				) : (
					<span className="mt-0.5 size-4 shrink-0" aria-hidden />
				)}
				<div className="min-w-0 space-y-1">
					<p className="m-0 font-medium text-foreground">
						{t(actionLabelKey(event.action))}
					</p>
					<p className="m-0 text-sm text-muted-foreground">
						{t("audit.actorTarget", {
							actor: event.actorName,
							target,
						})}
					</p>
				</div>
			</div>
			<time
				dateTime={event.at}
				className="shrink-0 self-end font-mono text-xs text-muted-foreground sm:self-auto sm:pt-0.5"
			>
				{formatWhen(event.at, locale)}
			</time>
		</>
	);

	return (
		<li>
			{hasMeta ? (
				<button
					type="button"
					aria-expanded={expanded}
					onClick={() => setExpanded((current) => !current)}
					className="flex w-full flex-col gap-2 px-4 py-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5"
				>
					{summary}
				</button>
			) : (
				<div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
					{summary}
				</div>
			)}
			{hasMeta && expanded ? (
				<div className="border-t border-border/70 bg-muted/20 px-4 py-3 sm:px-5 sm:pl-11">
					<dl className="m-0 grid gap-2 sm:grid-cols-2">
						{entries.map(([key, value]) => (
							<div key={key} className="min-w-0 space-y-0.5">
								<dt className="font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground uppercase">
									{key}
								</dt>
								<dd className="m-0 break-all font-mono text-xs text-foreground">
									{formatMetaValue(value, t)}
								</dd>
							</div>
						))}
					</dl>
				</div>
			) : null}
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

	const filtered = useMemo(() => {
		return events.filter((event) => {
			if (actionFilter !== "all" && event.action !== actionFilter) {
				return false;
			}
			return matchesQuery(event, query, t(actionLabelKey(event.action)));
		});
	}, [actionFilter, events, query, t]);

	const hasFilters = Boolean(query.trim()) || actionFilter !== "all";

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
				<label className="flex min-w-0 flex-col gap-1.5 sm:max-w-[14rem] sm:flex-1">
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
