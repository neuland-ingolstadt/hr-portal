import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { AppRole, SessionUser } from "#/lib/auth";
import {
	createMockSession,
	getSessionUser,
	requireAppAccess,
} from "#/lib/auth.server";
import { serverConfig } from "#/lib/config";

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
	async (): Promise<SessionUser | null> => {
		return getSessionUser();
	},
);

export const getAuthStatusFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await getSessionUser();
		return {
			user,
			authMock: serverConfig.authMock,
			authConfigured: Boolean(
				serverConfig.authentik.issuer &&
					serverConfig.authentik.clientId &&
					serverConfig.authentik.clientSecret,
			),
		};
	},
);

/** Example protected server fn — every createServerFn that needs auth uses requireAppAccess. */
export const getProtectedHomeFn = createServerFn({ method: "GET" }).handler(
	async () => {
		const user = await requireAppAccess();
		return { user };
	},
);

export const mockLoginFn = createServerFn({ method: "POST" })
	.validator((data: { role: AppRole }) => data)
	.handler(async ({ data }) => {
		await createMockSession(data.role);
		throw redirect({ to: "/" });
	});
