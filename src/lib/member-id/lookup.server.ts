import {
	type AuthentikGroup,
	type AuthentikPaginated,
	type AuthentikUser,
	authentikApiBase,
	authentikAuthHeaders,
	authentikGroupKey,
	isAuthentikApiConfigured,
} from "#/lib/authentik-api.server";
import { serverConfig } from "#/lib/config";
import type { LookupMemberResult, ScannedMember } from "#/lib/member-id/types";

const MOCK_BY_ID: Record<string, ScannedMember> = {
	"mock-1": {
		id: "mock-1",
		name: "Alex Berger",
		groups: ["HR", "Mitglieder"],
		isActive: true,
		isMitglied: true,
		source: "mock",
	},
	"mock-2": {
		id: "mock-2",
		name: "Sam Kovacs",
		groups: ["Vorstand", "Mitglieder"],
		isActive: true,
		isMitglied: true,
		source: "mock",
	},
	"mock-3": {
		id: "mock-3",
		name: "Jordan Weiss",
		groups: ["Mitglieder"],
		isActive: true,
		isMitglied: true,
		source: "mock",
	},
};

function displayName(user: AuthentikUser): string {
	const name = user.name?.trim();
	if (name) return name;
	const username = user.username?.trim();
	if (username) return username;
	return user.uuid ?? (user.pk != null ? String(user.pk) : "Unbekannt");
}

function hasMitgliederGroup(groups: string[]): boolean {
	const expected = serverConfig.groups.mitglieder.trim().toLowerCase();
	if (!expected) return false;
	return groups.some((group) => group.trim().toLowerCase() === expected);
}

const GROUP_CACHE_TTL_MS = 60_000;

const groupCache: {
	expiresAt: number;
	value: Map<string, string>;
	inflight: Promise<Map<string, string>> | null;
} = {
	expiresAt: 0,
	value: new Map(),
	inflight: null,
};

async function fetchAllGroupsUncached(): Promise<Map<string, string>> {
	const base = authentikApiBase();
	const groupNamesById = new Map<string, string>();
	let page = 1;

	for (;;) {
		const url = new URL(`${base}/api/v3/core/groups/`);
		url.searchParams.set("page", String(page));
		url.searchParams.set("page_size", "100");

		const res = await fetch(url, { headers: authentikAuthHeaders() });
		if (!res.ok) {
			throw new Error(`Authentik groups failed (${res.status})`);
		}

		const body = (await res.json()) as AuthentikPaginated<AuthentikGroup> & {
			pagination?: { next?: number | null };
		};
		for (const group of body.results ?? []) {
			const name = group.name?.trim();
			if (!name) continue;
			const key = authentikGroupKey(group);
			if (key) groupNamesById.set(key, name);
			if (group.pk != null) groupNamesById.set(String(group.pk), name);
		}

		const next = body.pagination?.next;
		if (!next || next === page) break;
		page = next;
	}

	return groupNamesById;
}

async function fetchAllGroups(): Promise<Map<string, string>> {
	const now = Date.now();
	if (groupCache.expiresAt > now) return groupCache.value;
	if (groupCache.inflight) return groupCache.inflight;

	groupCache.inflight = fetchAllGroupsUncached()
		.then((value) => {
			groupCache.value = value;
			groupCache.expiresAt = Date.now() + GROUP_CACHE_TTL_MS;
			return value;
		})
		.finally(() => {
			groupCache.inflight = null;
		});

	return groupCache.inflight;
}

function resolveUserGroups(
	user: AuthentikUser,
	groupNamesById: Map<string, string>,
): string[] {
	const names: string[] = [];
	for (const entry of user.groups ?? []) {
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
			const key = authentikGroupKey(entry);
			if (key) {
				const mapped = groupNamesById.get(key);
				if (mapped) names.push(mapped);
			}
		}
	}
	return [...new Set(names)].sort((a, b) => a.localeCompare(b, "de"));
}

/**
 * Look up a directory user by Authentik UUID (OIDC `sub` from Member-ID QR).
 * Uses query `?uuid=` - path-by-sub is unreliable.
 */
export async function lookupMemberByUuid(
	uuid: string,
): Promise<LookupMemberResult> {
	const sub = uuid.trim();
	if (!sub) {
		return { status: "not_found", source: "authentik" };
	}

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const mock = MOCK_BY_ID[sub];
			if (mock) return { status: "found", member: mock };
			return { status: "not_found", source: "mock" };
		}
		return { status: "error", error: "authentik_api_missing" };
	}

	try {
		const base = authentikApiBase();
		const url = new URL(`${base}/api/v3/core/users/`);
		url.searchParams.set("uuid", sub);
		url.searchParams.set("page_size", "5");

		const res = await fetch(url, { headers: authentikAuthHeaders() });
		if (!res.ok) {
			console.error(`[scanner] user lookup failed: ${res.status}`);
			return { status: "error", error: "lookup_failed" };
		}

		const body = (await res.json()) as AuthentikPaginated<AuthentikUser>;
		const user =
			body.results?.find((entry) => entry.uuid === sub) ?? body.results?.[0];

		if (!user) {
			return { status: "not_found", source: "authentik" };
		}

		const groupNamesById = await fetchAllGroups();
		const groups = resolveUserGroups(user, groupNamesById);

		return {
			status: "found",
			member: {
				id: user.uuid ?? sub,
				name: displayName(user),
				groups,
				isActive: user.is_active !== false,
				isMitglied: hasMitgliederGroup(groups),
				source: "authentik",
			},
		};
	} catch (err) {
		console.error("[scanner] user lookup error", err);
		return { status: "error", error: "lookup_failed" };
	}
}

export async function fetchMemberIdPublicKey(): Promise<string> {
	const base = serverConfig.memberIdApiBase.replace(/\/$/, "");
	if (!base) {
		throw new Error("member_id_api_missing");
	}

	const res = await fetch(`${base}/api/public-key`, {
		method: "GET",
		headers: { Accept: "text/plain" },
	});

	if (!res.ok) {
		throw new Error(`member_id_public_key_failed:${res.status}`);
	}

	const publicKey = (await res.text()).trim();
	if (!/^[0-9a-fA-F]+$/.test(publicKey)) {
		throw new Error("member_id_public_key_invalid");
	}

	return publicKey;
}
