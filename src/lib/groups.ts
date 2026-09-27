/** Client-safe group helpers (Authentik group names). */

import type { MessageKey } from "#/lib/i18n/messages";

/** Neuland ressorts (Authentik group names, case-insensitive). */
export const RESSORTS = [
	"management",
	"design-marketing",
	"engineering",
	"events",
] as const;

export type Ressort = (typeof RESSORTS)[number];

const RESSORT_SET = new Set<string>(RESSORTS);

const RESSORT_LABEL_KEYS: Record<Ressort, MessageKey> = {
	management: "ressort.management",
	"design-marketing": "ressort.designMarketing",
	engineering: "ressort.engineering",
	events: "ressort.events",
};

export function normalizeGroupKey(group: string): string {
	return group.trim().toLowerCase().replace(/\s+/g, "-");
}

export function matchRessort(group: string): Ressort | null {
	const key = normalizeGroupKey(group);
	return RESSORT_SET.has(key) ? (key as Ressort) : null;
}

export function isRessortGroup(group: string): boolean {
	return matchRessort(group) !== null;
}

/** Groups Vorstand/Admin may assign via the member profile editor (ressorts only). */
export function isAssignableGroupName(group: string): boolean {
	return isRessortGroup(group);
}

export function ressortLabelKey(group: string): MessageKey | null {
	const ressort = matchRessort(group);
	return ressort ? RESSORT_LABEL_KEYS[ressort] : null;
}

export function partitionGroups(groups: string[]): {
	ressorts: string[];
	other: string[];
} {
	const ressorts: string[] = [];
	const other: string[] = [];
	for (const group of groups) {
		if (isRessortGroup(group)) ressorts.push(group);
		else other.push(group);
	}
	ressorts.sort((a, b) => {
		const aIdx = matchRessort(a);
		const bIdx = matchRessort(b);
		return (
			(aIdx ? RESSORTS.indexOf(aIdx) : Number.POSITIVE_INFINITY) -
			(bIdx ? RESSORTS.indexOf(bIdx) : Number.POSITIVE_INFINITY)
		);
	});
	other.sort((a, b) => a.localeCompare(b, "de"));
	return { ressorts, other };
}

/** Non-assignable groups for read-only profile badges (excludes ressorts). */
export function partitionEditableGroups(groups: string[]): {
	assignable: string[];
	readonly: string[];
} {
	const assignable: string[] = [];
	const readonly: string[] = [];
	for (const group of groups) {
		if (isAssignableGroupName(group)) assignable.push(group);
		else readonly.push(group);
	}
	assignable.sort((a, b) => {
		const aIdx = matchRessort(a);
		const bIdx = matchRessort(b);
		return (
			(aIdx ? RESSORTS.indexOf(aIdx) : Number.POSITIVE_INFINITY) -
			(bIdx ? RESSORTS.indexOf(bIdx) : Number.POSITIVE_INFINITY)
		);
	});
	readonly.sort((a, b) => a.localeCompare(b, "de"));
	return { assignable, readonly };
}

/** Ressorts first (canonical order), then remaining groups A–Z. */
export function sortGroupsForDisplay(groups: string[]): string[] {
	const { ressorts, other } = partitionGroups(groups);
	return [...ressorts, ...other];
}

export type GroupBadgeVariant = "vorstand" | "hr" | "ressort" | "muted";

export function groupBadgeVariant(group: string): GroupBadgeVariant {
	const key = normalizeGroupKey(group);
	if (key === "vorstand" || key === "admin") return "vorstand";
	if (key === "hr") return "hr";
	if (isRessortGroup(group)) return "ressort";
	return "muted";
}
