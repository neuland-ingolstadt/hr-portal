import {
	type AuthentikPaginated,
	type AuthentikUser,
	isAuthentikApiConfigured,
} from "#/lib/authentik-api.server";
import { onDirectoryInvalidate } from "#/lib/authentik-members/invalidation.server";
import {
	activeMockMembers,
	MOCK_PROFILES,
	MOCK_RECENT_JOINED,
} from "#/lib/authentik-members/mock.server";
import {
	ATTR,
	authHeaders,
	fetchGroupByName,
	hasMitgliederGroup,
	hasTechnicalUsersGroup,
	matchesMitgliederGroup,
	RESSORT_KEYS,
	userPksFromGroup,
} from "#/lib/authentik-members/shared.server";
import { serverConfig } from "#/lib/config";
import type { DirectoryStats } from "#/lib/members";
import {
	ONBOARDING_STAGE_MAX,
	parseOnboardingStage,
	RECENT_ONBOARDING_WEEKS,
} from "#/lib/onboarding";

export function memberHasRessort(groups: Iterable<string>): boolean {
	for (const group of groups) {
		if (RESSORT_KEYS.has(group.trim().toLowerCase())) return true;
	}
	return false;
}

/**
 * Dashboard KPIs - stale-while-revalidate.
 * Fresh: serve as-is. Soft-stale: serve + background refresh. Hard miss: await.
 */
const STATS_FRESH_MS = 5 * 60_000;
const STATS_MAX_AGE_MS = 30 * 60_000;

let statsCache: {
	fetchedAt: number;
	value: DirectoryStats | null;
	inflight: Promise<DirectoryStats> | null;
} = {
	fetchedAt: 0,
	value: null,
	inflight: null,
};

export function invalidateStatsCache(): void {
	statsCache = { fetchedAt: 0, value: null, inflight: null };
}

export function refreshDirectoryStats(): Promise<DirectoryStats> {
	if (statsCache.inflight) return statsCache.inflight;

	statsCache.inflight = (async () => {
		try {
			const value = await computeDirectoryStatsUncached();
			statsCache.value = value;
			statsCache.fetchedAt = Date.now();
			return value;
		} catch (err) {
			console.error("[authentik] failed to load directory stats", err);
			throw err;
		} finally {
			statsCache.inflight = null;
		}
	})();

	return statsCache.inflight;
}

export function mockDirectoryStats(): DirectoryStats {
	const cutoff = weeksAgoDate(RECENT_ONBOARDING_WEEKS);
	const active = activeMockMembers().filter(
		(m) => hasMitgliederGroup(m.groups) && !hasTechnicalUsersGroup(m.groups),
	);
	let ressortMemberCount = 0;
	let onboardingMemberCount = 0;

	for (const member of active) {
		if (memberHasRessort(member.groups)) ressortMemberCount += 1;
		const joined = parseDateJoined(MOCK_RECENT_JOINED[member.id]);
		if (!joined || joined < cutoff) continue;
		const stage = MOCK_PROFILES[member.id]?.onboardingStage ?? 0;
		if (stage < ONBOARDING_STAGE_MAX) onboardingMemberCount += 1;
	}

	return {
		memberCount: active.length,
		ressortMemberCount,
		onboardingMemberCount,
		source: "mock",
	};
}

export async function computeDirectoryStatsUncached(): Promise<DirectoryStats> {
	const mitgliederName = serverConfig.groups.mitglieder.trim();
	if (!mitgliederName) {
		throw new Error("mitglieder_group_missing");
	}

	const cutoff = weeksAgoDate(RECENT_ONBOARDING_WEEKS);
	const ressortNames = [...RESSORT_KEYS];
	const technicalUsersName = serverConfig.groups.technicalUsers.trim();

	// Group PK lists cover Mitglied/ressort/technical. Onboarding needs date_joined +
	// attributes (light users_obj omits both) - page recent /users/ in parallel.
	const [namedGroups, recentByPk] = await Promise.all([
		Promise.all([
			fetchGroupByName(mitgliederName),
			technicalUsersName
				? fetchGroupByName(technicalUsersName)
				: Promise.resolve(null),
			...ressortNames.map((name) => fetchGroupByName(name)),
		]),
		fetchUsersJoinedSince(cutoff),
	]);
	const [mitgliederGroup, technicalUsersGroup, ...ressortGroups] = namedGroups;

	if (!mitgliederGroup || !matchesMitgliederGroup(mitgliederGroup.name)) {
		console.warn(`[authentik] mitglieder group not found: ${mitgliederName}`);
		return {
			memberCount: 0,
			ressortMemberCount: 0,
			onboardingMemberCount: 0,
			source: "authentik",
		};
	}

	const technicalPks = userPksFromGroup(technicalUsersGroup);
	const mitgliederPks = new Set<string>();
	for (const pk of userPksFromGroup(mitgliederGroup)) {
		if (technicalPks.has(pk)) continue;
		mitgliederPks.add(pk);
	}

	const ressortPks = new Set<string>();
	for (const group of ressortGroups) {
		if (!group?.name || !RESSORT_KEYS.has(group.name.trim().toLowerCase())) {
			continue;
		}
		for (const pk of userPksFromGroup(group)) {
			ressortPks.add(pk);
		}
	}

	let ressortMemberCount = 0;
	for (const pk of mitgliederPks) {
		if (ressortPks.has(pk)) ressortMemberCount += 1;
	}

	let onboardingMemberCount = 0;
	for (const [pk, user] of recentByPk) {
		if (!mitgliederPks.has(pk)) continue;
		if (user.is_active === false) continue;
		if (user.type === "service_account") continue;
		const stage = parseOnboardingStage(user.attributes?.[ATTR.onboardingStage]);
		if (stage < ONBOARDING_STAGE_MAX) onboardingMemberCount += 1;
	}

	return {
		memberCount: mitgliederPks.size,
		ressortMemberCount,
		onboardingMemberCount,
		source: "authentik",
	};
}

/**
 * Dashboard KPIs: mitglieder + technical-users + ressort group lookups + recent
 * /users/ pages (SWR: fresh 5m / max 30m).
 * Avoids the full `groups/?include_users=true` directory dump.
 */
export async function getDirectoryStatsFromAuthentik(): Promise<DirectoryStats> {
	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			return mockDirectoryStats();
		}
		throw new Error("authentik_api_missing");
	}

	const now = Date.now();
	const cached = statsCache.value;
	if (cached) {
		const age = now - statsCache.fetchedAt;
		if (age < STATS_FRESH_MS) return cached;
		if (age < STATS_MAX_AGE_MS) {
			void refreshDirectoryStats().catch(() => {
				/* keep serving stale; error already logged */
			});
			return cached;
		}
	}

	return refreshDirectoryStats();
}

export function weeksAgoDate(weeks: number): Date {
	return new Date(Date.now() - weeks * 7 * 86_400_000);
}

export function parseDateJoined(value: string | undefined): Date | null {
	if (!value?.trim()) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

/**
 * Page through `/core/users/?ordering=-date_joined` until past cutoff.
 * Used when group `users_obj` omits `date_joined`.
 */
export async function fetchUsersJoinedSince(
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

onDirectoryInvalidate(() => {
	invalidateStatsCache();
});
