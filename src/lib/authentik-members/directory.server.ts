import {
	type AuthentikGroup,
	type AuthentikUser,
	isAuthentikApiConfigured,
} from "#/lib/authentik-api.server";
import { onDirectoryInvalidate } from "#/lib/authentik-members/invalidation.server";
import { activeMockMembers } from "#/lib/authentik-members/mock.server";
import {
	buildGroupNameIndex,
	displayName,
	fetchAllPages,
	hasMitgliederGroup,
	hasTechnicalUsersGroup,
	matchesMitgliederGroup,
	toMembersResult,
	usersToMembers,
} from "#/lib/authentik-members/shared.server";
import { serverConfig } from "#/lib/config";
import {
	classifyEasyVereinMemberStatus,
	type EasyVereinMembershipSnapshot,
	getEasyVereinMembershipSnapshot,
	isEasyVereinConfigured,
} from "#/lib/easyverein.server";
import type { Member, MembersResult } from "#/lib/members";
import type {
	OffboardingCandidate,
	OffboardingCandidatesResult,
	OffboardingReason,
} from "#/lib/offboarding";

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

/** Full active-user dump - used by offboarding (needs non-Mitglieder too). */
const directoryCache: DirectoryCache = emptyCache();

/** Mitglieder-only snapshot - fast group+users path for /members. */
const mitgliederCache: DirectoryCache = emptyCache();

function invalidateCache(cache: DirectoryCache): void {
	cache.expiresAt = 0;
	cache.value = { members: [], source: "mock" };
	cache.inflight = null;
}

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

export async function loadActiveDirectoryMembers(): Promise<DirectorySnapshot> {
	return loadCachedSnapshot(directoryCache, fetchActiveDirectoryMembers);
}

export async function loadMitgliederDirectoryMembers(): Promise<DirectorySnapshot> {
	return loadCachedSnapshot(mitgliederCache, fetchMitgliederDirectoryMembers);
}

/**
 * Full active-user dump. Expensive (~seconds) - keep for offboarding only.
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
 * Mitglieder via groups+users inversion - avoids the slow paginated /users dump.
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
		// Single list call with expanded users (~1s) - cheaper than /users pages.
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

/** Warm the active-user directory cache used by offboarding (expensive). */
export async function warmActiveDirectoryForOffboarding(): Promise<void> {
	await loadActiveDirectoryMembers();
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

onDirectoryInvalidate(() => {
	invalidateCache(directoryCache);
	invalidateCache(mitgliederCache);
});
