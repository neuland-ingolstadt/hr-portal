/** Client-safe CSV helpers for the members export. */

import type { OnboardingStage } from "#/lib/onboarding";

export type MemberExportRow = {
	name: string;
	email: string;
	groups: string[];
	/** Authentik account creation date (`YYYY-MM-DD`), empty if unknown. */
	createdAt: string;
	onboardingStage: OnboardingStage;
};

/** Semicolon: German Excel opens it in columns without the import wizard. */
const SEPARATOR = ";";

/**
 * Quote when needed and neutralise spreadsheet formulas (`=`, `+`, `-`, `@`),
 * since names come from user-editable Authentik profiles.
 */
function escapeCell(value: string): string {
	const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
	return /[";\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Fixed English, machine-readable headers (not localised on purpose). */
const HEADERS = [
	"name",
	"email",
	"groups",
	"created_at",
	"onboarding_stage",
] as const;

export function buildMembersCsv(rows: MemberExportRow[]): string {
	const lines = [
		HEADERS,
		...rows.map((row) => [
			row.name,
			row.email,
			row.groups.join(", "),
			row.createdAt,
			String(row.onboardingStage),
		]),
	].map((cells) => cells.map(escapeCell).join(SEPARATOR));
	// BOM so Excel detects UTF-8 (umlauts).
	return `﻿${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string): void {
	const url = URL.createObjectURL(
		new Blob([csv], { type: "text/csv;charset=utf-8" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.append(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}
