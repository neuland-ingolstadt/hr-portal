/** Client-safe CSV helpers for the members export. */

export type MemberExportRow = {
	name: string;
	email: string;
	groups: string[];
};

export type MembersCsvHeaders = {
	name: string;
	email: string;
	groups: string;
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

export function buildMembersCsv(
	rows: MemberExportRow[],
	headers: MembersCsvHeaders,
): string {
	const lines = [
		[headers.name, headers.email, headers.groups],
		...rows.map((row) => [row.name, row.email, row.groups.join(", ")]),
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
