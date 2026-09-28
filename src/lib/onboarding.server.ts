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
import {
	invalidateDirectoryCache,
	resolveOnboardingContactRecipient,
} from "#/lib/authentik-members.server";
import { sendEmail } from "#/lib/azure-email.server";
import { serverConfig } from "#/lib/config";
import type { CreateMemberResult, NewMemberInput } from "#/lib/onboarding";
import { firstNameFromDisplayName } from "#/lib/onboarding";

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

/**
 * Create an Authentik account (membership-tools parity) and send the welcome mail.
 * Direct fetch for user create - @goauthentik/api create is unreliable.
 */
export async function createMemberAccount(
	input: NewMemberInput,
): Promise<CreateMemberResult> {
	const user = parseNewMemberInput(input);
	if (!user) {
		return { success: false, error: "invalid_input" };
	}

	if (!isAuthentikApiConfigured()) {
		return { success: false, error: "authentik_api_missing" };
	}

	const username = `${normalizeUsernamePart(user.firstName)}.${normalizeUsernamePart(user.lastName)}`;

	try {
		const existing = await getUserByUsername(username);
		if (existing) {
			return { success: false, error: "username_exists" };
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

		const password = generatePassword(16);

		const attributes: Record<string, string | number> = {
			firstName: user.firstName,
			lastName: user.lastName,
		};
		if (
			typeof input.easyVereinMemberId === "number" &&
			Number.isInteger(input.easyVereinMemberId) &&
			input.easyVereinMemberId > 0
		) {
			attributes.easyVereinMemberId = input.easyVereinMemberId;
		}

		const created = await authentikFetch<AuthentikUser>("/api/v3/core/users/", {
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

		if (created.pk == null) {
			throw new Error("Authentik user create returned no pk");
		}

		await setUserPassword(created.pk, password);
		invalidateDirectoryCache();

		const emailSent = await sendEmail(
			{
				address: created.email?.trim() || user.email,
				displayName:
					created.name?.trim() || `${user.firstName} ${user.lastName}`,
			},
			"Willkommen bei Neuland Ingolstadt",
			WelcomeEmail({
				firstName: user.firstName,
				username,
				password,
			}),
		);

		if (!emailSent) {
			console.warn(
				`[onboarding] user ${username} created but welcome email was not sent`,
			);
		}

		return { success: true, username, emailSent };
	} catch (error) {
		console.error("[onboarding] create member failed", error);
		const message = error instanceof Error ? error.message : String(error);
		if (message.toLowerCase().includes("already exists")) {
			return { success: false, error: "username_exists" };
		}
		return { success: false, error: "create_failed" };
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
