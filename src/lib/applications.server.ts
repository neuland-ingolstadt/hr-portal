import type {
	AcceptApplicationInput,
	AcceptApplicationResult,
	ApplicationsResult,
} from "#/lib/applications";
import {
	acceptEasyVereinApplication,
	getPendingApplication,
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

/**
 * Accept in EasyVerein after creating the Authentik account + welcome mail.
 * Authentik runs first so a failed SSO create does not leave a half-accepted EV member.
 * Member profile is taken from EasyVerein (no client-side overrides).
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
	} catch (error) {
		console.error(
			"[applications] EasyVerein accept failed after Authentik create",
			error,
		);
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("easyverein_not_pending")) {
			// Already accepted elsewhere — Authentik account still exists.
			return {
				success: true,
				username: createResult.username,
				emailSent: createResult.emailSent,
				easyVereinAccepted: true,
			};
		}
		return {
			success: false,
			error: "easyverein_accept_failed",
			username: createResult.username,
			emailSent: createResult.emailSent,
			easyVereinAccepted: false,
		};
	}

	return {
		success: true,
		username: createResult.username,
		emailSent: createResult.emailSent,
		easyVereinAccepted: true,
	};
}
