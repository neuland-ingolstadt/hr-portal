import {
	AUTHENTIK_UUID_RE,
	type AuthentikGroup,
	type AuthentikPaginated,
	type AuthentikUser,
	isAuthentikApiConfigured,
} from "#/lib/authentik-api.server";
import {
	loadActiveDirectoryMembers,
	loadMitgliederDirectoryMembers,
} from "#/lib/authentik-members/directory.server";
import {
	MOCK_CONTACT_BY_ID,
	MOCK_PROFILES,
} from "#/lib/authentik-members/mock.server";
import {
	ATTR,
	authHeaders,
	buildGroupNameIndex,
	displayName,
	fetchAllPages,
	resolveUserGroups,
} from "#/lib/authentik-members/shared.server";
import { serverConfig } from "#/lib/config";
import type { MemberProfile, MemberProfileResult } from "#/lib/members";
import type { OnboardingContactRef } from "#/lib/onboarding";
import {
	parseOnboardingContactId,
	parseOnboardingStage,
} from "#/lib/onboarding";

export function attributeString(
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
export function isGitHubConnected(
	attributes: Record<string, unknown> | undefined,
): boolean {
	return Boolean(
		attributeString(attributes, ATTR.githubUsername) &&
			attributeString(attributes, ATTR.githubId),
	);
}

export function isDiscordConnected(
	attributes: Record<string, unknown> | undefined,
): boolean {
	return Boolean(
		attributeString(attributes, ATTR.discordUsername) &&
			attributeString(attributes, ATTR.discordId),
	);
}

/** Authentik admin UI deep links for a user PK (browser-facing public origin). */
export function authentikAdminUrls(pk: number | string | null | undefined): {
	user: string | null;
	groups: string | null;
} {
	if (pk == null || pk === "") return { user: null, groups: null };
	const base =
		(
			serverConfig.authentik.publicUrl || serverConfig.authentik.apiUrl
		)?.replace(/\/$/, "") ?? "";
	if (!base) return { user: null, groups: null };
	const user = `${base}/if/admin/#/identity/users/${pk}`;
	const groupsTab = encodeURIComponent(JSON.stringify({ page: "page-groups" }));
	return {
		user,
		groups: `${user};${groupsTab}`,
	};
}

export function toMemberProfile(
	user: AuthentikUser,
	includeEmail: boolean,
	source: MemberProfile["source"],
	groups: string[],
	onboardingContact: OnboardingContactRef | null = null,
): MemberProfile {
	const id =
		user.uuid ??
		(user.pk != null ? String(user.pk) : user.username) ??
		"unknown";
	const email = user.email?.trim() || null;
	const admin = authentikAdminUrls(user.pk);
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
		onboardingContact:
			onboardingContact ??
			contactRefFromId(contactIdFromAttributes(user.attributes)),
		authentikAdminUrl: admin.user,
		authentikAdminGroupsUrl: admin.groups,
		source,
	};
}

export function contactIdFromAttributes(
	attributes: Record<string, unknown> | undefined,
): string | null {
	return parseOnboardingContactId(attributes?.[ATTR.onboardingContact]);
}

export function contactRefFromId(
	id: string | null,
): OnboardingContactRef | null {
	if (!id) return null;
	return { id, name: id, username: null };
}

export function contactRefFromUser(
	user: AuthentikUser,
): OnboardingContactRef | null {
	const id = user.uuid?.trim();
	if (!id) return null;
	return {
		id,
		name: displayName(user),
		username: user.username?.trim() || null,
	};
}

export async function resolveOnboardingContactRef(
	contactId: string | null,
	contacts?: Map<string, OnboardingContactRef>,
): Promise<OnboardingContactRef | null> {
	if (!contactId) return null;
	const fromIndex = contacts?.get(contactId);
	if (fromIndex) return fromIndex;

	if (!isAuthentikApiConfigured()) {
		return MOCK_CONTACT_BY_ID[contactId] ?? contactRefFromId(contactId);
	}

	try {
		const user = await resolveUserForMutation(contactId);
		const ref = user ? contactRefFromUser(user) : null;
		return ref ?? contactRefFromId(contactId);
	} catch {
		return contactRefFromId(contactId);
	}
}

/**
 * Prefer groups already resolved in a directory cache; otherwise map
 * Authentik group UUIDs via a fresh groups index.
 */
export async function resolveProfileGroups(
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

		if (AUTHENTIK_UUID_RE.test(sub)) {
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
		const contactId = contactIdFromAttributes(user.attributes);
		const onboardingContact = await resolveOnboardingContactRef(contactId);
		return {
			status: "found",
			profile: toMemberProfile(
				user,
				options.includeEmail,
				"authentik",
				groups,
				onboardingContact,
			),
		};
	} catch (err) {
		console.error("[authentik] profile lookup error", err);
		return { status: "error", error: "lookup_failed" };
	}
}

export async function resolveUserForMutation(
	id: string,
): Promise<AuthentikUser | null> {
	const sub = id.trim();
	if (!sub) return null;
	const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";

	if (AUTHENTIK_UUID_RE.test(sub)) {
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

	const res = await fetch(
		`${base}/api/v3/core/users/${encodeURIComponent(sub)}/`,
		{
			headers: authHeaders(),
		},
	);
	if (res.status === 404) return null;
	if (!res.ok) {
		throw new Error(`Authentik user lookup failed (${res.status})`);
	}
	return (await res.json()) as AuthentikUser;
}
