import { createServerFn } from "@tanstack/react-start";
import type {
	AcceptApplicationInput,
	AcceptApplicationResult,
	ApplicationsResult,
	PendingApplicationCountResult,
} from "#/lib/applications";
import {
	acceptApplication,
	getPendingApplicationCount,
	listApplications,
} from "#/lib/applications.server";
import { recordAudit } from "#/lib/audit.server";
import { requireElevatedAccess } from "#/lib/auth.server";

function validateAcceptInput(
	data: AcceptApplicationInput,
): AcceptApplicationInput {
	if (!data || typeof data !== "object") {
		throw new Error("invalid_input");
	}
	const memberId =
		typeof data.memberId === "number"
			? data.memberId
			: Number.parseInt(String(data.memberId ?? ""), 10);
	if (!Number.isInteger(memberId) || memberId <= 0) {
		throw new Error("invalid_input");
	}
	return { memberId };
}

export const listApplicationsFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<ApplicationsResult> => {
		await requireElevatedAccess();
		return listApplications();
	},
);

export const getPendingApplicationCountFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<PendingApplicationCountResult> => {
	await requireElevatedAccess();
	return getPendingApplicationCount();
});

export const acceptApplicationFn = createServerFn({ method: "POST" })
	.validator(validateAcceptInput)
	.handler(async ({ data }): Promise<AcceptApplicationResult> => {
		const actor = await requireElevatedAccess();
		const result = await acceptApplication(data);
		if (result.success) {
			recordAudit({
				actor,
				action: "application.accept",
				targetId: String(data.memberId),
				targetLabel: result.username ?? null,
				meta: {
					username: result.username ?? null,
					emailSent: result.emailSent ?? null,
					easyVereinAccepted: result.easyVereinAccepted ?? null,
					sepaMandate: result.sepaMandate ?? null,
				},
			});
		}
		return result;
	});
