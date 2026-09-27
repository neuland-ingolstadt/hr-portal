import {
	clearSession,
	getSession,
	updateSession,
} from "@tanstack/react-start/server";
import type { SessionUser } from "#/lib/auth";
import { assertSessionSecret } from "#/lib/config";

export type AppSessionData = {
	user?: SessionUser;
	/** OIDC ID token — server-only, used for logout id_token_hint. Never send to client. */
	idToken?: string;
	oauth?: {
		codeVerifier: string;
		state: string;
		nonce: string;
	};
};

function sessionConfig() {
	return {
		name: "neuland-hr-session",
		password: assertSessionSecret(),
		cookie: {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax" as const,
			maxAge: 60 * 60 * 8, // 8 hours
			path: "/",
		},
	};
}

export async function getAppSession() {
	const config = sessionConfig();
	const session = await getSession<AppSessionData>(config);

	return {
		data: session.data as AppSessionData,
		async update(data: Partial<AppSessionData>) {
			await updateSession<AppSessionData>(config, data);
		},
		async clear() {
			await clearSession(config);
		},
	};
}
