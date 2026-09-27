import { redirect } from "@tanstack/react-router";
import {
	hasAppAccess,
	hasElevatedAccess,
	type SessionUser,
} from "#/lib/auth";

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

/** Client-side UX gate for Vorstand/Admin-only routes (server fns still call requireElevatedAccess). */
export function requireElevatedUser(
	user: SessionUser | null | undefined,
): SessionUser {
	const appUser = requireAppUser(user);
	if (!hasElevatedAccess(appUser.roles)) {
		throw redirect({ to: "/" });
	}
	return appUser;
}
