/**
 * Shared Authentik REST helpers (server-only).
 * Prefer these over copying authHeaders / fetch / UUID resolve into each domain module.
 */

import { serverConfig } from "#/lib/config";

export const AUTHENTIK_UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AuthentikPaginated<T> = {
	pagination?: { next?: number | null; count?: number };
	results?: T[];
};

export type AuthentikGroup = {
	pk?: number | string;
	name?: string;
	group_uuid?: string;
	uuid?: string;
	/** User PKs only (default list/detail payload). */
	users?: unknown[];
	/** Expanded users when `include_users=true`. */
	users_obj?: AuthentikUser[];
};

export type AuthentikUser = {
	pk?: number | string;
	uuid?: string;
	name?: string;
	username?: string;
	email?: string;
	is_active?: boolean;
	type?: string;
	/** Account creation timestamp (Django / Authentik). */
	date_joined?: string;
	attributes?: Record<string, unknown>;
	/** Group UUIDs or nested group objects, depending on Authentik version. */
	groups?: Array<string | AuthentikGroup>;
};

export function isAuthentikApiConfigured(): boolean {
	const { apiUrl, apiToken } = serverConfig.authentik;
	return Boolean(apiUrl && apiToken);
}

export function authentikApiBase(): string {
	return serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
}

export function authentikAuthHeaders(json = false): HeadersInit {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${serverConfig.authentik.apiToken}`,
		Accept: "application/json",
	};
	if (json) headers["Content-Type"] = "application/json";
	return headers;
}

export async function authentikFetch<T>(
	path: string,
	init?: RequestInit & { responseType?: "json" | "none" },
): Promise<T> {
	const response = await fetch(`${authentikApiBase()}${path}`, init);
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

/** Resolve by Authentik user UUID, or fall back to numeric/string PK path. */
export async function resolveAuthentikUserByUuidOrPk(
	id: string,
): Promise<AuthentikUser | null> {
	const sub = id.trim();
	if (!sub) return null;

	if (AUTHENTIK_UUID_RE.test(sub)) {
		const body = await authentikFetch<AuthentikPaginated<AuthentikUser>>(
			`/api/v3/core/users/?uuid=${encodeURIComponent(sub)}&page_size=5`,
			{ headers: authentikAuthHeaders() },
		);
		return (
			body.results?.find((entry) => entry.uuid === sub) ??
			body.results?.[0] ??
			null
		);
	}

	try {
		return await authentikFetch<AuthentikUser>(
			`/api/v3/core/users/${encodeURIComponent(sub)}/`,
			{ headers: authentikAuthHeaders() },
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("→ 404")) return null;
		throw error;
	}
}

export function authentikGroupKey(group: AuthentikGroup): string | null {
	return (
		group.group_uuid ??
		group.uuid ??
		(group.pk != null ? String(group.pk) : null)
	);
}

export async function resolveAuthentikGroupIdByName(
	name: string,
): Promise<string | null> {
	const expected = name.trim().toLowerCase();
	if (!expected) return null;

	const body = await authentikFetch<AuthentikPaginated<AuthentikGroup>>(
		`/api/v3/core/groups/?name=${encodeURIComponent(name)}&page_size=5`,
		{ headers: authentikAuthHeaders() },
	);

	const group =
		body.results?.find(
			(entry) => entry.name?.trim().toLowerCase() === expected,
		) ?? body.results?.[0];
	if (!group) return null;

	return authentikGroupKey(group);
}
