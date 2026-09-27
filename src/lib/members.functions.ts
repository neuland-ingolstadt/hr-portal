import { createServerFn } from "@tanstack/react-start";
import { hasElevatedAccess } from "#/lib/auth";
import { requireAppAccess, requireElevatedAccess } from "#/lib/auth.server";
import {
	getDirectoryStatsFromAuthentik,
	getMemberProfileByUuid,
	listMembersFromAuthentik,
	listNonMitgliederAccountsFromAuthentik,
} from "#/lib/authentik-members.server";
import {
	type UpdateMemberGroupsResult,
	updateMemberAssignableGroups,
} from "#/lib/member-groups.server";
import type {
	DirectoryStats,
	MemberProfileResult,
	MembersResult,
	OffboardingCandidatesResult,
} from "#/lib/members";

export const listMembersFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<MembersResult> => {
		await requireAppAccess();
		return listMembersFromAuthentik();
	},
);

export const listOffboardingCandidatesFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<OffboardingCandidatesResult> => {
	await requireElevatedAccess();
	return listNonMitgliederAccountsFromAuthentik();
});

export const getDirectoryStatsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<DirectoryStats> => {
		await requireAppAccess();
		return getDirectoryStatsFromAuthentik();
	},
);

export const getMemberProfileFn = createServerFn({ method: "GET" })
	.validator((data: { id: string }) => {
		if (!data?.id || typeof data.id !== "string" || !data.id.trim()) {
			throw new Error("invalid_id");
		}
		return { id: data.id.trim() };
	})
	.handler(async ({ data }): Promise<MemberProfileResult> => {
		const user = await requireAppAccess();
		return getMemberProfileByUuid(data.id, {
			includeEmail: hasElevatedAccess(user.roles),
		});
	});

export const updateMemberGroupsFn = createServerFn({ method: "POST" })
	.validator((data: { id: string; groups: string[] }) => {
		if (!data?.id || typeof data.id !== "string" || !data.id.trim()) {
			throw new Error("invalid_id");
		}
		if (!Array.isArray(data.groups)) {
			throw new Error("invalid_groups");
		}
		const groups = data.groups.filter(
			(group): group is string =>
				typeof group === "string" && group.trim().length > 0,
		);
		return { id: data.id.trim(), groups };
	})
	.handler(async ({ data }): Promise<UpdateMemberGroupsResult> => {
		await requireElevatedAccess();
		return updateMemberAssignableGroups(data.id, data.groups, {
			includeEmail: true,
		});
	});
