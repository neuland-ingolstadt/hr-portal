import type { Locale } from "#/lib/i18n/messages";

/**
 * Compact relative age for timestamps in the past (e.g. Authentik `date_joined`).
 * Returns `null` when the ISO string is invalid.
 */
export function formatRelativeAge(
	iso: string,
	locale: Locale,
	nowMs: number = Date.now(),
): string | null {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return null;

	const diffSec = Math.round((date.getTime() - nowMs) / 1000);
	const abs = Math.abs(diffSec);
	const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

	if (abs < 60) return rtf.format(diffSec, "second");
	const diffMin = Math.round(diffSec / 60);
	if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
	const diffHour = Math.round(diffSec / 3600);
	if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
	const diffDay = Math.round(diffSec / 86400);
	if (Math.abs(diffDay) < 7) return rtf.format(diffDay, "day");
	const diffWeek = Math.round(diffSec / (7 * 86400));
	if (Math.abs(diffWeek) < 5) return rtf.format(diffWeek, "week");
	const diffMonth = Math.round(diffSec / (30 * 86400));
	if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
	const diffYear = Math.round(diffSec / (365 * 86400));
	return rtf.format(diffYear, "year");
}
