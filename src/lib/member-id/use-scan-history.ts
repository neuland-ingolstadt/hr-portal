import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "neuland-hr-scan-history-v1";
const MAX_ENTRIES = 40;

export type ScanHistoryEntry = {
	id: string;
	sub: string;
	name: string;
	success: boolean;
	/** True when this successful scan repeats a prior successful scan of the same sub. */
	duplicate: boolean;
	timestamp: number;
};

/** Entries are newest-first; mark later successful rescans of the same sub. */
function withDuplicateFlags(entries: ScanHistoryEntry[]): ScanHistoryEntry[] {
	const seen = new Set<string>();
	const oldestFirst = [...entries].reverse().map((entry) => {
		if (!entry.success) return { ...entry, duplicate: false };
		const duplicate = seen.has(entry.sub);
		seen.add(entry.sub);
		return { ...entry, duplicate };
	});
	return oldestFirst.reverse();
}

function loadHistory(): ScanHistoryEntry[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw) as ScanHistoryEntry[];
		if (!Array.isArray(parsed)) return [];
		const normalized = parsed
			.filter(
				(entry) =>
					entry &&
					typeof entry.id === "string" &&
					typeof entry.sub === "string" &&
					typeof entry.name === "string" &&
					typeof entry.timestamp === "number",
			)
			.map((entry) => ({
				...entry,
				success: Boolean(entry.success),
				duplicate: Boolean(entry.duplicate),
			}));
		return withDuplicateFlags(normalized);
	} catch {
		return [];
	}
}

function persistHistory(entries: ScanHistoryEntry[]) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
	} catch {
		/* quota / private mode */
	}
}

export function useScanHistory() {
	const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);
	const [hydrated, setHydrated] = useState(false);

	useEffect(() => {
		setEntries(loadHistory());
		setHydrated(true);
	}, []);

	useEffect(() => {
		if (!hydrated) return;
		persistHistory(entries);
	}, [entries, hydrated]);

	const findBySub = useCallback(
		(sub: string) =>
			entries.find((entry) => entry.success && entry.sub === sub),
		[entries],
	);

	const addScan = useCallback(
		(input: {
			sub: string;
			name: string;
			success: boolean;
		}): { isDuplicate: boolean; previous: ScanHistoryEntry | null } => {
			const previous = input.success
				? (entries.find((e) => e.success && e.sub === input.sub) ?? null)
				: null;
			const isDuplicate = previous !== null;

			const entry: ScanHistoryEntry = {
				id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				sub: input.sub,
				name: input.name,
				success: input.success,
				duplicate: isDuplicate,
				timestamp: Date.now(),
			};

			setEntries((prev) => [entry, ...prev].slice(0, MAX_ENTRIES));
			return { isDuplicate, previous };
		},
		[entries],
	);

	const clearHistory = useCallback(() => {
		setEntries([]);
		if (typeof window !== "undefined") {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	}, []);

	return { entries, hydrated, addScan, clearHistory, findBySub };
}
