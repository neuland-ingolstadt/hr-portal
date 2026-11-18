import { createServerFn } from "@tanstack/react-start";
import { recordAudit } from "#/lib/audit.server";
import { hasElevatedAccess } from "#/lib/auth";
import { requireAppAccess, requireElevatedAccess } from "#/lib/auth.server";
import {
	exportMembersFromAuthentik,
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
import type { MemberExportRow } from "#/lib/members-csv";
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

/** Cap so a crafted request cannot force an unbounded lookup. */
const MAX_EXPORT_IDS = 5000;

export const exportMembersFn = createServerFn({ method: "POST" })
	.middleware([tracingMiddleware])
	.validator((data: { ids: string[] }) => {
		if (!Array.isArray(data?.ids) || data.ids.length > MAX_EXPORT_IDS) {
			throw new Error("invalid_ids");
		}
		const ids = data.ids.filter(
			(id): id is string => typeof id === "string" && id.trim().length > 0,
		);
		return { ids };
	})
	.handler(async ({ data }): Promise<MemberExportRow[]> => {
		const actor = await requireElevatedAccess();
		const rows = await exportMembersFromAuthentik(data.ids);
		recordAudit({
			actor,
			action: "members.export",
			meta: { count: rows.length },
		});
		return rows;
	});
