import {
	type AuthentikGroup,
	type AuthentikPaginated,
	type AuthentikUser,
	authentikApiBase,
	authentikAuthHeaders,
	authentikGroupKey,
} from "#/lib/authentik-api.server";
import { serverConfig } from "#/lib/config";
import type { Member, MembersResult } from "#/lib/members";
import { MEMBERSHIP_REVOKED_AT_ATTR } from "#/lib/offboarding";
import {
	ONBOARDING_CONTACT_ATTR,
	ONBOARDING_STAGE_ATTR,
} from "#/lib/onboarding";

/** Connect-written Authentik user attributes (neuland-connect + HR offboarding). */
export const ATTR = {
	githubUsername: "github_username",
	githubId: "github_id",
	discordUsername: "discord_username",
	discordId: "discord_id",
	easyVereinMemberId: "easyVereinMemberId",
	membershipRevokedAt: MEMBERSHIP_REVOKED_AT_ATTR,
	onboardingStage: ONBOARDING_STAGE_ATTR,
	onboardingContact: ONBOARDING_CONTACT_ATTR,
} as const;

export function daysAgoIso(days: number): string {
	return new Date(Date.now() - days * 86_400_000).toISOString();
}

export const RESSORT_KEYS = new Set([
	"management",
	"design-marketing",
	"engineering",
	"events",
]);

export function authHeaders(): HeadersInit {
	return authentikAuthHeaders();
}

export async function fetchJson<T>(
	path: string,
	params?: Record<string, string>,
): Promise<T> {
	const base = authentikApiBase();
	const url = new URL(`${base}${path}`);
	if (params) {
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.set(key, value);
		}
	}

	const res = await fetch(url, { headers: authHeaders() });
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		console.error(`[authentik] ${path} → ${res.status}`, detail.slice(0, 200));
		throw new Error(`Authentik request failed (${res.status}): ${path}`);
	}

	return (await res.json()) as T;
}

export async function fetchAllPages<T>(path: string): Promise<T[]> {
	const base = authentikApiBase();
	const headers = authHeaders();
	const items: T[] = [];
	let page = 1;

	for (;;) {
		const url = new URL(`${base}${path}`);
		url.searchParams.set("page", String(page));
		url.searchParams.set("page_size", "100");

		const res = await fetch(url, { headers });
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			console.error(
				`[authentik] ${path} page=${page} → ${res.status}`,
				detail.slice(0, 300),
			);
			throw new Error(`Authentik request failed (${res.status}): ${path}`);
		}

		const body = (await res.json()) as AuthentikPaginated<T>;
		const results = body.results ?? [];
		items.push(...results);

		// Authentik uses next=0 (not null) when there is no further page.
		const next = body.pagination?.next;
		if (!next || next === page) break;
		page = next;
	}

	return items;
}

export function groupKey(group: AuthentikGroup): string | null {
	return authentikGroupKey(group);
}

export function displayName(user: AuthentikUser): string {
	const name = user.name?.trim();
	if (name) return name;
	const username = user.username?.trim();
	if (username) return username;
	return user.uuid ?? (user.pk != null ? String(user.pk) : "Unbekannt");
}

export function resolveUserGroups(
	user: AuthentikUser,
	groupNamesById: Map<string, string>,
): string[] {
	const raw = user.groups ?? [];
	const names: string[] = [];

	for (const entry of raw) {
		if (typeof entry === "string") {
			const mapped = groupNamesById.get(entry);
			if (mapped) names.push(mapped);
			continue;
		}
		if (entry && typeof entry === "object") {
			if (typeof entry.name === "string" && entry.name.trim()) {
				names.push(entry.name.trim());
				continue;
			}
			const key = groupKey(entry);
			if (key) {
				const mapped = groupNamesById.get(key);
				if (mapped) names.push(mapped);
			}
		}
	}

	return [...new Set(names)].sort((a, b) => a.localeCompare(b, "de"));
}

export function toMembersResult(
	members: Member[],
	source: MembersResult["source"],
): MembersResult {
	const groupSet = new Set<string>();
	for (const member of members) {
		for (const group of member.groups) groupSet.add(group);
	}
	return {
		members,
		availableGroups: [...groupSet].sort((a, b) => a.localeCompare(b, "de")),
		source,
	};
}

export function buildGroupNameIndex(
	groups: AuthentikGroup[],
): Map<string, string> {
	const groupNamesById = new Map<string, string>();
	for (const group of groups) {
		const name = group.name?.trim();
		if (!name) continue;
		const key = groupKey(group);
		if (key) groupNamesById.set(key, name);
		if (group.pk != null) groupNamesById.set(String(group.pk), name);
	}
	return groupNamesById;
}

export function hasConfiguredGroup(
	groups: string[],
	expectedName: string,
): boolean {
	const expected = expectedName.trim().toLowerCase();
	if (!expected) return false;
	return groups.some((group) => group.trim().toLowerCase() === expected);
}

export function hasMitgliederGroup(groups: string[]): boolean {
	return hasConfiguredGroup(groups, serverConfig.groups.mitglieder);
}

export function hasTechnicalUsersGroup(groups: string[]): boolean {
	return hasConfiguredGroup(groups, serverConfig.groups.technicalUsers);
}

export function matchesMitgliederGroup(name: string | undefined): boolean {
	const expected = serverConfig.groups.mitglieder.trim().toLowerCase();
	if (!expected || !name) return false;
	return name.trim().toLowerCase() === expected;
}

export function easyVereinMemberIdFromAttributes(
	attributes: Record<string, unknown> | undefined,
): number | null {
	const value = attributes?.[ATTR.easyVereinMemberId];
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		const parsed = Number.parseInt(value.trim(), 10);
		return parsed > 0 ? parsed : null;
	}
	return null;
}

export function membershipRevokedAtFromAttributes(
	attributes: Record<string, unknown> | undefined,
): string | null {
	const value = attributes?.[ATTR.membershipRevokedAt];
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed || Number.isNaN(Date.parse(trimmed))) return null;
	return trimmed;
}

export function usersToMembers(
	users: AuthentikUser[],
	groupNamesById: Map<string, string>,
): Member[] {
	const members: Member[] = [];

	for (const user of users) {
		if (user.is_active === false) continue;
		if (user.type === "service_account") continue;

		const id =
			user.uuid ?? (user.pk != null ? String(user.pk) : user.username) ?? null;
		if (!id) continue;

		members.push({
			id,
			name: displayName(user),
			groups: resolveUserGroups(user, groupNamesById),
			easyVereinMemberId: easyVereinMemberIdFromAttributes(user.attributes),
			membershipRevokedAt: membershipRevokedAtFromAttributes(user.attributes),
		});
	}

	members.sort((a, b) => a.name.localeCompare(b.name, "de"));
	return members;
}

export async function fetchGroupByName(
	name: string,
	options?: { includeUsers?: boolean },
): Promise<AuthentikGroup | null> {
	const params: Record<string, string> = {
		name,
		page: "1",
		page_size: "10",
	};
	if (options?.includeUsers) {
		params.include_users = "true";
	}
	const body = await fetchJson<AuthentikPaginated<AuthentikGroup>>(
		"/api/v3/core/groups/",
		params,
	);
	const needle = name.trim().toLowerCase();
	return (
		body.results?.find(
			(entry) => entry.name?.trim().toLowerCase() === needle,
		) ??
		body.results?.[0] ??
		null
	);
}

/** Extract a numeric user pk from Authentik group `users` entries. */
export function userPkFromGroupEntry(raw: unknown): string | null {
	if (raw == null) return null;
	if (typeof raw === "number" && Number.isFinite(raw)) {
		return String(Math.trunc(raw));
	}
	if (typeof raw === "string") {
		const trimmed = raw.trim();
		if (/^\d+$/.test(trimmed)) return trimmed;
		// Hyperlinked identity: ".../api/v3/core/users/42/"
		const fromUrl = trimmed.match(/\/users\/(\d+)\/?$/);
		if (fromUrl?.[1]) return fromUrl[1];
		return null;
	}
	if (typeof raw === "object" && "pk" in raw) {
		const pk = (raw as { pk?: unknown }).pk;
		if (pk == null) return null;
		return String(pk);
	}
	return null;
}

/** Active user PKs from a group (`users_obj` preferred, else `users` ids). */
export function userPksFromGroup(group: AuthentikGroup | null): Set<string> {
	const pks = new Set<string>();
	if (!group) return pks;

	for (const user of group.users_obj ?? []) {
		if (user.pk == null) continue;
		if (user.is_active === false) continue;
		if (user.type === "service_account") continue;
		pks.add(String(user.pk));
	}

	if (pks.size > 0) return pks;

	for (const raw of group.users ?? []) {
		const pk = userPkFromGroupEntry(raw);
		if (pk) pks.add(pk);
	}
	return pks;
}
