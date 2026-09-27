/** Client-safe auth types and helpers (no secrets). */

export type AppRole = "hr" | "vorstand" | "admin";

/** Client-safe session identity. Never include tokens or secrets. */
export type SessionUser = {
	sub: string;
	email: string;
	name: string;
	groups: string[];
	roles: AppRole[];
};

export function primaryRole(roles: AppRole[]): AppRole | null {
	if (roles.includes("admin")) return "admin";
	if (roles.includes("vorstand")) return "vorstand";
	if (roles.includes("hr")) return "hr";
	return null;
}

export function roleLabel(role: AppRole): string {
	if (role === "admin") return "Admin";
	if (role === "vorstand") return "Vorstand";
	return "HR";
}

/** Badge styling: admin shares Vorstand chrome (same permission level). */
export function roleBadgeVariant(role: AppRole): "hr" | "vorstand" {
	return role === "hr" ? "hr" : "vorstand";
}

export function hasAppAccess(roles: AppRole[]): boolean {
	return (
		roles.includes("hr") ||
		roles.includes("vorstand") ||
		roles.includes("admin")
	);
}

/** Vorstand-level permissions (Vorstand or Admin). */
export function hasElevatedAccess(roles: AppRole[]): boolean {
	return roles.includes("vorstand") || roles.includes("admin");
}
