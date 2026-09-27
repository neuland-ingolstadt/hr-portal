import { randomBytes } from "node:crypto";
import { WelcomeEmail } from "#/emails/welcome";
import { invalidateDirectoryCache } from "#/lib/authentik-members.server";
import { sendEmail } from "#/lib/azure-email.server";
import { serverConfig } from "#/lib/config";
import type { CreateMemberResult, NewMemberInput } from "#/lib/onboarding";

type AuthentikGroup = {
	pk?: number | string;
	name?: string;
	group_uuid?: string;
	uuid?: string;
};

type AuthentikUser = {
	pk?: number;
	uuid?: string;
	name?: string;
	username?: string;
	email?: string;
};

type AuthentikPaginated<T> = {
	results?: T[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Username slug matching membership-tools (`firstname.lastname`). */
export function normalizeUsernamePart(text: string): string {
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

function isAuthentikApiConfigured(): boolean {
	const { apiUrl, apiToken } = serverConfig.authentik;
	return Boolean(apiUrl && apiToken);
}

function apiBase(): string {
	return serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
}

function authHeaders(json = false): HeadersInit {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${serverConfig.authentik.apiToken}`,
		Accept: "application/json",
	};
	if (json) headers["Content-Type"] = "application/json";
	return headers;
}

async function authentikFetch<T>(
	path: string,
	init?: RequestInit & { responseType?: "json" | "none" },
): Promise<T> {
	const url = `${apiBase()}${path}`;
	const response = await fetch(url, init);
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		throw new Error(
			`Authentik ${init?.method ?? "GET"} ${path} → ${response.status}: ${detail.slice(0, 300)}`,
		);
	}
	if (init?.responseType === "none" || response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

async function getUserByUsername(
	username: string,
): Promise<AuthentikUser | null> {
	const body = await authentikFetch<AuthentikPaginated<AuthentikUser>>(
		`/api/v3/core/users/?username=${encodeURIComponent(username)}&page_size=5`,
		{ headers: authHeaders() },
	);
	return body.results?.[0] ?? null;
}

async function getGroupIdByName(name: string): Promise<string | null> {
	const expected = name.trim().toLowerCase();
	if (!expected) return null;

	const body = await authentikFetch<AuthentikPaginated<AuthentikGroup>>(
		`/api/v3/core/groups/?name=${encodeURIComponent(name)}&page_size=5`,
		{ headers: authHeaders() },
	);

	const group =
		body.results?.find(
			(entry) => entry.name?.trim().toLowerCase() === expected,
		) ?? body.results?.[0];
	if (!group) return null;

	return (
		group.group_uuid ??
		group.uuid ??
		(group.pk != null ? String(group.pk) : null)
	);
}

async function setUserPassword(
	userPk: number,
	password: string,
): Promise<void> {
	await authentikFetch(`/api/v3/core/users/${userPk}/set_password/`, {
		method: "POST",
		headers: authHeaders(true),
		body: JSON.stringify({ password }),
		responseType: "none",
	});
}

/**
 * Create an Authentik account (membership-tools parity) and send the welcome mail.
 * Direct fetch for user create — @goauthentik/api create is unreliable.
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
			groupId = (await getGroupIdByName(defaultGroupName)) ?? undefined;
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
			headers: authHeaders(true),
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
