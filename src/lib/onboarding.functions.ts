import { render } from "@react-email/render";
import { createServerFn } from "@tanstack/react-start";
import { WelcomeEmail, welcomeEmailPreviewProps } from "#/emails/welcome";
import { listRecentOnboardingMembersFromAuthentik } from "#/lib/authentik-members.server";
import { requireAppAccess, requireElevatedAccess } from "#/lib/auth.server";
import type {
	CreateMemberResult,
	NewMemberInput,
	RecentOnboardingMembersResult,
} from "#/lib/onboarding";
import { createMemberAccount } from "#/lib/onboarding.server";

function validateNewMember(data: NewMemberInput): NewMemberInput {
	if (!data || typeof data !== "object") {
		throw new Error("invalid_input");
	}
	const firstName =
		typeof data.firstName === "string" ? data.firstName.trim() : "";
	const lastName =
		typeof data.lastName === "string" ? data.lastName.trim() : "";
	const email = typeof data.email === "string" ? data.email.trim() : "";
	if (!firstName || !lastName || !email) {
		throw new Error("invalid_input");
	}
	return { firstName, lastName, email };
}

export const createMemberFn = createServerFn({ method: "POST" })
	.validator(validateNewMember)
	.handler(async ({ data }): Promise<CreateMemberResult> => {
		await requireElevatedAccess();
		return createMemberAccount(data);
	});

/** Render the welcome template with sample props for in-app iframe preview. */
export const previewWelcomeEmailFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<{ html: string }> => {
		await requireElevatedAccess();
		const html = await render(WelcomeEmail(welcomeEmailPreviewProps));
		return { html };
	},
);

/** Mitglieder with Authentik accounts created in the last four months. */
export const listRecentOnboardingMembersFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<RecentOnboardingMembersResult> => {
	await requireAppAccess();
	return listRecentOnboardingMembersFromAuthentik();
});
