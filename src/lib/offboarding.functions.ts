import { createServerFn } from "@tanstack/react-start";
import { requireElevatedAccess } from "#/lib/auth.server";
import type {
	DeleteAccountResult,
	RevokeMitgliederResult,
} from "#/lib/offboarding";
import {
	deleteAuthentikAccount,
	revokeMitgliederGroup,
} from "#/lib/offboarding.server";

export const revokeMitgliederFn = createServerFn({ method: "POST" })
	.validator((data: { memberId: string }) => {
		if (
			!data?.memberId ||
			typeof data.memberId !== "string" ||
			!data.memberId.trim()
		) {
			throw new Error("invalid_id");
		}
		return { memberId: data.memberId.trim() };
	})
	.handler(async ({ data }): Promise<RevokeMitgliederResult> => {
		const actor = await requireElevatedAccess();
		return revokeMitgliederGroup(data.memberId, { actorSub: actor.sub });
	});

export const deleteAccountFn = createServerFn({ method: "POST" })
	.validator((data: { memberId: string }) => {
		if (
			!data?.memberId ||
			typeof data.memberId !== "string" ||
			!data.memberId.trim()
		) {
			throw new Error("invalid_id");
		}
		return { memberId: data.memberId.trim() };
	})
	.handler(async ({ data }): Promise<DeleteAccountResult> => {
		const actor = await requireElevatedAccess();
		return deleteAuthentikAccount(data.memberId, { actorSub: actor.sub });
	});
