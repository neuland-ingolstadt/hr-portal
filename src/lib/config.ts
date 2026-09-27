/**
 * Server-only configuration. Do not import from client components.
 * Secrets stay on the server; never expose this module to the browser bundle
 * except through carefully shaped server functions.
 */

function required(name: string, fallback?: string): string {
	const value = process.env[name] ?? fallback;
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function optional(name: string, fallback = ""): string {
	return process.env[name] ?? fallback;
}

const sessionSecret =
	process.env.SESSION_SECRET ?? "dev-only-session-secret-change-me-32chars!!";

export const serverConfig = {
	appUrl: optional("APP_URL", "http://127.0.0.1:43127"),
	sessionSecret,
	authentik: {
		issuer: optional("AUTHENTIK_ISSUER"),
		clientId: optional("AUTHENTIK_CLIENT_ID"),
		clientSecret: optional("AUTHENTIK_CLIENT_SECRET"),
		apiUrl: optional("AUTHENTIK_API_URL"),
		apiToken: optional("AUTHENTIK_API_TOKEN"),
	},
	groups: {
		hr: optional("HR_GROUP_NAME", "HR"),
		vorstand: optional("VORSTAND_GROUP_NAME", "Vorstand"),
		/** Authentik group counted as Verein-Mitglieder on the dashboard. */
		mitglieder: optional("MITGLIEDER_GROUP_NAME", "mitglieder"),
	},
	/** Local mock auth — only when AUTH_MOCK=true (never auto-enable). */
	authMock: optional("AUTH_MOCK", "false") === "true",
} as const;

export function getCallbackUrl(): string {
	return new URL("/api/auth/callback", serverConfig.appUrl).toString();
}

export function assertSessionSecret(): string {
	return required("SESSION_SECRET", sessionSecret);
}
