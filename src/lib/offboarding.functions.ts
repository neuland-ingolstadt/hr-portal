import { createServerFn } from "@tanstack/react-start";
import { recordAudit } from "#/lib/audit.server";
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
		const result = await revokeMitgliederGroup(data.memberId, {
			actorSub: actor.sub,
		});
		recordAudit({
			actor,
			action: "offboarding.revoke_mitglieder",
			targetId: data.memberId,
			targetLabel: result.success ? result.name : null,
			success: result.success,
			error: result.success ? null : result.error,
		});
		return result;
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
		const result = await deleteAuthentikAccount(data.memberId, {
			actorSub: actor.sub,
		});
		recordAudit({
			actor,
			action: "offboarding.delete_account",
			targetId: data.memberId,
			targetLabel: result.success ? result.name : null,
			success: result.success,
			error: result.success ? null : result.error,
		});
		return result;
	});
