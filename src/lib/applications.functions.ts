import { createServerFn } from "@tanstack/react-start";
import type {
	AcceptApplicationInput,
	AcceptApplicationResult,
	ApplicationsResult,
} from "#/lib/applications";
import { acceptApplication, listApplications } from "#/lib/applications.server";
import { requireAppAccess } from "#/lib/auth.server";

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
		await requireAppAccess();
		return listApplications();
	},
);

export const acceptApplicationFn = createServerFn({ method: "POST" })
	.validator(validateAcceptInput)
	.handler(async ({ data }): Promise<AcceptApplicationResult> => {
		await requireAppAccess();
		return acceptApplication(data);
	});
