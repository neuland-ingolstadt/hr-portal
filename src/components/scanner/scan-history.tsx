import { CheckCircle2, Info, ShieldX } from "lucide-react";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import type { ScanHistoryEntry } from "#/lib/member-id/use-scan-history";
import { cn } from "#/lib/utils";

type ScanHistoryListProps = {
	entries: ScanHistoryEntry[];
	onClear: () => void;
};

function formatTime(timestamp: number, locale: string): string {
	const tag = locale === "de" ? "de-DE" : "en-US";
	return new Date(timestamp).toLocaleString(tag, {
		day: "2-digit",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function ScanHistoryList({ entries, onClear }: ScanHistoryListProps) {
	const { t, locale } = useI18n();

	if (entries.length === 0) return null;

	return (
		<section className="surface-panel space-y-3 p-4 sm:p-5">
			<div className="flex items-center justify-between gap-2">
				<p className="font-mono text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
					{t("scanner.historyTitle")}
					<span className="ml-2 font-normal normal-case tracking-normal">
						({entries.length})
					</span>
				</p>
				<Button type="button" variant="ghost" size="sm" onClick={onClear}>
					{t("scanner.historyClear")}
				</Button>
			</div>
			<p className="text-xs text-muted-foreground">
				{t("scanner.historyHint")}
			</p>
			<ul className="max-h-48 space-y-1 overflow-y-auto">
				{entries.map((entry) => {
					const duplicate = entry.success && entry.duplicate;
					return (
						<li
							key={entry.id}
							className="flex items-center gap-2 px-1 py-1.5 text-xs text-muted-foreground"
						>
							{duplicate ? (
								<Info
									className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400"
									aria-hidden
								/>
							) : entry.success ? (
								<CheckCircle2
									className="size-3.5 shrink-0 text-primary/70"
									aria-hidden
								/>
							) : (
								<ShieldX
									className="size-3.5 shrink-0 text-destructive/70"
									aria-hidden
								/>
							)}
							<span
								className={cn(
									"min-w-0 flex-1 truncate",
									duplicate ? "text-white" : "text-foreground/80",
								)}
							>
								{entry.name}
							</span>
							<span className="shrink-0 font-mono text-[0.65rem] tabular-nums">
								{formatTime(entry.timestamp, locale)}
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
