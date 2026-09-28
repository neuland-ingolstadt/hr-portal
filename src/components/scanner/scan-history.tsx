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

type DeduplicatedScan = {
	name: string;
	sub: string;
	scannedAt: string;
};

/** Successful scans only, one entry per member (`sub`), oldest first. */
function deduplicatedScans(entries: ScanHistoryEntry[]): DeduplicatedScan[] {
	const seen = new Set<string>();
	const scans: DeduplicatedScan[] = [];
	for (const entry of [...entries].reverse()) {
		if (!entry.success || seen.has(entry.sub)) continue;
		seen.add(entry.sub);
		scans.push({
			name: entry.name,
			sub: entry.sub,
			scannedAt: new Date(entry.timestamp).toISOString(),
		});
	}
	return scans;
}

function downloadText(filename: string, content: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	anchor.click();
	URL.revokeObjectURL(url);
}

function downloadScansJson(scans: DeduplicatedScan[]) {
	downloadText(
		"scan-history.json",
		`${JSON.stringify(scans, null, 2)}\n`,
		"application/json",
	);
}

function downloadNamesMd(scans: DeduplicatedScan[]) {
	const body =
		scans.length === 0
			? ""
			: `${scans.map((scan) => `- ${scan.name}`).join("\n")}\n`;
	downloadText("scan-names.md", body, "text/markdown");
}

export function ScanHistoryList({ entries, onClear }: ScanHistoryListProps) {
	const { t, locale } = useI18n();

	if (entries.length === 0) return null;

	const scans = deduplicatedScans(entries);
	const canDownload = scans.length > 0;

	return (
		<section className="surface-panel space-y-3 p-4 sm:p-5">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<p className="font-mono text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
					{t("scanner.historyTitle")}
					<span className="ml-2 font-normal normal-case tracking-normal">
						({entries.length})
					</span>
				</p>
				<div className="flex flex-wrap items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={!canDownload}
						onClick={() => downloadScansJson(scans)}
					>
						{t("scanner.historyDownloadJson")}
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						disabled={!canDownload}
						onClick={() => downloadNamesMd(scans)}
					>
						{t("scanner.historyDownloadMd")}
					</Button>
					<Button type="button" variant="ghost" size="sm" onClick={onClear}>
						{t("scanner.historyClear")}
					</Button>
				</div>
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
									duplicate
										? "text-sky-700 dark:text-sky-300"
										: "text-foreground/80",
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
