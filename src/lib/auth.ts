/** Client-safe auth types and helpers (no secrets). */

export type AppRole = "hr" | "vorstand";

/** Client-safe session identity. Never include tokens or secrets. */
export type SessionUser = {
	sub: string;
	email: string;
	name: string;
	groups: string[];
	roles: AppRole[];
};

export function primaryRole(roles: AppRole[]): AppRole | null {
	if (roles.includes("vorstand")) return "vorstand";
	if (roles.includes("hr")) return "hr";
	return null;
}

export function roleLabel(role: AppRole): string {
	return role === "vorstand" ? "Vorstand" : "HR";
}

export function hasAppAccess(roles: AppRole[]): boolean {
	return roles.includes("hr") || roles.includes("vorstand");
}
