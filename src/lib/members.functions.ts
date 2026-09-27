import { createServerFn } from "@tanstack/react-start";
import { hasElevatedAccess } from "#/lib/auth";
import { requireAppAccess, requireElevatedAccess } from "#/lib/auth.server";
import {
	getDirectoryStatsFromAuthentik,
	getMemberProfileByUuid,
	listMembersFromAuthentik,
	listNonMitgliederAccountsFromAuthentik,
} from "#/lib/authentik-members.server";
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
