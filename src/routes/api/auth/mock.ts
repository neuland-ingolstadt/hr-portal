import { createFileRoute } from "@tanstack/react-router";
import { hasAppAccess } from "#/lib/auth";
import { createMockSession } from "#/lib/auth.server";
import { serverConfig } from "#/lib/config";
import { redirectResponse } from "#/lib/http";

export const Route = createFileRoute("/api/auth/mock")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				if (!serverConfig.authMock) {
					return new Response("Mock-Auth deaktiviert", { status: 403 });
				}

				const url = new URL(request.url);
				const roleParam = url.searchParams.get("role");
				const role =
					roleParam === "vorstand"
						? "vorstand"
						: roleParam === "none"
							? "none"
							: "hr";

				const user = await createMockSession(role);
				const target = hasAppAccess(user.roles) ? "/" : "/kein-zugang";
				return redirectResponse(
					new URL(target, serverConfig.appUrl).toString(),
				);
			},
		},
	},
});
