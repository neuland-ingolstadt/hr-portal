import { randomBytes } from "node:crypto";
import { OnboardingContactAssignedEmail } from "#/emails/onboarding-contact-assigned";
import { WelcomeEmail } from "#/emails/welcome";
import {
	type AuthentikPaginated,
	type AuthentikUser,
	authentikAuthHeaders,
	authentikFetch,
	isAuthentikApiConfigured,
	resolveAuthentikGroupIdByName,
} from "#/lib/authentik-api.server";
import { easyVereinMemberIdFromAttributes } from "#/lib/authentik-members/shared.server";
import {
	invalidateDirectoryCache,
	resolveOnboardingContactRecipient,
} from "#/lib/authentik-members.server";
import { sendEmail } from "#/lib/azure-email.server";
import { serverConfig } from "#/lib/config";
import type {
	CreateMemberResult,
	CreateMemberStage,
	NewMemberInput,
} from "#/lib/onboarding";
import { firstNameFromDisplayName } from "#/lib/onboarding";
import { getActiveTraceId } from "#/lib/tracing.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Username slug matching membership-tools (`firstname.lastname`). */
function normalizeUsernamePart(text: string): string {
	return text
		.toLowerCase()
		.replace(/prof\./gi, "")
		.replace(/dr\./gi, "")
		.replace(/ä/g, "ae")
		.replace(/ö/g, "oe")
		.replace(/ü/g, "ue")
		.replace(/ß/g, "ss")
		.trim()
		.replace(/ +/g, ".");
}

function generatePassword(length = 16): string {
	const chars =
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	const bytes = randomBytes(length);
	let out = "";
	for (let i = 0; i < length; i++) {
		const byte = bytes[i] ?? 0;
		out += chars[byte % chars.length] ?? "x";
	}
	return out;
}

function parseNewMemberInput(input: NewMemberInput): NewMemberInput | null {
	const firstName = input.firstName?.trim() ?? "";
	const lastName = input.lastName?.trim() ?? "";
	const email = input.email?.trim() ?? "";
	if (!firstName || !lastName || !EMAIL_RE.test(email)) return null;
	return { firstName, lastName, email };
}

function logCreateMemberFailure(
	stage: CreateMemberStage,
	error: unknown,
): void {
	console.error(
		"[onboarding] create member failed",
		{
			traceId: getActiveTraceId(),
			stage,
		},
		error,
	);
}

async function getUserByUsername(
	username: string,
): Promise<AuthentikUser | null> {
	const body = await authentikFetch<AuthentikPaginated<AuthentikUser>>(
		`/api/v3/core/users/?username=${encodeURIComponent(username)}&page_size=5`,
		{ headers: authentikAuthHeaders() },
	);
	return body.results?.[0] ?? null;
}

async function setUserPassword(
	userPk: number | string,
	password: string,
): Promise<void> {
	await authentikFetch(`/api/v3/core/users/${userPk}/set_password/`, {
		method: "POST",
		headers: authentikAuthHeaders(true),
		body: JSON.stringify({ password }),
		responseType: "none",
	});
}

async function finishMemberCredentials(input: {
	userPk: number | string;
	firstName: string;
	lastName: string;
	email: string;
	username: string;
	existingEmail?: string | null;
	existingName?: string | null;
}): Promise<CreateMemberResult> {
	const password = generatePassword(16);

	try {
		await setUserPassword(input.userPk, password);
	} catch (error) {
		logCreateMemberFailure("set_password", error);
		return { success: false, error: "create_failed", stage: "set_password" };
	}

	invalidateDirectoryCache();

	let emailSent = false;
	try {
		emailSent = await sendEmail(
			{
				address: input.existingEmail?.trim() || input.email,
				displayName:
					input.existingName?.trim() || `${input.firstName} ${input.lastName}`,
			},
			"Willkommen bei Neuland Ingolstadt",
			WelcomeEmail({
				firstName: input.firstName,
				username: input.username,
				password,
			}),
		);
	} catch (error) {
		logCreateMemberFailure("email", error);
		emailSent = false;
	}

	if (!emailSent) {
		console.warn(
			`[onboarding] user ${input.username} created but welcome email was not sent`,
			{ traceId: getActiveTraceId(), stage: "email" },
		);
	}

	return { success: true, username: input.username, emailSent };
}

/**
 * Create an Authentik account (membership-tools parity) and send the welcome mail.
 * Direct fetch for user create - @goauthentik/api create is unreliable.
 *
 * When `easyVereinMemberId` is set and a username already exists with the same
 * EV id (partial accept), resume password + welcome mail instead of failing.
 */
export async function createMemberAccount(
	input: NewMemberInput,
): Promise<CreateMemberResult> {
	const user = parseNewMemberInput(input);
	if (!user) {
		return { success: false, error: "invalid_input", stage: "lookup" };
	}

	if (!isAuthentikApiConfigured()) {
		return { success: false, error: "authentik_api_missing", stage: "lookup" };
	}

	const username = `${normalizeUsernamePart(user.firstName)}.${normalizeUsernamePart(user.lastName)}`;
	const easyVereinMemberId =
		typeof input.easyVereinMemberId === "number" &&
		Number.isInteger(input.easyVereinMemberId) &&
		input.easyVereinMemberId > 0
			? input.easyVereinMemberId
			: null;

	try {
		const existing = await getUserByUsername(username);
		if (existing) {
			const existingEvId = easyVereinMemberIdFromAttributes(
				existing.attributes,
			);
			if (
				easyVereinMemberId != null &&
				existing.pk != null &&
				existingEvId === easyVereinMemberId
			) {
				return finishMemberCredentials({
					userPk: existing.pk,
					firstName: user.firstName,
					lastName: user.lastName,
					email: user.email,
					username,
					existingEmail: existing.email,
					existingName: existing.name,
				});
			}
			return { success: false, error: "username_exists", stage: "lookup" };
		}

		const defaultGroupName =
			serverConfig.authentikDefaultGroup.trim() ||
			serverConfig.groups.mitglieder.trim();

		let groupId: string | undefined;
		if (defaultGroupName) {
			groupId =
				(await resolveAuthentikGroupIdByName(defaultGroupName)) ?? undefined;
			if (!groupId) {
				console.warn(
					`[onboarding] default group not found: ${defaultGroupName}`,
				);
			}
		}

		const attributes: Record<string, string | number> = {
			firstName: user.firstName,
			lastName: user.lastName,
		};
		if (easyVereinMemberId != null) {
			attributes.easyVereinMemberId = easyVereinMemberId;
		}

		let created: AuthentikUser;
		try {
			created = await authentikFetch<AuthentikUser>("/api/v3/core/users/", {
				method: "POST",
				headers: authentikAuthHeaders(true),
				body: JSON.stringify({
					username,
					name: `${user.firstName} ${user.lastName}`,
					email: user.email,
					path: serverConfig.authentikUserPath,
					type: "internal",
					groups: groupId ? [groupId] : [],
					attributes,
				}),
			});
		} catch (error) {
			logCreateMemberFailure("create_user", error);
			const message = error instanceof Error ? error.message : String(error);
			if (message.toLowerCase().includes("already exists")) {
				return {
					success: false,
					error: "username_exists",
					stage: "create_user",
				};
			}
			return { success: false, error: "create_failed", stage: "create_user" };
		}

		if (created.pk == null) {
			logCreateMemberFailure(
				"create_user",
				new Error("Authentik user create returned no pk"),
			);
			return { success: false, error: "create_failed", stage: "create_user" };
		}

		return finishMemberCredentials({
			userPk: created.pk,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			username,
			existingEmail: created.email,
			existingName: created.name,
		});
	} catch (error) {
		logCreateMemberFailure("lookup", error);
		const message = error instanceof Error ? error.message : String(error);
		if (message.toLowerCase().includes("already exists")) {
			return { success: false, error: "username_exists", stage: "lookup" };
		}
		return { success: false, error: "create_failed", stage: "lookup" };
	}
}

/**
 * Privacy-minimal staff mail when Betreuung is assigned to someone else.
 * Never throws - returns false when recipient/Azure is missing or send fails.
 */
export async function notifyOnboardingContactAssigned(input: {
	contactId: string;
	/** Mentee display name - only the first name is put in the mail. */
	menteeDisplayName: string;
	assignedByName: string;
}): Promise<boolean> {
	const recipient = await resolveOnboardingContactRecipient(input.contactId);
	if (!recipient) {
		console.warn("[onboarding.contact] notify skipped - no recipient email", {
			contactId: input.contactId,
		});
		return false;
	}

	const onboardingUrl = new URL("/onboarding", serverConfig.appUrl).toString();
	const mentorFirstName = firstNameFromDisplayName(recipient.name);
	const menteeFirstName = firstNameFromDisplayName(input.menteeDisplayName);
	const assignedByName =
		input.assignedByName.trim() || "Jemand aus dem HR-Team";

	const sent = await sendEmail(
		{
			address: recipient.email,
			displayName: recipient.name,
		},
		"Neue Onboarding-Betreuung zugewiesen",
		OnboardingContactAssignedEmail({
			mentorFirstName,
			menteeFirstName,
			assignedByName,
			onboardingUrl,
		}),
	);

	if (!sent) {
		console.warn("[onboarding.contact] notify email was not sent", {
			contactId: input.contactId,
		});
	}

	return sent;
}
