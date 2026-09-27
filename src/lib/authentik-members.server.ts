import { serverConfig } from "#/lib/config";
import type { Member, MembersResult } from "#/lib/members";

type AuthentikPaginated<T> = {
	pagination?: { next?: number | null; count?: number };
	results?: T[];
};

type AuthentikGroup = {
	pk?: number | string;
	name?: string;
	group_uuid?: string;
	uuid?: string;
};

type AuthentikUser = {
	pk?: number | string;
	uuid?: string;
	name?: string;
	username?: string;
	is_active?: boolean;
	type?: string;
	/** Group UUIDs or nested group objects, depending on Authentik version. */
	groups?: Array<string | AuthentikGroup>;
};

const MOCK_MEMBERS: Member[] = [
	{ id: "mock-1", name: "Alex Berger", groups: ["HR", "Mitglieder"] },
	{ id: "mock-2", name: "Sam Kovacs", groups: ["Vorstand", "Mitglieder"] },
	{ id: "mock-3", name: "Jordan Weiss", groups: ["Mitglieder"] },
	{ id: "mock-4", name: "Riley Hartmann", groups: ["HR"] },
	{ id: "mock-5", name: "Casey Vogel", groups: ["Mitglieder", "Events"] },
];

/** Short in-memory cache so members + offboarding share one Authentik dump. */
const DIRECTORY_CACHE_TTL_MS = 45_000;

type DirectoryCache = {
	expiresAt: number;
	value: {
		members: Member[];
		source: MembersResult["source"];
	};
	inflight: Promise<{
		members: Member[];
		source: MembersResult["source"];
	}> | null;
};

const directoryCache: DirectoryCache = {
	expiresAt: 0,
	value: { members: [], source: "mock" },
	inflight: null,
};

function authHeaders(): HeadersInit {
	return {
		Authorization: `Bearer ${serverConfig.authentik.apiToken}`,
		Accept: "application/json",
	};
}

function isAuthentikApiConfigured(): boolean {
	const { apiUrl, apiToken } = serverConfig.authentik;
	return Boolean(apiUrl && apiToken);
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
	const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
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

function groupKey(group: AuthentikGroup): string | null {
	return (
		group.group_uuid ??
		group.uuid ??
		(group.pk != null ? String(group.pk) : null)
	);
}

function displayName(user: AuthentikUser): string {
	const name = user.name?.trim();
	if (name) return name;
	const username = user.username?.trim();
	if (username) return username;
	return user.uuid ?? (user.pk != null ? String(user.pk) : "Unbekannt");
}

function resolveUserGroups(
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

function toMembersResult(
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

function buildGroupNameIndex(groups: AuthentikGroup[]): Map<string, string> {
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

function hasMitgliederGroup(groups: string[]): boolean {
	const expected = serverConfig.groups.mitglieder.trim().toLowerCase();
	if (!expected) return false;
	return groups.some((group) => group.trim().toLowerCase() === expected);
}

async function loadActiveDirectoryMembers(): Promise<{
	members: Member[];
	source: MembersResult["source"];
}> {
	const now = Date.now();
	if (directoryCache.expiresAt > now) {
		return directoryCache.value;
	}
	if (directoryCache.inflight) {
		return directoryCache.inflight;
	}

	directoryCache.inflight = (async () => {
		const result = await fetchActiveDirectoryMembers();
		directoryCache.value = result;
		directoryCache.expiresAt = Date.now() + DIRECTORY_CACHE_TTL_MS;
		return result;
	})().finally(() => {
		directoryCache.inflight = null;
	});

	return directoryCache.inflight;
}

async function fetchActiveDirectoryMembers(): Promise<{
	members: Member[];
	source: MembersResult["source"];
}> {
	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			return { members: MOCK_MEMBERS, source: "mock" };
		}
		throw new Error("authentik_api_missing");
	}

	let groups: AuthentikGroup[];
	let users: AuthentikUser[];
	try {
		[groups, users] = await Promise.all([
			fetchAllPages<AuthentikGroup>("/api/v3/core/groups/"),
			fetchAllPages<AuthentikUser>("/api/v3/core/users/"),
		]);
	} catch (err) {
		console.error("[authentik] failed to list directory users", err);
		throw err;
	}

	const groupNamesById = buildGroupNameIndex(groups);
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
		});
	}

	members.sort((a, b) => a.name.localeCompare(b.name, "de"));
	return { members, source: "authentik" };
}

/**
 * List members from Authentik (name + groups only). Never returns email/PII.
 */
export async function listMembersFromAuthentik(): Promise<MembersResult> {
	const { members, source } = await loadActiveDirectoryMembers();
	return toMembersResult(members, source);
}

/**
 * Active Authentik accounts that are not in the configured mitglieder group.
 * Useful as an offboarding / cleanup candidate list.
 */
export async function listNonMitgliederAccountsFromAuthentik(): Promise<MembersResult> {
	const { members, source } = await loadActiveDirectoryMembers();
	const candidates = members.filter(
		(member) => !hasMitgliederGroup(member.groups),
	);
	return toMembersResult(candidates, source);
}

async function fetchJson<T>(
	path: string,
	params?: Record<string, string>,
): Promise<T> {
	const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
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

async function fetchPageCount(path: string): Promise<number> {
	const body = await fetchJson<AuthentikPaginated<unknown>>(path, {
		page: "1",
		page_size: "1",
	});
	return body.pagination?.count ?? body.results?.length ?? 0;
}

function matchesMitgliederGroup(name: string | undefined): boolean {
	const expected = serverConfig.groups.mitglieder.trim().toLowerCase();
	if (!expected || !name) return false;
	return name.trim().toLowerCase() === expected;
}

/**
 * Count active Verein-Mitglieder via the Authentik group (not all users).
 */
async function countMitgliederGroupMembers(): Promise<number> {
	const name = serverConfig.groups.mitglieder.trim();
	const body = await fetchJson<
		AuthentikPaginated<AuthentikGroup & { users?: unknown[] }>
	>("/api/v3/core/groups/", { name, page: "1", page_size: "5" });

	const group =
		body.results?.find((entry) => matchesMitgliederGroup(entry.name)) ??
		body.results?.[0];

	if (!group) {
		console.warn(`[authentik] mitglieder group not found: ${name}`);
		return 0;
	}

	if (Array.isArray(group.users)) {
		return group.users.length;
	}

	const pk = group.pk ?? group.uuid ?? group.group_uuid;
	if (pk == null) return 0;

	// Fallback if the list payload omits users.
	const detail = await fetchJson<AuthentikGroup & { users?: unknown[] }>(
		`/api/v3/core/groups/${pk}/`,
	);
	return Array.isArray(detail.users) ? detail.users.length : 0;
}

/**
 * Lightweight directory counts for the dashboard (no full user dump).
 */
export async function getDirectoryStatsFromAuthentik(): Promise<{
	memberCount: number;
	groupCount: number;
	source: "authentik" | "mock";
}> {
	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const mitgliederName = serverConfig.groups.mitglieder
				.trim()
				.toLowerCase();
			return {
				memberCount: MOCK_MEMBERS.filter((m) =>
					m.groups.some((g) => g.toLowerCase() === mitgliederName),
				).length,
				groupCount: new Set(MOCK_MEMBERS.flatMap((m) => m.groups)).size,
				source: "mock",
			};
		}
		throw new Error("authentik_api_missing");
	}

	try {
		const [memberCount, groupCount] = await Promise.all([
			countMitgliederGroupMembers(),
			fetchPageCount("/api/v3/core/groups/"),
		]);
		return { memberCount, groupCount, source: "authentik" };
	} catch (err) {
		console.error("[authentik] failed to load directory stats", err);
		throw err;
	}
}
