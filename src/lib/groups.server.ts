/** Server-only group policy (env-configured Authentik names). */

import { serverConfig } from "#/lib/config";
import { matchRessort, normalizeGroupKey } from "#/lib/groups";

/** Groups that must never be added/removed via the profile editor. */
export function protectedGroupNames(): string[] {
	const { hr, vorstand, admin, ehrenmitglied, mitglieder, technicalUsers } =
		serverConfig.groups;
	return [hr, vorstand, admin, ehrenmitglied, mitglieder, technicalUsers]
		.map((name) => name.trim())
		.filter(Boolean);
}

export function isProtectedGroupName(name: string): boolean {
	const key = name.trim().toLowerCase();
	if (!key) return false;
	return protectedGroupNames().some(
		(protectedName) => protectedName.toLowerCase() === key,
	);
}

/**
 * Map a requested group to the canonical Authentik name for assignable groups.
 * Returns null when the name is not an assignable ressort.
 */
export function canonicalizeAssignableGroup(name: string): string | null {
	const trimmed = name.trim();
	if (!trimmed) return null;
	if (isProtectedGroupName(trimmed)) return null;

	return matchRessort(trimmed);
}

export function filterCurrentAssignable(groups: string[]): string[] {
	const canonical = new Set<string>();
	for (const group of groups) {
		const name = canonicalizeAssignableGroup(group);
		if (name) canonical.add(name);
	}
	return [...canonical];
}

export function groupsEqualIgnoreOrder(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const left = a.map((g) => normalizeGroupKey(g)).sort();
	const right = b.map((g) => normalizeGroupKey(g)).sort();
	return left.every((value, index) => value === right[index]);
}
