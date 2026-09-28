import { render } from "@react-email/render";
import { createServerFn } from "@tanstack/react-start";
import { WelcomeEmail, welcomeEmailPreviewProps } from "#/emails/welcome";
import { recordAudit } from "#/lib/audit.server";
import { hasElevatedAccess } from "#/lib/auth";
import { requireAppAccess, requireElevatedAccess } from "#/lib/auth.server";
import {
	listOnboardingContactsFromAuthentik,
	listRecentOnboardingMembersFromAuthentik,
	resolveViewerContactIds,
	updateMemberOnboardingContact,
	updateMemberOnboardingStage,
} from "#/lib/authentik-members.server";
import type {
	CreateMemberResult,
	NewMemberInput,
	OnboardingContactsResult,
	RecentOnboardingMembersResult,
	UpdateMemberOnboardingContactResult,
	UpdateMemberOnboardingStageResult,
} from "#/lib/onboarding";
import {
	contactIdMatchesAnyViewer,
	isOnboardingStage,
	parseOnboardingContactId,
} from "#/lib/onboarding";
import {
	createMemberAccount,
	notifyOnboardingContactAssigned,
} from "#/lib/onboarding.server";
import { requireNonEmptyStringField } from "#/lib/server-fn-validators";

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
		const actor = await requireElevatedAccess();
		const result = await createMemberAccount(data);
		if (result.success) {
			recordAudit({
				actor,
				action: "member.create",
				targetId: result.username,
				targetLabel: `${data.firstName} ${data.lastName}`.trim(),
				meta: {
					email: data.email,
					username: result.username,
					emailSent: result.emailSent,
				},
			});
		}
		return result;
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
	const actor = await requireAppAccess();
	const [result, viewer] = await Promise.all([
		listRecentOnboardingMembersFromAuthentik(),
		resolveViewerContactIds(actor),
	]);
	return {
		...result,
		viewerContactIds: viewer.viewerContactIds,
		members: result.members.map((member) => ({
			...member,
			onboardingContactIsMe: contactIdMatchesAnyViewer(
				member.onboardingContactId,
				viewer.viewerContactIds,
			),
		})),
	};
});

export const updateMemberOnboardingStageFn = createServerFn({ method: "POST" })
	.validator((data: { id: string; stage: number }) => {
		const { id } = requireNonEmptyStringField(data, "id");
		if (!isOnboardingStage(data.stage)) {
			throw new Error("invalid_stage");
		}
		return { id, stage: data.stage };
	})
	.handler(async ({ data }): Promise<UpdateMemberOnboardingStageResult> => {
		const user = await requireAppAccess();
		const result = await updateMemberOnboardingStage(data.id, data.stage, {
			includeEmail: hasElevatedAccess(user.roles),
		});
		if (result.success) {
			recordAudit({
				actor: user,
				action: "member.onboarding_stage.update",
				targetId: data.id,
				targetLabel: result.profile.name,
				meta: { stage: data.stage },
			});
		}
		return result;
	});

/** HR / Vorstand / Admin accounts that can be onboarding contacts. */
export const listOnboardingContactsFn = createServerFn({
	method: "GET",
}).handler(async (): Promise<OnboardingContactsResult> => {
	const actor = await requireAppAccess();
	const [result, viewer] = await Promise.all([
		listOnboardingContactsFromAuthentik(),
		resolveViewerContactIds(actor),
	]);

	const contacts = [...result.contacts];
	// Only surface “assign to me” when the viewer is already a staff contact,
	// or we can resolve their UUID (server still re-checks on save).
	const inPicker =
		viewer.myContactId != null &&
		contacts.some((entry) => entry.id === viewer.myContactId);

	if (viewer.myContactId && !inPicker) {
		console.info("[onboarding.contact] viewer not in staff picker", {
			myContactId: viewer.myContactId,
			sub: actor.sub,
			pickerSize: contacts.length,
		});
		// Still add self so “Mir zuweisen” works; save path validates staff.
		contacts.push({
			id: viewer.myContactId,
			name: actor.name || viewer.myContactId,
			username: null,
		});
		contacts.sort((a, b) => a.name.localeCompare(b.name, "de"));
	}

	return {
		contacts,
		source: result.source,
		myContactId: viewer.myContactId,
		viewerContactIds: viewer.viewerContactIds,
	};
});

export const updateMemberOnboardingContactFn = createServerFn({
	method: "POST",
})
	.validator((data: { id: string; contactId: string | null }) => {
		const { id } = requireNonEmptyStringField(data, "id");
		const contactId =
			data.contactId == null ? null : parseOnboardingContactId(data.contactId);
		if (data.contactId != null && contactId == null) {
			throw new Error("invalid_contact");
		}
		return { id, contactId };
	})
	.handler(async ({ data }): Promise<UpdateMemberOnboardingContactResult> => {
		const user = await requireAppAccess();
		const result = await updateMemberOnboardingContact(
			data.id,
			data.contactId,
			{
				includeEmail: hasElevatedAccess(user.roles),
			},
		);
		if (!result.success) return result;

		recordAudit({
			actor: user,
			action: "member.onboarding_contact.update",
			targetId: data.id,
			targetLabel: result.profile.name,
			meta: {
				contactId: data.contactId,
				contactName: result.profile.onboardingContact?.name ?? null,
			},
		});

		if (!data.contactId) {
			return { ...result, notifyEmailSent: null };
		}

		const viewer = await resolveViewerContactIds(user);
		const isSelf = contactIdMatchesAnyViewer(
			data.contactId,
			viewer.viewerContactIds,
		);
		if (isSelf) {
			return { ...result, notifyEmailSent: null };
		}

		const notifyEmailSent = await notifyOnboardingContactAssigned({
			contactId: data.contactId,
			menteeDisplayName: result.profile.name,
			assignedByName: user.name,
		});

		return { ...result, notifyEmailSent };
	});
