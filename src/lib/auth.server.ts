import { redirect } from "@tanstack/react-router";
import { setResponseStatus } from "@tanstack/react-start/server";
import * as client from "openid-client";
import type { AppRole, SessionUser } from "#/lib/auth";
import { hasAppAccess, hasElevatedAccess, primaryRole } from "#/lib/auth";
import { getCallbackUrl, serverConfig } from "#/lib/config";
import { getAppSession } from "#/lib/session";

let oidcConfigPromise: Promise<client.Configuration> | null = null;

export function isAuthConfigured(): boolean {
	const { issuer, clientId, clientSecret } = serverConfig.authentik;
	return Boolean(issuer && clientId && clientSecret);
}

async function getOidcConfig(): Promise<client.Configuration> {
	if (!isAuthConfigured()) {
		throw new Error(
			"Authentik OIDC is not configured. Set AUTHENTIK_ISSUER, AUTHENTIK_CLIENT_ID, AUTHENTIK_CLIENT_SECRET.",
		);
	}

	if (!oidcConfigPromise) {
		const { issuer, clientId, clientSecret } = serverConfig.authentik;
		oidcConfigPromise = client.discovery(
			new URL(issuer),
			clientId,
			{ client_secret: clientSecret },
			client.ClientSecretPost(clientSecret),
		);
	}

	return oidcConfigPromise;
}

export function mapGroupsToRoles(groups: string[]): AppRole[] {
	const roles = new Set<AppRole>();
	const hrName = serverConfig.groups.hr.toLowerCase();
	const vorstandName = serverConfig.groups.vorstand.toLowerCase();
	const adminName = serverConfig.groups.admin.toLowerCase();

	for (const group of groups) {
		const normalized = group.trim().toLowerCase();
		if (normalized === hrName) roles.add("hr");
		if (normalized === vorstandName) roles.add("vorstand");
		if (normalized === adminName) roles.add("admin");
	}

	return [...roles];
}

type AuthentikGroup = {
	name?: string;
	group_uuid?: string;
};

type AuthentikPaginated<T> = {
	results?: T[];
};

/**
 * Prefer groups from the OIDC ID token / UserInfo (`groups` claim).
 * Authentik: add Scope Mapping "Group membership" (scope `groups`) to the
 * provider so the claim is emitted — no API token needed for RBAC.
 */
export function extractGroupsClaim(source: unknown): string[] {
	if (!source || typeof source !== "object") return [];
	const raw = (source as Record<string, unknown>).groups;
	if (raw == null) return [];

	const values = Array.isArray(raw) ? raw : [raw];
	const names: string[] = [];

	for (const entry of values) {
		if (typeof entry === "string" && entry.trim()) {
			names.push(entry.trim());
			continue;
		}
		if (entry && typeof entry === "object") {
			const name = (entry as { name?: unknown }).name;
			if (typeof name === "string" && name.trim()) names.push(name.trim());
		}
	}

	return [...new Set(names)];
}

/**
 * Optional REST fallback. Authentik `/core/users/{id}/` expects numeric `pk`,
 * not the OIDC `sub` UUID — that mismatch is what produced 404 / 400.
 */
export async function fetchAuthentikGroups(userSub: string): Promise<string[]> {
	const { apiUrl, apiToken } = serverConfig.authentik;
	if (!apiUrl || !apiToken) {
		return [];
	}

	const base = apiUrl.replace(/\/$/, "");
	const headers = {
		Authorization: `Bearer ${apiToken}`,
		Accept: "application/json",
	};

	// Resolve numeric pk from uuid first (path-by-sub is unreliable).
	const searchUrl = `${base}/api/v3/core/users/?uuid=${encodeURIComponent(userSub)}`;
	const searchRes = await fetch(searchUrl, { headers });
	if (!searchRes.ok) {
		console.warn(
			`[auth] Authentik user lookup failed: ${searchRes.status} (prefer groups claim in JWT)`,
		);
		return [];
	}

	const searchBody = (await searchRes.json()) as AuthentikPaginated<{
		pk?: number | string;
		uuid?: string;
		groups?: unknown;
	}>;
	const user = searchBody.results?.[0];
	if (!user) return [];

	const embedded = extractGroupsClaim(user);
	if (embedded.length > 0) return embedded;

	const pk = user.pk;
	if (pk == null) return [];

	const byPk = await fetch(
		`${base}/api/v3/core/users/${encodeURIComponent(String(pk))}/groups/`,
		{ headers },
	);
	if (!byPk.ok) {
		console.warn(
			`[auth] Authentik groups-by-pk failed: ${byPk.status} (prefer groups claim in JWT)`,
		);
		return [];
	}

	const byPkBody = (await byPk.json()) as
		| AuthentikPaginated<AuthentikGroup>
		| AuthentikGroup[];
	const results = Array.isArray(byPkBody) ? byPkBody : (byPkBody.results ?? []);
	return results
		.map((g) => g.name)
		.filter((name): name is string => Boolean(name));
}

async function resolveUserGroups(
	claims: Record<string, unknown>,
	userInfo: Record<string, unknown> | null,
	userSub: string,
): Promise<string[]> {
	const fromToken = extractGroupsClaim(claims);
	if (fromToken.length > 0) return fromToken;

	const fromUserInfo = extractGroupsClaim(userInfo);
	if (fromUserInfo.length > 0) return fromUserInfo;

	const fromApi = await fetchAuthentikGroups(userSub);
	if (fromApi.length > 0) return fromApi;

	console.warn(
		"[auth] No groups in ID token/UserInfo and API fallback empty. Add Authentik scope mapping `groups`.",
	);
	return [];
}

export async function buildLoginRedirectUrl(): Promise<string> {
	const config = await getOidcConfig();
	const codeVerifier = client.randomPKCECodeVerifier();
	const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
	const state = client.randomState();
	const nonce = client.randomNonce();

	const session = await getAppSession();
	await session.update({
		oauth: { codeVerifier, state, nonce },
	});

	const parameters: Record<string, string> = {
		redirect_uri: getCallbackUrl(),
		// `groups` requires Authentik Scope Mapping "Group membership" on the provider
		scope: "openid profile email groups",
		code_challenge: codeChallenge,
		code_challenge_method: "S256",
		state,
		nonce,
		response_type: "code",
	};

	if (!config.serverMetadata().supportsPKCE()) {
		// PKCE is still sent; state covers CSRF when AS may not advertise PKCE
	}

	const redirectTo = client.buildAuthorizationUrl(config, parameters);
	return redirectTo.href;
}

export async function handleOidcCallback(
	callbackUrl: URL,
): Promise<SessionUser> {
	const config = await getOidcConfig();
	const session = await getAppSession();
	const oauth = session.data.oauth;

	if (!oauth?.codeVerifier || !oauth.state || !oauth.nonce) {
		throw new Error("oauth_session_missing");
	}

	// Rebuild with APP_URL origin. Behind TLS-terminating Traefik the inbound
	// request URL is http://…, but authorize used https://… from APP_URL —
	// Authentik then rejects the token exchange (often as misleading invalid_client).
	const canonicalCallbackUrl = new URL(
		`${callbackUrl.pathname}${callbackUrl.search}`,
		serverConfig.appUrl,
	);

	const tokens = await client.authorizationCodeGrant(
		config,
		canonicalCallbackUrl,
		{
			pkceCodeVerifier: oauth.codeVerifier,
			expectedState: oauth.state,
			expectedNonce: oauth.nonce,
		},
	);

	const claims = tokens.claims();
	if (!claims?.sub) {
		throw new Error("id_token_missing_sub");
	}

	const claimRecord = claims as Record<string, unknown>;
	let email = typeof claims.email === "string" ? claims.email : "";
	let name =
		typeof claims.name === "string"
			? claims.name
			: typeof claims.preferred_username === "string"
				? claims.preferred_username
				: email || claims.sub;
	let userInfo: Record<string, unknown> | null = null;

	if (tokens.access_token) {
		try {
			const info = await client.fetchUserInfo(
				config,
				tokens.access_token,
				claims.sub,
			);
			userInfo = info as Record<string, unknown>;
			if (typeof info.email === "string") email = info.email;
			if (typeof info.name === "string") name = info.name;
			else if (typeof info.preferred_username === "string") {
				name = info.preferred_username;
			}
		} catch (err) {
			console.warn("[auth] userinfo fetch failed", err);
		}
	}

	const groups = await resolveUserGroups(claimRecord, userInfo, claims.sub);
	const roles = mapGroupsToRoles(groups);

	const user: SessionUser = {
		sub: claims.sub,
		email,
		name,
		groups,
		roles,
	};

	await session.update({
		user,
		idToken: tokens.id_token,
		oauth: undefined,
	});

	return user;
}

export async function buildLogoutRedirectUrl(): Promise<string> {
	const session = await getAppSession();
	const idToken = session.data.idToken;
	await session.clear();

	if (!isAuthConfigured()) {
		return new URL("/login", serverConfig.appUrl).toString();
	}

	try {
		const config = await getOidcConfig();
		const endSession = config.serverMetadata().end_session_endpoint;
		if (endSession) {
			const url = new URL(endSession);
			url.searchParams.set(
				"post_logout_redirect_uri",
				new URL("/login", serverConfig.appUrl).toString(),
			);
			if (idToken) url.searchParams.set("id_token_hint", idToken);
			return url.toString();
		}
	} catch (err) {
		console.warn("[auth] logout discovery failed", err);
	}

	return new URL("/login", serverConfig.appUrl).toString();
}

export async function getSessionUser(): Promise<SessionUser | null> {
	const session = await getAppSession();
	const user = session.data.user;
	if (!user) return null;

	// Only expose client-safe fields (strip legacy idToken if still nested in old cookies).
	return {
		sub: user.sub,
		email: user.email,
		name: user.name,
		groups: user.groups,
		roles: user.roles,
	};
}

export async function requireSessionUser(): Promise<SessionUser> {
	const user = await getSessionUser();
	if (!user) {
		throw redirect({ to: "/login" });
	}
	return user;
}

/**
 * RBAC gate for server functions and API handlers.
 * hr / vorstand / admin may use the app; everyone else → kein Zugang / 403.
 */
export async function requireAppAccess(options?: {
	asJson?: boolean;
}): Promise<SessionUser> {
	const user = await getSessionUser();

	if (!user) {
		if (options?.asJson) {
			setResponseStatus(401);
			throw new Error("Nicht angemeldet");
		}
		throw redirect({ to: "/login" });
	}

	if (!hasAppAccess(user.roles)) {
		if (options?.asJson) {
			setResponseStatus(403);
			throw new Error("Kein Zugang");
		}
		throw redirect({ to: "/no-access" });
	}

	return user;
}

export async function createMockSession(
	role: AppRole | "none",
): Promise<SessionUser> {
	if (!serverConfig.authMock) {
		throw new Error("Mock-Auth ist deaktiviert.");
	}

	const roles: AppRole[] =
		role === "admin"
			? ["admin", "hr"]
			: role === "vorstand"
				? ["vorstand", "hr"]
				: role === "hr"
					? ["hr"]
					: [];

	const user: SessionUser = {
		sub: `mock-${role}`,
		email:
			role === "admin"
				? "admin@neuland.local"
				: role === "vorstand"
					? "vorstand@neuland.local"
					: role === "hr"
						? "hr@neuland.local"
						: "gast@neuland.local",
		name:
			role === "admin"
				? "Mock Admin"
				: role === "vorstand"
					? "Mock Vorstand"
					: role === "hr"
						? "Mock HR"
						: "Mock Gast",
		groups:
			role === "none"
				? []
				: [
						serverConfig.groups.hr,
						...(role === "vorstand" ? [serverConfig.groups.vorstand] : []),
						...(role === "admin" ? [serverConfig.groups.admin] : []),
					],
		roles,
	};

	const session = await getAppSession();
	await session.update({ user, idToken: undefined, oauth: undefined });
	return user;
}

export { primaryRole, hasAppAccess, hasElevatedAccess };
