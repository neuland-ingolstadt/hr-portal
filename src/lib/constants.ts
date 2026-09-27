export const APP_NAME = "Neuland HR" as const;

export const EXTERNAL_LINKS = {
	WEBSITE: "https://neuland-ingolstadt.de",
	WEBSITE_IMPRESSUM: "https://neuland-ingolstadt.de/legal/impressum",
	WEBSITE_DATENSCHUTZ: "https://neuland-ingolstadt.de/legal/datenschutz",
	REPOSITORY: "https://origin.cursor.com/eggl/hr-portal",
	EGGL_DEV: "https://eggl.dev",
} as const;

export const ROUTES = {
	HOME: "/",
	LOGIN: "/login",
	KEIN_ZUGANG: "/kein-zugang",
	MITGLIEDER: "/mitglieder",
	SCANNER: "/scanner",
	BEWERBUNGEN: "/bewerbungen",
	ONBOARDING: "/onboarding",
	OFFBOARDING: "/offboarding",
	AUTH_LOGIN: "/api/auth/login",
	AUTH_LOGOUT: "/api/auth/logout",
} as const;
