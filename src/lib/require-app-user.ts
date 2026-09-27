import { redirect } from "@tanstack/react-router";
import { hasAppAccess, type SessionUser } from "#/lib/auth";

/** Client-side UX gate using root auth context (server fns still call requireAppAccess). */
export function requireAppUser(
	user: SessionUser | null | undefined,
): SessionUser {
	if (!user) {
		throw redirect({ to: "/login" });
	}
	if (!hasAppAccess(user.roles)) {
		throw redirect({ to: "/no-access" });
	}
	return user;
}
