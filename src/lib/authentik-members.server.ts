import { serverConfig } from "#/lib/config";
import {
	classifyEasyVereinMemberStatus,
	type EasyVereinMembershipSnapshot,
	getEasyVereinMembershipSnapshot,
	isEasyVereinConfigured,
} from "#/lib/easyverein.server";
import type {
	Member,
	MemberProfile,
	MemberProfileResult,
	MembersResult,
	OffboardingCandidate,
	OffboardingCandidatesResult,
	OffboardingReason,
} from "#/lib/members";
import { MEMBERSHIP_REVOKED_AT_ATTR } from "#/lib/offboarding";
import {
	ONBOARDING_STAGE_ATTR,
	parseOnboardingStage,
	RECENT_ONBOARDING_WEEKS,
	type OnboardingStage,
	type RecentOnboardingMember,
	type RecentOnboardingMembersResult,
	type UpdateMemberOnboardingStageResult,
} from "#/lib/onboarding";

type AuthentikPaginated<T> = {
	pagination?: { next?: number | null; count?: number };
	results?: T[];
};

type AuthentikGroup = {
	pk?: number | string;
	name?: string;
	group_uuid?: string;
	uuid?: string;
	/** User PKs only (default list/detail payload). */
	users?: unknown[];
	/** Expanded users when `include_users=true`. */
	users_obj?: AuthentikUser[];
};

type AuthentikUser = {
	pk?: number | string;
	uuid?: string;
	name?: string;
	username?: string;
	email?: string;
	is_active?: boolean;
	type?: string;
	/** Account creation timestamp (Django / Authentik). */
	date_joined?: string;
	attributes?: Record<string, unknown>;
	/** Group UUIDs or nested group objects, depending on Authentik version. */
	groups?: Array<string | AuthentikGroup>;
};

/** Connect-written Authentik user attributes (neuland-connect + HR offboarding). */
const ATTR = {
	githubUsername: "github_username",
	githubId: "github_id",
	discordUsername: "discord_username",
	discordId: "discord_id",
	easyVereinMemberId: "easyVereinMemberId",
	membershipRevokedAt: MEMBERSHIP_REVOKED_AT_ATTR,
	onboardingStage: ONBOARDING_STAGE_ATTR,
} as const;

function daysAgoIso(days: number): string {
	return new Date(Date.now() - days * 86_400_000).toISOString();
}

const MOCK_MEMBERS: Member[] = [
	{
		id: "mock-1",
		name: "Alex Berger",
		groups: ["HR", "Mitglieder", "management"],
		easyVereinMemberId: 1001,
		membershipRevokedAt: null,
	},
	{
		id: "mock-2",
		name: "Sam Kovacs",
		groups: ["Vorstand", "Mitglieder", "engineering"],
		easyVereinMemberId: null,
		membershipRevokedAt: null,
	},
	{
		id: "mock-3",
		name: "Jordan Weiss",
		groups: ["Mitglieder", "events"],
		easyVereinMemberId: 1003,
		membershipRevokedAt: null,
	},
	{
		id: "mock-4",
		name: "Riley Hartmann",
		groups: ["HR", "design-marketing"],
		easyVereinMemberId: null,
		membershipRevokedAt: daysAgoIso(5),
	},
	{
		id: "mock-5",
		name: "Casey Vogel",
		groups: ["Mitglieder", "events", "engineering"],
		easyVereinMemberId: null,
		membershipRevokedAt: null,
	},
	{
		id: "mock-6",
		name: "Taylor Neumann",
		groups: ["design-marketing"],
		easyVereinMemberId: null,
		membershipRevokedAt: null,
	},
];

/** Soft-deleted from mock directory after stage-2 delete. */
const mockDeletedIds = new Set<string>();

function activeMockMembers(): Member[] {
	return MOCK_MEMBERS.filter((member) => !mockDeletedIds.has(member.id));
}

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
		onboardingStage: 4,
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
		onboardingStage: 2,
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
		onboardingStage: 1,
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
		onboardingStage: 0,
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
		onboardingStage: 3,
		source: "mock",
	},
};

/** In-memory cache TTL for Authentik directory snapshots. */
const DIRECTORY_CACHE_TTL_MS = 5 * 60_000;

type DirectorySnapshot = {
	members: Member[];
	source: MembersResult["source"];
};

type DirectoryCache = {
	expiresAt: number;
	value: DirectorySnapshot;
	inflight: Promise<DirectorySnapshot> | null;
};

function emptyCache(): DirectoryCache {
	return {
		expiresAt: 0,
		value: { members: [], source: "mock" },
		inflight: null,
	};
}

/** Full active-user dump — used by offboarding (needs non-Mitglieder too). */
const directoryCache: DirectoryCache = emptyCache();

/** Mitglieder-only snapshot — fast group+users path for /members. */
const mitgliederCache: DirectoryCache = emptyCache();

function invalidateCache(cache: DirectoryCache): void {
	cache.expiresAt = 0;
	cache.value = { members: [], source: "mock" };
	cache.inflight = null;
}

/** Drop in-memory directory snapshots after mutations (e.g. create user). */
export function invalidateDirectoryCache(): void {
	invalidateCache(directoryCache);
	invalidateCache(mitgliederCache);
}

/**
 * AUTH_MOCK helper: strip Mitglieder group so the account moves to stage 2.
 */
export function mockRevokeMitgliederMembership(memberId: string): boolean {
	const member = MOCK_MEMBERS.find((entry) => entry.id === memberId);
	if (!member) return false;
	const expected =
		serverConfig.groups.mitglieder.trim().toLowerCase() || "mitglieder";
	member.groups = member.groups.filter(
		(group) => group.trim().toLowerCase() !== expected,
	);
	member.membershipRevokedAt = new Date().toISOString();
	invalidateDirectoryCache();
	return true;
}

/**
 * AUTH_MOCK helper: permanently remove account from mock directory.
 */
export function mockDeleteAccount(memberId: string): boolean {
	if (!MOCK_MEMBERS.some((entry) => entry.id === memberId)) return false;
	mockDeletedIds.add(memberId);
	invalidateDirectoryCache();
	return true;
}

/**
 * AUTH_MOCK helper: set human onboarding stage on mock profile.
 */
export function mockUpdateMemberOnboardingStage(
	memberId: string,
	stage: OnboardingStage,
): boolean {
	const profile = MOCK_PROFILES[memberId];
	if (!profile) return false;
	profile.onboardingStage = stage;
	return true;
}

/**
 * AUTH_MOCK helper: replace assignable ressorts, keep other groups.
 */
export function mockUpdateMemberAssignableGroups(
	memberId: string,
	desiredAssignable: string[],
): boolean {
	const member = MOCK_MEMBERS.find((entry) => entry.id === memberId);
	const profile = MOCK_PROFILES[memberId];
	if (!member && !profile) return false;

	const mergeGroups = (current: string[]): string[] => {
		const kept = current.filter((group) => {
			const key = group.trim().toLowerCase();
			return !RESSORT_KEYS.has(key);
		});
		return [...kept, ...desiredAssignable.map((g) => g.trim()).filter(Boolean)];
	};

	if (member) member.groups = mergeGroups(member.groups);
	if (profile) profile.groups = mergeGroups(profile.groups);

	invalidateDirectoryCache();
	return true;
}

const RESSORT_KEYS = new Set([
	"management",
	"design-marketing",
	"engineering",
	"events",
]);


async function loadCachedSnapshot(
	cache: DirectoryCache,
	fetchSnapshot: () => Promise<DirectorySnapshot>,
): Promise<DirectorySnapshot> {
	const now = Date.now();
	if (cache.expiresAt > now) {
		return cache.value;
	}
	if (cache.inflight) {
		return cache.inflight;
	}

	cache.inflight = (async () => {
		const result = await fetchSnapshot();
		cache.value = result;
		cache.expiresAt = Date.now() + DIRECTORY_CACHE_TTL_MS;
		return result;
	})().finally(() => {
		cache.inflight = null;
	});

	return cache.inflight;
}

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

function matchesMitgliederGroup(name: string | undefined): boolean {
	const expected = serverConfig.groups.mitglieder.trim().toLowerCase();
	if (!expected || !name) return false;
	return name.trim().toLowerCase() === expected;
}

function easyVereinMemberIdFromAttributes(
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

function membershipRevokedAtFromAttributes(
	attributes: Record<string, unknown> | undefined,
): string | null {
	const value = attributes?.[ATTR.membershipRevokedAt];
	if (typeof value !== "string") return null;
	const trimmed = value.trim();
	if (!trimmed || Number.isNaN(Date.parse(trimmed))) return null;
	return trimmed;
}

function usersToMembers(
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

async function loadActiveDirectoryMembers(): Promise<DirectorySnapshot> {
	return loadCachedSnapshot(directoryCache, fetchActiveDirectoryMembers);
}

async function loadMitgliederDirectoryMembers(): Promise<DirectorySnapshot> {
	return loadCachedSnapshot(mitgliederCache, fetchMitgliederDirectoryMembers);
}

/**
 * Full active-user dump. Expensive (~seconds) — keep for offboarding only.
 */
async function fetchActiveDirectoryMembers(): Promise<DirectorySnapshot> {
	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			return { members: activeMockMembers(), source: "mock" };
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

	return {
		members: usersToMembers(users, buildGroupNameIndex(groups)),
		source: "authentik",
	};
}

/**
 * Mitglieder via groups+users inversion — avoids the slow paginated /users dump.
 * ~1s vs ~8s. Member ids are Authentik user PKs (profile lookup accepts pk or uuid).
 */
async function fetchMitgliederDirectoryMembers(): Promise<DirectorySnapshot> {
	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			return {
				members: activeMockMembers().filter((m) =>
					hasMitgliederGroup(m.groups),
				),
				source: "mock",
			};
		}
		throw new Error("authentik_api_missing");
	}

	const mitgliederName = serverConfig.groups.mitglieder.trim();
	if (!mitgliederName) {
		throw new Error("mitglieder_group_missing");
	}

	let groups: AuthentikGroup[];
	try {
		// Single list call with expanded users (~1s) — cheaper than /users pages.
		groups = await fetchAllPages<AuthentikGroup>(
			"/api/v3/core/groups/?include_users=true",
		);
	} catch (err) {
		console.error("[authentik] failed to list mitglieder", err);
		throw err;
	}

	const groupsByUserPk = new Map<string, Set<string>>();
	const mitgliederByPk = new Map<string, AuthentikUser>();

	for (const group of groups) {
		const name = group.name?.trim();
		if (!name) continue;
		const isMit = matchesMitgliederGroup(name);

		for (const user of group.users_obj ?? []) {
			if (user.pk == null) continue;
			const pk = String(user.pk);
			let set = groupsByUserPk.get(pk);
			if (!set) {
				set = new Set();
				groupsByUserPk.set(pk, set);
			}
			set.add(name);
			if (isMit) mitgliederByPk.set(pk, user);
		}
	}

	if (mitgliederByPk.size === 0) {
		console.warn(`[authentik] mitglieder group not found: ${mitgliederName}`);
		return { members: [], source: "authentik" };
	}

	const members: Member[] = [];
	for (const [pk, user] of mitgliederByPk) {
		if (user.is_active === false) continue;
		if (user.type === "service_account") continue;

		members.push({
			id: pk,
			name: displayName(user),
			groups: [...(groupsByUserPk.get(pk) ?? [])].sort((a, b) =>
				a.localeCompare(b, "de"),
			),
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
	const { members, source } = await loadMitgliederDirectoryMembers();
	const mitgliederName = serverConfig.groups.mitglieder.trim().toLowerCase();

	const mitglieder = members.map((member) => ({
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
	easyVereinReconciled = false,
): OffboardingCandidatesResult {
	const groupSet = new Set<string>();
	for (const member of members) {
		for (const group of member.groups) groupSet.add(group);
	}
	return {
		members,
		availableGroups: [...groupSet].sort((a, b) => a.localeCompare(b, "de")),
		source,
		easyVereinReconciled,
		deleteGraceDays: serverConfig.offboardingDeleteGraceDays,
	};
}

/**
 * Collect base Authentik-only offboarding reasons (no EV API).
 * - membership_revoked: Authentik `membershipRevokedAt` set (stage 1 done)
 * - not_in_easyverein: Mitglieder without Authentik `easyVereinMemberId`
 */
function collectAuthentikOffboardingReasons(
	member: Member,
): OffboardingReason[] {
	const reasons: OffboardingReason[] = [];
	if (member.membershipRevokedAt) {
		reasons.push("membership_revoked");
		return reasons;
	}
	if (hasMitgliederGroup(member.groups) && member.easyVereinMemberId == null) {
		reasons.push("not_in_easyverein");
	}
	return reasons;
}

function applyEasyVereinReconciliation(
	member: Member,
	snapshot: EasyVereinMembershipSnapshot,
): OffboardingCandidate | null {
	if (member.membershipRevokedAt) {
		return {
			...member,
			reasons: ["membership_revoked"],
		};
	}

	if (!hasMitgliederGroup(member.groups)) {
		return null;
	}

	if (member.easyVereinMemberId == null) {
		return {
			...member,
			reasons: ["not_in_easyverein"],
		};
	}

	const status = classifyEasyVereinMemberStatus(
		member.easyVereinMemberId,
		snapshot,
	);

	if (status.state === "active") {
		return null;
	}

	if (status.state === "leaving") {
		return {
			...member,
			reasons: ["left_easyverein"],
			easyVereinResignationDate: status.resignationDate,
		};
	}

	if (status.state === "left") {
		return {
			...member,
			reasons: ["left_easyverein"],
			easyVereinResignationDate: status.resignationDate,
		};
	}

	// missing (purged / unknown)
	return {
		...member,
		reasons: ["left_easyverein"],
		easyVereinResignationDate: null,
	};
}

/**
 * Active Authentik accounts that fail membership / EV linkage checks,
 * excluding technical accounts (technical-users group).
 *
 * When EasyVerein is configured, linked Mitglieder are reconciled against EV
 * (resignation / wastebasket / missing id) so leavers surface in stage 1.
 */
export async function listNonMitgliederAccountsFromAuthentik(): Promise<OffboardingCandidatesResult> {
	const { members, source } = await loadActiveDirectoryMembers();

	let snapshot: EasyVereinMembershipSnapshot | null = null;
	let easyVereinReconciled = false;
	if (isEasyVereinConfigured()) {
		try {
			snapshot = await getEasyVereinMembershipSnapshot();
			easyVereinReconciled = true;
		} catch (err) {
			console.error("[offboarding] EasyVerein reconciliation failed", err);
		}
	}

	const candidates: OffboardingCandidate[] = [];

	for (const member of members) {
		if (hasTechnicalUsersGroup(member.groups)) continue;

		if (snapshot) {
			const candidate = applyEasyVereinReconciliation(member, snapshot);
			if (candidate) candidates.push(candidate);
			continue;
		}

		const reasons = collectAuthentikOffboardingReasons(member);
		if (reasons.length === 0) continue;
		candidates.push({ ...member, reasons });
	}

	return toOffboardingCandidatesResult(
		candidates,
		source,
		easyVereinReconciled,
	);
}

async function fetchPageCount(path: string): Promise<number> {
	const body = await fetchJson<AuthentikPaginated<unknown>>(path, {
		page: "1",
		page_size: "1",
	});
	return body.pagination?.count ?? body.results?.length ?? 0;
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
		onboardingStage: parseOnboardingStage(
			user.attributes?.[ATTR.onboardingStage],
		),
		source,
	};
}

/**
 * Prefer groups already resolved in a directory cache; otherwise map
 * Authentik group UUIDs via a fresh groups index.
 */
async function resolveProfileGroups(
	user: AuthentikUser,
	id: string,
): Promise<string[]> {
	const pk = user.pk != null ? String(user.pk) : null;
	for (const loader of [
		loadMitgliederDirectoryMembers,
		loadActiveDirectoryMembers,
	]) {
		try {
			const { members } = await loader();
			const hit = members.find(
				(m) => m.id === id || (pk != null && m.id === pk),
			);
			if (hit) return hit.groups;
		} catch {
			/* try next cache / fall through */
		}
	}

	try {
		const groups = await fetchAllPages<AuthentikGroup>("/api/v3/core/groups/");
		return resolveUserGroups(user, buildGroupNameIndex(groups));
	} catch (err) {
		console.error("[authentik] profile groups resolve failed", err);
		return resolveUserGroups(user, new Map());
	}
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fetch a single member profile by Authentik UUID or numeric user PK.
 * Email is included only when `includeEmail` is true (Vorstand/Admin).
 */
export async function getMemberProfileByUuid(
	id: string,
	options: { includeEmail: boolean },
): Promise<MemberProfileResult> {
	const sub = id.trim();
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
		let user: AuthentikUser | undefined;

		if (UUID_RE.test(sub)) {
			const url = new URL(`${base}/api/v3/core/users/`);
			url.searchParams.set("uuid", sub);
			url.searchParams.set("page_size", "5");
			const res = await fetch(url, { headers: authHeaders() });
			if (!res.ok) {
				console.error(`[authentik] profile lookup failed: ${res.status}`);
				return { status: "error", error: "lookup_failed" };
			}
			const body = (await res.json()) as AuthentikPaginated<AuthentikUser>;
			user =
				body.results?.find((entry) => entry.uuid === sub) ?? body.results?.[0];
		} else {
			// Members list uses Authentik numeric PK (users_obj has no uuid).
			const res = await fetch(
				`${base}/api/v3/core/users/${encodeURIComponent(sub)}/`,
				{
					headers: authHeaders(),
				},
			);
			if (res.status === 404) {
				return { status: "not_found", source: "authentik" };
			}
			if (!res.ok) {
				console.error(`[authentik] profile lookup failed: ${res.status}`);
				return { status: "error", error: "lookup_failed" };
			}
			user = (await res.json()) as AuthentikUser;
		}

		if (!user) {
			return { status: "not_found", source: "authentik" };
		}

		const groups = await resolveProfileGroups(user, sub);
		return {
			status: "found",
			profile: toMemberProfile(user, options.includeEmail, "authentik", groups),
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
			const active = activeMockMembers();
			return {
				memberCount: active.filter((m) =>
					m.groups.some((g) => g.toLowerCase() === mitgliederName),
				).length,
				groupCount: new Set(active.flatMap((m) => m.groups)).size,
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

function weeksAgoDate(weeks: number): Date {
	return new Date(Date.now() - weeks * 7 * 86_400_000);
}

function parseDateJoined(value: string | undefined): Date | null {
	if (!value?.trim()) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

const MOCK_RECENT_JOINED: Record<string, string> = {
	"mock-1": daysAgoIso(3),
	"mock-3": daysAgoIso(14),
	"mock-5": daysAgoIso(28),
	"mock-2": daysAgoIso(45),
};

/**
 * Page through `/core/users/?ordering=-date_joined` until past cutoff.
 * Used when group `users_obj` omits `date_joined`.
 */
async function fetchUsersJoinedSince(
	cutoff: Date,
): Promise<Map<string, AuthentikUser>> {
	const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
	const headers = authHeaders();
	const byPk = new Map<string, AuthentikUser>();
	let page = 1;

	for (;;) {
		const url = new URL(`${base}/api/v3/core/users/`);
		url.searchParams.set("page", String(page));
		url.searchParams.set("page_size", "100");
		url.searchParams.set("ordering", "-date_joined");
		url.searchParams.set("is_active", "true");

		const res = await fetch(url, { headers });
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			console.error(
				`[authentik] users date_joined page=${page} → ${res.status}`,
				detail.slice(0, 300),
			);
			throw new Error(`Authentik request failed (${res.status}): /users/`);
		}

		const body = (await res.json()) as AuthentikPaginated<AuthentikUser>;
		const results = body.results ?? [];
		if (results.length === 0) break;

		let reachedOlder = false;
		for (const user of results) {
			if (user.pk == null) continue;
			const joined = parseDateJoined(user.date_joined);
			if (!joined || joined < cutoff) {
				reachedOlder = true;
				continue;
			}
			byPk.set(String(user.pk), user);
		}

		if (reachedOlder) break;
		const next = body.pagination?.next;
		if (!next || next === page) break;
		page = next;
	}

	return byPk;
}

/**
 * Mitglieder whose Authentik account was created within the last N weeks.
 * Prefer `date_joined` from group `users_obj`; fall back to users list ordered by join date.
 */
export async function listRecentOnboardingMembersFromAuthentik(
	weeks: number = RECENT_ONBOARDING_WEEKS,
): Promise<RecentOnboardingMembersResult> {
	const lookback =
		Number.isFinite(weeks) && weeks > 0 ? weeks : RECENT_ONBOARDING_WEEKS;
	const cutoff = weeksAgoDate(lookback);

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const members: RecentOnboardingMember[] = activeMockMembers()
				.filter((member) => hasMitgliederGroup(member.groups))
				.flatMap((member) => {
					const dateJoined = MOCK_RECENT_JOINED[member.id];
					if (!dateJoined) return [];
					const joined = parseDateJoined(dateJoined);
					if (!joined || joined < cutoff) return [];
					const profile = MOCK_PROFILES[member.id];
					return [
						{
							id: member.id,
							name: member.name,
							username: profile?.username ?? null,
							dateJoined,
							onboardingStage: profile?.onboardingStage ?? 0,
						},
					];
				})
				.sort((a, b) => b.dateJoined.localeCompare(a.dateJoined));

			return { members, weeks: lookback, source: "mock" };
		}
		throw new Error("authentik_api_missing");
	}

	const mitgliederName = serverConfig.groups.mitglieder.trim();
	if (!mitgliederName) {
		throw new Error("mitglieder_group_missing");
	}

	let groups: AuthentikGroup[];
	try {
		groups = await fetchAllPages<AuthentikGroup>(
			"/api/v3/core/groups/?include_users=true",
		);
	} catch (err) {
		console.error("[authentik] failed to list recent onboarding members", err);
		throw err;
	}

	const mitgliederByPk = new Map<string, AuthentikUser>();
	for (const group of groups) {
		if (!matchesMitgliederGroup(group.name)) continue;
		for (const user of group.users_obj ?? []) {
			if (user.pk == null) continue;
			mitgliederByPk.set(String(user.pk), user);
		}
	}

	const missingJoinDate = [...mitgliederByPk.values()].some(
		(user) => !parseDateJoined(user.date_joined),
	);

	let joinDatesByPk: Map<string, AuthentikUser> | null = null;
	if (missingJoinDate) {
		try {
			joinDatesByPk = await fetchUsersJoinedSince(cutoff);
		} catch (err) {
			console.error(
				"[authentik] date_joined fallback via /users/ failed",
				err,
			);
			throw err;
		}
	}

	const members: RecentOnboardingMember[] = [];
	for (const [pk, groupUser] of mitgliederByPk) {
		if (groupUser.is_active === false) continue;
		if (groupUser.type === "service_account") continue;

		const detail = joinDatesByPk?.get(pk) ?? groupUser;
		if (detail.is_active === false) continue;
		if (detail.type === "service_account") continue;

		const joined = parseDateJoined(detail.date_joined);
		if (!joined || joined < cutoff) continue;

		members.push({
			id: pk,
			name: displayName(detail.name ? detail : groupUser),
			username: (detail.username ?? groupUser.username)?.trim() || null,
			dateJoined: joined.toISOString(),
			onboardingStage: parseOnboardingStage(
				(detail.attributes ?? groupUser.attributes)?.[ATTR.onboardingStage],
			),
		});
	}

	members.sort((a, b) => b.dateJoined.localeCompare(a.dateJoined));
	return { members, weeks: lookback, source: "authentik" };
}

async function resolveUserForMutation(
	id: string,
): Promise<AuthentikUser | null> {
	const sub = id.trim();
	if (!sub) return null;
	const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";

	if (UUID_RE.test(sub)) {
		const url = new URL(`${base}/api/v3/core/users/`);
		url.searchParams.set("uuid", sub);
		url.searchParams.set("page_size", "5");
		const res = await fetch(url, { headers: authHeaders() });
		if (!res.ok) {
			throw new Error(`Authentik user lookup failed (${res.status})`);
		}
		const body = (await res.json()) as AuthentikPaginated<AuthentikUser>;
		return (
			body.results?.find((entry) => entry.uuid === sub) ??
			body.results?.[0] ??
			null
		);
	}

	const res = await fetch(`${base}/api/v3/core/users/${encodeURIComponent(sub)}/`, {
		headers: authHeaders(),
	});
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error(`Authentik user lookup failed (${res.status})`);
	}
	return (await res.json()) as AuthentikUser;
}

/**
 * Set Authentik `attributes.onboardingStage` (0–4 human ladder).
 * Merges existing attributes so Connect/HR fields are preserved.
 */
export async function updateMemberOnboardingStage(
	memberId: string,
	stage: OnboardingStage,
	options: { includeEmail: boolean },
): Promise<UpdateMemberOnboardingStageResult> {
	const id = memberId.trim();
	if (!id) return { success: false, error: "invalid_id" };

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const ok = mockUpdateMemberOnboardingStage(id, stage);
			if (!ok) return { success: false, error: "user_not_found" };
			const result = await getMemberProfileByUuid(id, options);
			if (result.status !== "found") {
				return { success: false, error: "user_not_found" };
			}
			return { success: true, profile: result.profile };
		}
		return { success: false, error: "authentik_api_missing" };
	}

	try {
		const user = await resolveUserForMutation(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
		const currentRes = await fetch(
			`${base}/api/v3/core/users/${user.pk}/`,
			{ headers: authHeaders() },
		);
		if (currentRes.status === 404) {
			return { success: false, error: "user_not_found" };
		}
		if (!currentRes.ok) {
			console.error(
				`[authentik] onboarding stage read failed: ${currentRes.status}`,
			);
			return { success: false, error: "update_failed" };
		}
		const current = (await currentRes.json()) as AuthentikUser;

		const patchRes = await fetch(`${base}/api/v3/core/users/${user.pk}/`, {
			method: "PATCH",
			headers: {
				...authHeaders(),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				attributes: {
					...(current.attributes ?? {}),
					[ATTR.onboardingStage]: stage,
				},
			}),
		});
		if (!patchRes.ok) {
			const detail = await patchRes.text().catch(() => "");
			console.error(
				`[authentik] onboarding stage patch failed: ${patchRes.status}`,
				detail.slice(0, 300),
			);
			return { success: false, error: "update_failed" };
		}

		const result = await getMemberProfileByUuid(id, options);
		if (result.status !== "found") {
			return { success: false, error: "update_failed" };
		}
		return { success: true, profile: result.profile };
	} catch (err) {
		console.error("[authentik] onboarding stage update error", err);
		return { success: false, error: "update_failed" };
	}
}
