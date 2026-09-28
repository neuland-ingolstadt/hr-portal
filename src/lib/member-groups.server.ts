import {
	authentikAuthHeaders,
	authentikFetch,
	isAuthentikApiConfigured,
	resolveAuthentikGroupIdByName,
	resolveAuthentikUserByUuidOrPk,
} from "#/lib/authentik-api.server";
import {
	getMemberProfileByUuid,
	invalidateDirectoryCache,
	mockUpdateMemberAssignableGroups,
} from "#/lib/authentik-members.server";
import { serverConfig } from "#/lib/config";
import {
	canonicalizeAssignableGroup,
	filterCurrentAssignable,
	groupsEqualIgnoreOrder,
	isProtectedGroupName,
} from "#/lib/groups.server";
import type { UpdateMemberGroupsError } from "#/lib/member-groups";
import type { MemberProfile } from "#/lib/members";

export type { UpdateMemberGroupsError };

export type UpdateMemberGroupsResult =
	| { success: true; profile: MemberProfile }
	| { success: false; error: UpdateMemberGroupsError };

function parseDesiredAssignable(
	groups: string[],
):
	| { ok: true; desired: string[] }
	| { ok: false; error: "invalid_groups" | "protected_group" } {
	if (!Array.isArray(groups)) {
		return { ok: false, error: "invalid_groups" };
	}

	const desired = new Set<string>();
	for (const raw of groups) {
		if (typeof raw !== "string") {
			return { ok: false, error: "invalid_groups" };
		}
		const trimmed = raw.trim();
		if (!trimmed) continue;

		if (isProtectedGroupName(trimmed)) {
			return { ok: false, error: "protected_group" };
		}

		const canonical = canonicalizeAssignableGroup(trimmed);
		if (!canonical) {
			return { ok: false, error: "invalid_groups" };
		}
		desired.add(canonical);
	}

	return { ok: true, desired: [...desired] };
}

async function setGroupMembership(
	groupId: string,
	userPk: number | string,
	action: "add" | "remove",
): Promise<void> {
	const endpoint = action === "add" ? "add_user" : "remove_user";
	await authentikFetch(`/api/v3/core/groups/${groupId}/${endpoint}/`, {
		method: "POST",
		headers: authentikAuthHeaders(true),
		body: JSON.stringify({ pk: userPk }),
		responseType: "none",
	});
}

/**
 * Replace assignable Authentik groups (ressorts) for a member.
 * Protected groups (HR, Vorstand, Admin, Ehrenmitglied, technical-users, mitglieder)
 * are never touched.
 */
export async function updateMemberAssignableGroups(
	memberId: string,
	groups: string[],
	options: { includeEmail: boolean },
): Promise<UpdateMemberGroupsResult> {
	const id = memberId.trim();
	if (!id) return { success: false, error: "invalid_id" };

	const parsed = parseDesiredAssignable(groups);
	if (!parsed.ok) return { success: false, error: parsed.error };

	const desired = parsed.desired;

	if (!isAuthentikApiConfigured()) {
		if (serverConfig.authMock) {
			const ok = mockUpdateMemberAssignableGroups(id, desired);
			if (!ok) return { success: false, error: "user_not_found" };
			const profileResult = await getMemberProfileByUuid(id, {
				includeEmail: options.includeEmail,
			});
			if (profileResult.status !== "found") {
				return { success: false, error: "user_not_found" };
			}
			return { success: true, profile: profileResult.profile };
		}
		return { success: false, error: "authentik_api_missing" };
	}

	try {
		const user = await resolveAuthentikUserByUuidOrPk(id);
		if (!user || user.pk == null) {
			return { success: false, error: "user_not_found" };
		}

		const currentProfile = await getMemberProfileByUuid(id, {
			includeEmail: options.includeEmail,
		});
		if (currentProfile.status !== "found") {
			return {
				success: false,
				error:
					currentProfile.status === "not_found"
						? "user_not_found"
						: "update_failed",
			};
		}

		const currentAssignable = filterCurrentAssignable(
			currentProfile.profile.groups,
		);

		if (groupsEqualIgnoreOrder(currentAssignable, desired)) {
			return { success: true, profile: currentProfile.profile };
		}

		const currentSet = new Set(
			currentAssignable.map((group) => group.toLowerCase()),
		);
		const desiredSet = new Set(desired.map((group) => group.toLowerCase()));

		const toAdd = desired.filter(
			(group) => !currentSet.has(group.toLowerCase()),
		);
		const toRemove = currentAssignable.filter(
			(group) => !desiredSet.has(group.toLowerCase()),
		);

		for (const groupName of toRemove) {
			if (isProtectedGroupName(groupName)) {
				return { success: false, error: "protected_group" };
			}
			const groupId = await resolveAuthentikGroupIdByName(groupName);
			if (!groupId) {
				return { success: false, error: "group_not_found" };
			}
			await setGroupMembership(groupId, user.pk, "remove");
		}

		for (const groupName of toAdd) {
			if (isProtectedGroupName(groupName)) {
				return { success: false, error: "protected_group" };
			}
			const groupId = await resolveAuthentikGroupIdByName(groupName);
			if (!groupId) {
				return { success: false, error: "group_not_found" };
			}
			await setGroupMembership(groupId, user.pk, "add");
		}

		invalidateDirectoryCache();

		const refreshed = await getMemberProfileByUuid(id, {
			includeEmail: options.includeEmail,
		});
		if (refreshed.status !== "found") {
			return { success: false, error: "update_failed" };
		}
		return { success: true, profile: refreshed.profile };
	} catch (err) {
		console.error("[members] update assignable groups failed", err);
		return { success: false, error: "update_failed" };
	}
}
