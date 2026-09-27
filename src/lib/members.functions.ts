import { createServerFn } from "@tanstack/react-start";
import { requireAppAccess } from "#/lib/auth.server";
import {
	getDirectoryStatsFromAuthentik,
	listMembersFromAuthentik,
	listNonMitgliederAccountsFromAuthentik,
} from "#/lib/authentik-members.server";
import type { DirectoryStats, MembersResult } from "#/lib/members";

export const listMembersFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<MembersResult> => {
		await requireAppAccess();
		return listMembersFromAuthentik();
	},
);

export const listOffboardingCandidatesFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<MembersResult> => {
	await requireAppAccess();
	return listNonMitgliederAccountsFromAuthentik();
});

export const getDirectoryStatsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<DirectoryStats> => {
		await requireAppAccess();
		return getDirectoryStatsFromAuthentik();
	},
);
