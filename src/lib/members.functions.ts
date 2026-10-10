import { createServerFn } from "@tanstack/react-start";
import { recordAudit } from "#/lib/audit.server";
import { hasElevatedAccess } from "#/lib/auth";
import { requireAppAccess, requireElevatedAccess } from "#/lib/auth.server";
import {
	getDirectoryStatsFromAuthentik,
	getMemberProfileByUuid,
	listMembersFromAuthentik,
} from "#/lib/authentik-members.server";
import {
	type UpdateMemberGroupsResult,
	updateMemberAssignableGroups,
} from "#/lib/member-groups.server";
import type {
	DirectoryStats,
	MemberProfileResult,
	MembersResult,
} from "#/lib/members";
import { tracingMiddleware } from "#/lib/server-fn-tracing";
import { requireNonEmptyStringField } from "#/lib/server-fn-validators";

export const listMembersFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.handler(async (): Promise<MembersResult> => {
		await requireAppAccess();
		return listMembersFromAuthentik();
	});

export const getDirectoryStatsFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.handler(async (): Promise<DirectoryStats> => {
		await requireAppAccess();
		return getDirectoryStatsFromAuthentik();
	});

export const getMemberProfileFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.validator((data: { id: string }) => requireNonEmptyStringField(data, "id"))
	.handler(async ({ data }): Promise<MemberProfileResult> => {
		const user = await requireAppAccess();
		return getMemberProfileByUuid(data.id, {
			includeEmail: hasElevatedAccess(user.roles),
		});
	});

export const updateMemberGroupsFn = createServerFn({ method: "POST" })
	.middleware([tracingMiddleware])
	.validator((data: { id: string; groups: string[] }) => {
		const { id } = requireNonEmptyStringField(data, "id");
		if (!Array.isArray(data.groups)) {
			throw new Error("invalid_groups");
		}
		const groups = data.groups.filter(
			(group): group is string =>
				typeof group === "string" && group.trim().length > 0,
		);
		return { id, groups };
	})
	.handler(async ({ data }): Promise<UpdateMemberGroupsResult> => {
		const actor = await requireElevatedAccess();
		const result = await updateMemberAssignableGroups(data.id, data.groups, {
			includeEmail: true,
		});
		if (result.success) {
			recordAudit({
				actor,
				action: "member.groups.update",
				targetId: data.id,
				targetLabel: result.profile.name,
				meta: { groups: data.groups },
			});
		}
		return result;
	});
