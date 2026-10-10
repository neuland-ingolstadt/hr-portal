import { redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type { AppRole, SessionUser } from "#/lib/auth";
import { createMockSession, getSessionUser } from "#/lib/auth.server";
import { serverConfig } from "#/lib/config";
import { tracingMiddleware } from "#/lib/server-fn-tracing";

export const getCurrentUserFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.handler(async (): Promise<SessionUser | null> => {
		return getSessionUser();
	});

export const getAuthStatusFn = createServerFn({ method: "GET" })
	.middleware([tracingMiddleware])
	.handler(async () => {
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
	});

export const mockLoginFn = createServerFn({ method: "POST" })
	.middleware([tracingMiddleware])
	.validator((data: { role: AppRole }) => data)
	.handler(async ({ data }) => {
		await createMockSession(data.role);
		throw redirect({ to: "/" });
	});
