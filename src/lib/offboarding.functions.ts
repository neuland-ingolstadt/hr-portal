import { createServerFn } from "@tanstack/react-start";
import { recordAudit } from "#/lib/audit.server";
import { requireElevatedAccess } from "#/lib/auth.server";
import {
	listNonMitgliederAccountsFromAuthentik,
	warmActiveDirectoryForOffboarding,
} from "#/lib/authentik-members.server";
import {
	getEasyVereinMembershipSnapshot,
	isEasyVereinConfigured,
} from "#/lib/easyverein.server";
import type {
	DeleteAccountResult,
	OffboardingCandidatesResult,
	RevokeMitgliederResult,
} from "#/lib/offboarding";
import {
	deleteAuthentikAccount,
	revokeMitgliederGroup,
} from "#/lib/offboarding.server";
import { tracingMiddleware } from "#/lib/server-fn-tracing";
import { requireNonEmptyStringField } from "#/lib/server-fn-validators";

/** Prefetch Authentik directory into the offboarding cache. */
export const warmOffboardingAuthentikFn = createServerFn({
	method: "GET",
})
	.middleware([tracingMiddleware])
	.handler(async (): Promise<{ ok: true }> => {
		await requireElevatedAccess();
		await warmActiveDirectoryForOffboarding();
		return { ok: true };
	});

/** Prefetch EasyVerein membership snapshot (no-op when EV is not configured). */
export const warmOffboardingEasyVereinFn = createServerFn({
	method: "GET",
})
	.middleware([tracingMiddleware])
	.handler(async (): Promise<{ reconciled: boolean }> => {
		await requireElevatedAccess();
		if (!isEasyVereinConfigured()) {
			return { reconciled: false };
		}
		try {
			await getEasyVereinMembershipSnapshot();
			return { reconciled: true };
		} catch (err) {
			console.error("[offboarding] EasyVerein warm failed", err);
			return { reconciled: false };
		}
	});

export const listOffboardingCandidatesFn = createServerFn({
	method: "GET",
})
	.middleware([tracingMiddleware])
	.handler(async (): Promise<OffboardingCandidatesResult> => {
		await requireElevatedAccess();
		return listNonMitgliederAccountsFromAuthentik();
	});

export const revokeMitgliederFn = createServerFn({ method: "POST" })
	.middleware([tracingMiddleware])
	.validator((data: { memberId: string }) =>
		requireNonEmptyStringField(data, "memberId"),
	)
	.handler(async ({ data }): Promise<RevokeMitgliederResult> => {
		const actor = await requireElevatedAccess();
		const result = await revokeMitgliederGroup(data.memberId, {
			actorSub: actor.sub,
		});
		if (result.success) {
			recordAudit({
				actor,
				action: "offboarding.revoke_mitglieder",
				targetId: data.memberId,
				targetLabel: result.name,
			});
		}
		return result;
	});

export const deleteAccountFn = createServerFn({ method: "POST" })
	.middleware([tracingMiddleware])
	.validator((data: { memberId: string }) =>
		requireNonEmptyStringField(data, "memberId"),
	)
	.handler(async ({ data }): Promise<DeleteAccountResult> => {
		const actor = await requireElevatedAccess();
		const result = await deleteAuthentikAccount(data.memberId, {
			actorSub: actor.sub,
		});
		if (result.success) {
			recordAudit({
				actor,
				action: "offboarding.delete_account",
				targetId: data.memberId,
				targetLabel: result.name,
			});
		}
		return result;
	});
