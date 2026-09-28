import type {
	AcceptApplicationInput,
	AcceptApplicationResult,
	ApplicationsResult,
	PendingApplicationCountResult,
	SepaMandateStatus,
} from "#/lib/applications";
import {
	acceptEasyVereinApplication,
	countPendingApplications,
	ensureEasyVereinSepaMandate,
	getPendingApplication,
	invalidatePendingApplicationCountCache,
	isEasyVereinConfigured,
	listPendingApplications,
} from "#/lib/easyverein.server";
import { createMemberAccount } from "#/lib/onboarding.server";

export async function listApplications(): Promise<ApplicationsResult> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}
	const applications = await listPendingApplications();
	return { applications };
}

/** Dashboard-only count (cached, id fields only). Never throws for missing EV. */
export async function getPendingApplicationCount(): Promise<PendingApplicationCountResult> {
	if (!isEasyVereinConfigured()) {
		return { count: null, source: "unavailable" };
	}
	try {
		const count = await countPendingApplications();
		return { count, source: "easyverein" };
	} catch (err) {
		console.error("[applications] pending count failed", err);
		return { count: null, source: "unavailable" };
	}
}

/**
 * Accept in EasyVerein after creating the Authentik account + welcome mail.
 * Authentik runs first so a failed SSO create does not leave a half-accepted EV member.
 * Member profile is taken from EasyVerein (no client-side overrides).
 * SEPA mandate is set automatically after EV accept (never fails the accept).
 */
export async function acceptApplication(
	input: AcceptApplicationInput,
): Promise<AcceptApplicationResult> {
	if (!isEasyVereinConfigured()) {
		return { success: false, error: "easyverein_api_missing" };
	}

	const memberId = input.memberId;
	if (!Number.isInteger(memberId) || memberId <= 0) {
		return { success: false, error: "invalid_input" };
	}

	const pending = await getPendingApplication(memberId);
	if (!pending) {
		return { success: false, error: "easyverein_not_pending" };
	}

	if (!pending.firstName || !pending.lastName || !pending.email) {
		return { success: false, error: "invalid_input" };
	}

	const createResult = await createMemberAccount({
		firstName: pending.firstName,
		lastName: pending.lastName,
		email: pending.email,
		easyVereinMemberId: pending.id,
	});

	if (!createResult.success) {
		return createResult;
	}

	try {
		await acceptEasyVereinApplication(memberId);
		invalidatePendingApplicationCountCache();
	} catch (error) {
		console.error(
			"[applications] EasyVerein accept failed after Authentik create",
			error,
		);
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("easyverein_not_pending")) {
			// Already accepted elsewhere — Authentik account still exists.
			invalidatePendingApplicationCountCache();
			const sepaMandate = await setSepaMandate(memberId);
			return {
				success: true,
				username: createResult.username,
				emailSent: createResult.emailSent,
				easyVereinAccepted: true,
				sepaMandate,
			};
		}
		return {
			success: false,
			error: "easyverein_accept_failed",
			username: createResult.username,
			emailSent: createResult.emailSent,
			easyVereinAccepted: false,
			sepaMandate: null,
		};
	}

	const sepaMandate = await setSepaMandate(memberId);

	return {
		success: true,
		username: createResult.username,
		emailSent: createResult.emailSent,
		easyVereinAccepted: true,
		sepaMandate,
	};
}

async function setSepaMandate(memberId: number): Promise<SepaMandateStatus> {
	try {
		const result = await ensureEasyVereinSepaMandate(memberId);
		if (result.status === "failed") {
			console.error(
				"[applications] EasyVerein SEPA mandate failed after accept",
				result.message,
			);
		}
		return result.status;
	} catch (error) {
		console.error(
			"[applications] EasyVerein SEPA mandate failed after accept",
			error,
		);
		return "failed";
	}
}
