import { serverConfig } from "#/lib/config";
import type {
	Member,
	MemberProfile,
	MemberProfileResult,
	MembersResult,
	OffboardingCandidate,
	OffboardingCandidatesResult,
	OffboardingReason,
} from "#/lib/members";

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
	email?: string;
	is_active?: boolean;
	type?: string;
	attributes?: Record<string, unknown>;
	/** Group UUIDs or nested group objects, depending on Authentik version. */
	groups?: Array<string | AuthentikGroup>;
};

/** Connect-written Authentik user attributes (neuland-connect). */
const ATTR = {
	githubUsername: "github_username",
	githubId: "github_id",
	discordUsername: "discord_username",
	discordId: "discord_id",
} as const;

const MOCK_MEMBERS: Member[] = [
	{
		id: "mock-1",
		name: "Alex Berger",
		groups: ["HR", "Mitglieder", "management"],
	},
	{
		id: "mock-2",
		name: "Sam Kovacs",
		groups: ["Vorstand", "Mitglieder", "engineering"],
	},
	{ id: "mock-3", name: "Jordan Weiss", groups: ["Mitglieder", "events"] },
	{
		id: "mock-4",
		name: "Riley Hartmann",
		groups: ["HR", "design-marketing"],
	},
	{
		id: "mock-5",
		name: "Casey Vogel",
		groups: ["Mitglieder", "events", "engineering"],
	},
];

const MOCK_PROFILES: Record<
	string,
	Omit<MemberProfile, "email"> & { email: string }
> = {
	"mock-1": {
		id: "mock-1",
		name: "Alex Berger",
		username: "aberger",
		email: "alex.berger@neuland.local",
		groups: ["HR", "Mitglieder", "management"],
		githubConnected: true,
		discordConnected: true,
		source: "mock",
	},
	"mock-2": {
		id: "mock-2",
		name: "Sam Kovacs",
		username: "skovacs",
		email: "sam.kovacs@neuland.local",
		groups: ["Vorstand", "Mitglieder", "engineering"],
		githubConnected: true,
		discordConnected: false,
		source: "mock",
	},
	"mock-3": {
		id: "mock-3",
		name: "Jordan Weiss",
		username: "jweiss",
		email: "jordan.weiss@neuland.local",
		groups: ["Mitglieder", "events"],
		githubConnected: false,
		discordConnected: true,
		source: "mock",
	},
	"mock-4": {
		id: "mock-4",
		name: "Riley Hartmann",
		username: "rhartmann",
		email: "riley.hartmann@neuland.local",
		groups: ["HR", "design-marketing"],
		githubConnected: false,
		discordConnected: false,
		source: "mock",
	},
	"mock-5": {
		id: "mock-5",
		name: "Casey Vogel",
		username: "cvogel",
		email: "casey.vogel@neuland.local",
		groups: ["Mitglieder", "events", "engineering"],
		githubConnected: true,
		discordConnected: true,
		source: "mock",
	},
};

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

function hasConfiguredGroup(groups: string[], expectedName: string): boolean {
	const expected = expectedName.trim().toLowerCase();
	if (!expected) return false;
	return groups.some((group) => group.trim().toLowerCase() === expected);
}

function hasMitgliederGroup(groups: string[]): boolean {
	return hasConfiguredGroup(groups, serverConfig.groups.mitglieder);
}

function hasTechnicalUsersGroup(groups: string[]): boolean {
	return hasConfiguredGroup(groups, serverConfig.groups.technicalUsers);
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
 * List Verein-Mitglieder from Authentik (name + groups only).
 * Never returns email/PII. Omits the mitglieder group itself from badges
 * (everyone on this page is already a Mitglied).
 */
export async function listMembersFromAuthentik(): Promise<MembersResult> {
	const { members, source } = await loadActiveDirectoryMembers();
	const mitgliederName = serverConfig.groups.mitglieder.trim().toLowerCase();

	const mitglieder = members
		.filter((member) => hasMitgliederGroup(member.groups))
		.map((member) => ({
			...member,
			groups: member.groups.filter(
				(group) => group.trim().toLowerCase() !== mitgliederName,
			),
		}));

	return toMembersResult(mitglieder, source);
}

function toOffboardingCandidatesResult(
	members: OffboardingCandidate[],
	source: OffboardingCandidatesResult["source"],
): OffboardingCandidatesResult {
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

/**
 * Collect offboarding reasons for a directory member.
 * Extend this as new checks are added (EasyVerein, etc.).
 */
function collectOffboardingReasons(member: Member): OffboardingReason[] {
	const reasons: OffboardingReason[] = [];
	if (!hasMitgliederGroup(member.groups)) {
		reasons.push("missing_mitglieder");
	}
	// later: if (!isInEasyVerein(member)) reasons.push("not_in_easyverein");
	return reasons;
}

/**
 * Active Authentik accounts that fail one or more membership checks,
 * excluding technical accounts (technical-users group).
 */
export async function listNonMitgliederAccountsFromAuthentik(): Promise<OffboardingCandidatesResult> {
	const { members, source } = await loadActiveDirectoryMembers();
	const candidates: OffboardingCandidate[] = [];

	for (const member of members) {
		if (hasTechnicalUsersGroup(member.groups)) continue;
		const reasons = collectOffboardingReasons(member);
		if (reasons.length === 0) continue;
		candidates.push({ ...member, reasons });
	}

	return toOffboardingCandidatesResult(candidates, source);
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

function attributeString(
	attributes: Record<string, unknown> | undefined,
	key: string,
): string | null {
	const value = attributes?.[key];
	if (typeof value === "string" && value.length > 0) return value;
	if (Array.isArray(value) && typeof value[0] === "string" && value[0]) {
		return value[0];
	}
	return null;
}

/** Same rule as neuland-connect: username + id both present. */
function isGitHubConnected(
	attributes: Record<string, unknown> | undefined,
): boolean {
	return Boolean(
		attributeString(attributes, ATTR.githubUsername) &&
			attributeString(attributes, ATTR.githubId),
	);
}

function isDiscordConnected(
	attributes: Record<string, unknown> | undefined,
): boolean {
	return Boolean(
		attributeString(attributes, ATTR.discordUsername) &&
			attributeString(attributes, ATTR.discordId),
	);
}

function toMemberProfile(
	user: AuthentikUser,
	includeEmail: boolean,
	source: MemberProfile["source"],
	groups: string[],
): MemberProfile {
	const id =
		user.uuid ??
		(user.pk != null ? String(user.pk) : user.username) ??
		"unknown";
	const email = user.email?.trim() || null;
	return {
		id,
		name: displayName(user),
		username: user.username?.trim() || null,
		email: includeEmail ? email : null,
		groups,
		githubConnected: isGitHubConnected(user.attributes),
		discordConnected: isDiscordConnected(user.attributes),
		source,
	};
}

/**
 * Prefer groups already resolved in the directory cache; otherwise map
 * Authentik group UUIDs via a fresh groups index.
 */
async function resolveProfileGroups(
	user: AuthentikUser,
	uuid: string,
): Promise<string[]> {
	try {
		const { members } = await loadActiveDirectoryMembers();
		const hit = members.find((m) => m.id === uuid);
		if (hit) return hit.groups;
	} catch {
		/* fall through to direct resolution */
	}

	try {
		const groups = await fetchAllPages<AuthentikGroup>("/api/v3/core/groups/");
		return resolveUserGroups(user, buildGroupNameIndex(groups));
	} catch (err) {
		console.error("[authentik] profile groups resolve failed", err);
		return resolveUserGroups(user, new Map());
	}
}

/**
 * Fetch a single member profile by Authentik UUID.
 * Email is included only when `includeEmail` is true (Vorstand/Admin).
 */
export async function getMemberProfileByUuid(
	uuid: string,
	options: { includeEmail: boolean },
): Promise<MemberProfileResult> {
	const sub = uuid.trim();
	if (!sub) {
		return { status: "not_found", source: "authentik" };
	}

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const mock = MOCK_PROFILES[sub];
			if (!mock) return { status: "not_found", source: "mock" };
			return {
				status: "found",
				profile: {
					...mock,
					email: options.includeEmail ? mock.email : null,
				},
			};
		}
		return { status: "error", error: "authentik_api_missing" };
	}

	try {
		const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
		const url = new URL(`${base}/api/v3/core/users/`);
		url.searchParams.set("uuid", sub);
		url.searchParams.set("page_size", "5");

		const res = await fetch(url, { headers: authHeaders() });
		if (!res.ok) {
			console.error(`[authentik] profile lookup failed: ${res.status}`);
			return { status: "error", error: "lookup_failed" };
		}

		const body = (await res.json()) as AuthentikPaginated<AuthentikUser>;
		const user =
			body.results?.find((entry) => entry.uuid === sub) ?? body.results?.[0];

		if (!user) {
			return { status: "not_found", source: "authentik" };
		}

		const groups = await resolveProfileGroups(user, sub);
		return {
			status: "found",
			profile: toMemberProfile(
				user,
				options.includeEmail,
				"authentik",
				groups,
			),
		};
	} catch (err) {
		console.error("[authentik] profile lookup error", err);
		return { status: "error", error: "lookup_failed" };
	}
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
