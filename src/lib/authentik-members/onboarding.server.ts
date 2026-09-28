import {
	AUTHENTIK_UUID_RE,
	type AuthentikGroup,
	type AuthentikPaginated,
	type AuthentikUser,
	isAuthentikApiConfigured,
} from "#/lib/authentik-api.server";
import { onDirectoryInvalidate } from "#/lib/authentik-members/invalidation.server";
import {
	activeMockMembers,
	MOCK_CONTACT_BY_ID,
	MOCK_PROFILES,
	MOCK_RECENT_JOINED,
	mockUpdateMemberOnboardingContact,
	mockUpdateMemberOnboardingStage,
} from "#/lib/authentik-members/mock.server";
import {
	contactIdFromAttributes,
	contactRefFromId,
	contactRefFromUser,
	getMemberProfileByUuid,
	resolveUserForMutation,
} from "#/lib/authentik-members/profile.server";
import {
	ATTR,
	authHeaders,
	displayName,
	fetchGroupByName,
	fetchJson,
	hasMitgliederGroup,
	matchesMitgliederGroup,
	userPksFromGroup,
} from "#/lib/authentik-members/shared.server";
import {
	fetchUsersJoinedSince,
	parseDateJoined,
	weeksAgoDate,
} from "#/lib/authentik-members/stats.server";
import { serverConfig } from "#/lib/config";
import type {
	OnboardingContactRef,
	OnboardingContactsResult,
	OnboardingStage,
	RecentOnboardingMember,
	RecentOnboardingMembersResult,
	UpdateMemberOnboardingContactResult,
	UpdateMemberOnboardingStageResult,
} from "#/lib/onboarding";
import {
	parseOnboardingStage,
	RECENT_ONBOARDING_WEEKS,
} from "#/lib/onboarding";

export function configuredStaffGroupNames(): string[] {
	return [
		serverConfig.groups.hr,
		serverConfig.groups.vorstand,
		serverConfig.groups.admin,
	]
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

export function matchesStaffContactGroup(name: string | undefined): boolean {
	if (!name?.trim()) return false;
	const normalized = name.trim().toLowerCase();
	return configuredStaffGroupNames().some(
		(expected) => expected.toLowerCase() === normalized,
	);
}

/**
 * Group `users_obj` often omits `uuid`; hydrate via `/core/users/{pk}/`
 * so contact ids match OIDC `sub`.
 */
export async function hydrateUserUuid(
	user: AuthentikUser,
): Promise<AuthentikUser> {
	if (user.uuid?.trim() || user.pk == null || !isAuthentikApiConfigured()) {
		return user;
	}
	const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
	const res = await fetch(`${base}/api/v3/core/users/${user.pk}/`, {
		headers: authHeaders(),
	});
	if (!res.ok) return user;
	const detail = (await res.json()) as AuthentikUser;
	return {
		...user,
		uuid: detail.uuid ?? user.uuid,
		name: detail.name ?? user.name,
		username: detail.username ?? user.username,
		email: detail.email ?? user.email,
		attributes: detail.attributes ?? user.attributes,
	};
}

/** Staff group PK membership only — no include_users, no uuid hydrate. */
export async function loadStaffMemberPks(): Promise<Set<string>> {
	const names = configuredStaffGroupNames();
	const groups = await Promise.all(names.map((name) => fetchGroupByName(name)));
	const pks = new Set<string>();
	for (let i = 0; i < groups.length; i++) {
		const group = groups[i];
		const requested = names[i] ?? "?";
		if (!group) {
			console.warn(
				`[onboarding.contact] staff group not found: requested=${requested}`,
			);
			continue;
		}
		if (!matchesStaffContactGroup(group.name)) {
			console.warn(
				`[onboarding.contact] staff group name mismatch: requested=${requested} got=${group.name ?? "?"}`,
			);
			continue;
		}
		const groupPks = userPksFromGroup(group);
		console.info(
			`[onboarding.contact] staff group ${group.name}: ${groupPks.size} users (users_obj=${group.users_obj?.length ?? 0}, users=${group.users?.length ?? 0})`,
		);
		for (const pk of groupPks) pks.add(pk);
	}
	return pks;
}

export async function isAllowedOnboardingContact(
	contactId: string,
	contactUser: AuthentikUser,
): Promise<{ allowed: boolean; reason: string }> {
	const pk = contactUser.pk != null ? String(contactUser.pk) : null;
	const uuid = contactUser.uuid?.trim() || null;

	// Same source as the profile picker (cached, include_users).
	try {
		const staffContacts = await loadStaffContactsCached();
		if (staffContacts.has(contactId)) {
			return { allowed: true, reason: "staff_contacts_cache_id" };
		}
		if (uuid && staffContacts.has(uuid)) {
			return { allowed: true, reason: "staff_contacts_cache_uuid" };
		}
	} catch (err) {
		console.warn("[onboarding.contact] staff contacts cache failed", err);
	}

	const staffPks = await loadStaffMemberPks();
	if (pk && staffPks.has(pk)) {
		return { allowed: true, reason: "staff_group_pk" };
	}

	return {
		allowed: false,
		reason: `not_in_staff pk=${pk ?? "?"} uuid=${uuid ?? "?"} contactId=${contactId} staffContacts/staffPks checked`,
	};
}

const STAFF_CONTACTS_CACHE_TTL_MS = 5 * 60_000;

let staffContactsCache: {
	expiresAt: number;
	value: Map<string, OnboardingContactRef> | null;
	inflight: Promise<Map<string, OnboardingContactRef>> | null;
} = { expiresAt: 0, value: null, inflight: null };

export function invalidateStaffContactsCache(): void {
	staffContactsCache = { expiresAt: 0, value: null, inflight: null };
}

export async function collectStaffContacts(
	groups: AuthentikGroup[],
): Promise<Map<string, OnboardingContactRef>> {
	const byPk = new Map<string, AuthentikUser>();
	for (const group of groups) {
		if (!matchesStaffContactGroup(group.name)) continue;
		for (const user of group.users_obj ?? []) {
			if (user.is_active === false) continue;
			if (user.type === "service_account") continue;
			if (user.pk == null) continue;
			byPk.set(String(user.pk), user);
		}
	}

	const byId = new Map<string, OnboardingContactRef>();
	const missingUuid: AuthentikUser[] = [];
	for (const user of byPk.values()) {
		const ref = contactRefFromUser(user);
		if (ref) byId.set(ref.id, ref);
		else missingUuid.push(user);
	}

	if (missingUuid.length > 0) {
		await Promise.all(
			missingUuid.map(async (user) => {
				const hydrated = await hydrateUserUuid(user);
				const ref = contactRefFromUser(hydrated);
				if (ref) byId.set(ref.id, ref);
			}),
		);
	}
	return byId;
}

/**
 * HR / Vorstand / Admin contacts for the profile picker (cached ~5 min).
 * Avoids the full `groups/?include_users=true` dump.
 */
export async function loadStaffContactsCached(): Promise<
	Map<string, OnboardingContactRef>
> {
	const now = Date.now();
	if (staffContactsCache.expiresAt > now && staffContactsCache.value) {
		return staffContactsCache.value;
	}
	if (staffContactsCache.inflight) return staffContactsCache.inflight;

	staffContactsCache.inflight = (async () => {
		const groups = (
			await Promise.all(
				configuredStaffGroupNames().map((name) =>
					fetchGroupByName(name, { includeUsers: true }),
				),
			)
		).filter((group): group is AuthentikGroup => group != null);
		const value = await collectStaffContacts(groups);
		staffContactsCache.value = value;
		staffContactsCache.expiresAt = Date.now() + STAFF_CONTACTS_CACHE_TTL_MS;
		return value;
	})().finally(() => {
		staffContactsCache.inflight = null;
	});

	return staffContactsCache.inflight;
}

/**
 * Viewer identity for onboarding contact filters / “assign to me”.
 * Prefer session `uuid` (OIDC claim); if missing, resolve once via Authentik email.
 */
export async function resolveViewerContactIds(actor: {
	sub: string;
	uuid?: string | null;
	email?: string;
}): Promise<{ viewerContactIds: string[]; myContactId: string | null }> {
	if (!isAuthentikApiConfigured() && serverConfig.authMock) {
		const mockKey = actor.uuid?.trim() || actor.sub;
		const mock = MOCK_CONTACT_BY_ID[mockKey];
		const id = mock?.id ?? mockKey;
		return { viewerContactIds: [id], myContactId: id };
	}

	let uuid = actor.uuid?.trim() || null;
	if ((!uuid || !AUTHENTIK_UUID_RE.test(uuid)) && actor.email?.trim()) {
		const byEmail = await findAuthentikUserByEmail(actor.email);
		const resolved = byEmail?.uuid?.trim() || null;
		if (resolved && AUTHENTIK_UUID_RE.test(resolved)) {
			console.info(
				"[onboarding.contact] viewer uuid via email (session claim missing)",
				{ uuid: resolved },
			);
			uuid = resolved;
		}
	}

	if (!uuid || !AUTHENTIK_UUID_RE.test(uuid)) {
		console.warn(
			"[onboarding.contact] session missing Authentik uuid — re-login or check OIDC uuid claim",
			{ hasUuid: Boolean(uuid), hasEmail: Boolean(actor.email?.trim()) },
		);
		return { viewerContactIds: [], myContactId: null };
	}

	return { viewerContactIds: [uuid], myContactId: uuid };
}

export async function findAuthentikUserByEmail(
	email: string,
): Promise<AuthentikUser | null> {
	const needle = email.trim().toLowerCase();
	if (!needle || !isAuthentikApiConfigured()) return null;
	try {
		const body = await fetchJson<AuthentikPaginated<AuthentikUser>>(
			"/api/v3/core/users/",
			{
				email: email.trim(),
				page: "1",
				page_size: "10",
			},
		);
		const results = body.results ?? [];
		return (
			results.find((entry) => entry.email?.trim().toLowerCase() === needle) ??
			results[0] ??
			null
		);
	} catch (err) {
		console.warn("[onboarding.contact] email lookup failed", err);
		return null;
	}
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
					const contact = profile?.onboardingContact ?? null;
					return [
						{
							id: member.id,
							name: member.name,
							username: profile?.username ?? null,
							dateJoined,
							onboardingStage: profile?.onboardingStage ?? 0,
							onboardingContactId: contact?.id ?? null,
							onboardingContactName: contact?.name ?? null,
						},
					];
				})
				.sort((a, b) => b.dateJoined.localeCompare(a.dateJoined));

			return {
				members,
				weeks: lookback,
				source: "mock",
				viewerContactIds: [],
			};
		}
		throw new Error("authentik_api_missing");
	}

	const mitgliederName = serverConfig.groups.mitglieder.trim();
	if (!mitgliederName) {
		throw new Error("mitglieder_group_missing");
	}

	// Two light calls only — no staff-group expand on the list path.
	let mitgliederGroup: AuthentikGroup | null;
	let recentByPk: Map<string, AuthentikUser>;
	try {
		[mitgliederGroup, recentByPk] = await Promise.all([
			fetchGroupByName(mitgliederName),
			fetchUsersJoinedSince(cutoff),
		]);
	} catch (err) {
		console.error("[authentik] failed to list recent onboarding members", err);
		throw err;
	}

	if (!mitgliederGroup || !matchesMitgliederGroup(mitgliederGroup.name)) {
		console.warn(`[authentik] mitglieder group not found: ${mitgliederName}`);
		return {
			members: [],
			weeks: lookback,
			source: "authentik",
			viewerContactIds: [],
		};
	}

	const mitgliederPks = userPksFromGroup(mitgliederGroup);
	const members: RecentOnboardingMember[] = [];
	for (const [pk, user] of recentByPk) {
		if (!mitgliederPks.has(pk)) continue;
		if (user.is_active === false) continue;
		if (user.type === "service_account") continue;

		const joined = parseDateJoined(user.date_joined);
		if (!joined || joined < cutoff) continue;

		members.push({
			id: pk,
			name: displayName(user),
			username: user.username?.trim() || null,
			dateJoined: joined.toISOString(),
			onboardingStage: parseOnboardingStage(
				user.attributes?.[ATTR.onboardingStage],
			),
			onboardingContactId: contactIdFromAttributes(user.attributes),
			// Names resolved on profile / after assign — keep the list path to 2 API calls.
			onboardingContactName: null,
		});
	}

	members.sort((a, b) => b.dateJoined.localeCompare(a.dateJoined));
	return {
		members,
		weeks: lookback,
		source: "authentik",
		viewerContactIds: [],
	};
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
		const currentRes = await fetch(`${base}/api/v3/core/users/${user.pk}/`, {
			headers: authHeaders(),
		});
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

/**
 * Staff who can be assigned as onboarding contacts (HR / Vorstand / Admin).
 */
export async function listOnboardingContactsFromAuthentik(): Promise<OnboardingContactsResult> {
	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const contacts = Object.values(MOCK_CONTACT_BY_ID).sort((a, b) =>
				a.name.localeCompare(b.name, "de"),
			);
			return {
				contacts,
				source: "mock",
				myContactId: null,
				viewerContactIds: [],
			};
		}
		throw new Error("authentik_api_missing");
	}

	try {
		const contacts = [...(await loadStaffContactsCached()).values()].sort(
			(a, b) => a.name.localeCompare(b.name, "de"),
		);
		return {
			contacts,
			source: "authentik",
			myContactId: null,
			viewerContactIds: [],
		};
	} catch (err) {
		console.error("[authentik] failed to list onboarding contacts", err);
		throw err;
	}
}

/** Staff contact email + display name for mentor assignment mail. */
export type OnboardingContactRecipient = {
	email: string;
	name: string;
};

/**
 * Resolve a staff contact's email for assignment notifications.
 * Returns null when the user or email is missing.
 */
export async function resolveOnboardingContactRecipient(
	contactId: string,
): Promise<OnboardingContactRecipient | null> {
	const id = contactId.trim();
	if (!id) return null;

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const contact = MOCK_CONTACT_BY_ID[id];
			if (!contact) return null;
			const profile = MOCK_PROFILES[id];
			const email =
				profile?.email?.trim() ||
				(contact.username ? `${contact.username}@neuland.local` : null);
			if (!email) return null;
			return { email, name: contact.name };
		}
		return null;
	}

	try {
		const user = await resolveUserForMutation(id);
		if (!user) return null;
		let hydrated = user;
		if (!user.email?.trim() || !user.uuid?.trim()) {
			hydrated = await hydrateUserUuid(user);
			// hydrateUserUuid skips when uuid is already set — force detail for email
			if (!hydrated.email?.trim() && user.pk != null) {
				const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
				const res = await fetch(`${base}/api/v3/core/users/${user.pk}/`, {
					headers: authHeaders(),
				});
				if (res.ok) {
					const detail = (await res.json()) as AuthentikUser;
					hydrated = {
						...hydrated,
						email: detail.email ?? hydrated.email,
						name: detail.name ?? hydrated.name,
						username: detail.username ?? hydrated.username,
						uuid: detail.uuid ?? hydrated.uuid,
					};
				}
			}
		}
		const email = hydrated.email?.trim();
		if (!email) return null;
		return { email, name: displayName(hydrated) };
	} catch (err) {
		console.warn("[onboarding.contact] recipient resolve failed", {
			contactId: id,
			err,
		});
		return null;
	}
}

/**
 * Set or clear Authentik `attributes.onboardingContact` (staff UUID).
 * Merges existing attributes so Connect/HR fields are preserved.
 */
export async function updateMemberOnboardingContact(
	memberId: string,
	contactId: string | null,
	options: { includeEmail: boolean },
): Promise<UpdateMemberOnboardingContactResult> {
	const id = memberId.trim();
	if (!id) return { success: false, error: "invalid_id" };

	const nextContactId = contactId?.trim() ? contactId.trim() : null;

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			if (nextContactId != null && !MOCK_CONTACT_BY_ID[nextContactId]) {
				return { success: false, error: "invalid_contact" };
			}
			const ok = mockUpdateMemberOnboardingContact(id, nextContactId);
			if (!ok) return { success: false, error: "user_not_found" };
			const result = await getMemberProfileByUuid(id, options);
			if (result.status !== "found") {
				return { success: false, error: "user_not_found" };
			}
			return {
				success: true,
				profile: result.profile,
				notifyEmailSent: null,
			};
		}
		return { success: false, error: "authentik_api_missing" };
	}

	try {
		let resolvedContact: OnboardingContactRef | null = null;
		if (nextContactId != null) {
			console.info("[onboarding.contact] assign", {
				memberId: id,
				contactId: nextContactId,
				staffGroups: configuredStaffGroupNames(),
			});

			let contactUser: AuthentikUser | null;
			try {
				contactUser = await resolveUserForMutation(nextContactId);
			} catch (err) {
				console.warn("[onboarding.contact] resolve threw", {
					contactId: nextContactId,
					err,
				});
				return { success: false, error: "invalid_contact" };
			}

			if (!contactUser || contactUser.pk == null) {
				console.warn("[onboarding.contact] resolve miss", {
					contactId: nextContactId,
					found: Boolean(contactUser),
					pk: contactUser?.pk ?? null,
					uuid: contactUser?.uuid ?? null,
				});
				return { success: false, error: "invalid_contact" };
			}

			const gate = await isAllowedOnboardingContact(nextContactId, contactUser);
			if (!gate.allowed) {
				console.warn("[onboarding.contact] rejected", {
					contactId: nextContactId,
					pk: contactUser.pk,
					uuid: contactUser.uuid ?? null,
					username: contactUser.username ?? null,
					reason: gate.reason,
				});
				return { success: false, error: "invalid_contact" };
			}

			console.info("[onboarding.contact] allowed", {
				contactId: nextContactId,
				pk: contactUser.pk,
				reason: gate.reason,
			});

			resolvedContact =
				contactRefFromUser(await hydrateUserUuid(contactUser)) ??
				contactRefFromId(nextContactId);
		}

		const user = await resolveUserForMutation(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const base = serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
		const currentRes = await fetch(`${base}/api/v3/core/users/${user.pk}/`, {
			headers: authHeaders(),
		});
		if (currentRes.status === 404) {
			return { success: false, error: "user_not_found" };
		}
		if (!currentRes.ok) {
			console.error(
				`[authentik] onboarding contact read failed: ${currentRes.status}`,
			);
			return { success: false, error: "update_failed" };
		}
		const current = (await currentRes.json()) as AuthentikUser;
		const attributes: Record<string, unknown> = {
			...(current.attributes ?? {}),
		};
		if (nextContactId) {
			attributes[ATTR.onboardingContact] = nextContactId;
		} else {
			delete attributes[ATTR.onboardingContact];
		}

		const patchRes = await fetch(`${base}/api/v3/core/users/${user.pk}/`, {
			method: "PATCH",
			headers: {
				...authHeaders(),
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ attributes }),
		});
		if (!patchRes.ok) {
			const detail = await patchRes.text().catch(() => "");
			console.error(
				`[authentik] onboarding contact patch failed: ${patchRes.status}`,
				detail.slice(0, 300),
			);
			return { success: false, error: "update_failed" };
		}

		const result = await getMemberProfileByUuid(id, options);
		if (result.status !== "found") {
			return { success: false, error: "update_failed" };
		}
		if (resolvedContact) {
			return {
				success: true,
				profile: {
					...result.profile,
					onboardingContact: resolvedContact,
				},
				notifyEmailSent: null,
			};
		}
		return {
			success: true,
			profile: result.profile,
			notifyEmailSent: null,
		};
	} catch (err) {
		console.error("[authentik] onboarding contact update error", err);
		return { success: false, error: "update_failed" };
	}
}

onDirectoryInvalidate(() => {
	invalidateStaffContactsCache();
});
