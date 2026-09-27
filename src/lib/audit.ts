/** Client-safe audit trail types (ops history — not an identity store). */

export const AUDIT_ACTIONS = [
	"application.accept",
	"member.create",
	"member.groups.update",
	"member.onboarding_stage.update",
	"offboarding.revoke_mitglieder",
	"offboarding.delete_account",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** JSON-serializable extras only (TanStack Start server-fn constraint). */
export type AuditMetaValue = string | number | boolean | null | string[];
export type AuditMeta = Record<string, AuditMetaValue>;

export type AuditEvent = {
	id: string;
	/** ISO-8601 timestamp. */
	at: string;
	action: AuditAction;
	actorSub: string;
	actorName: string;
	actorEmail: string;
	actorRoles: string[];
	/** Authentik sub / EV id / username — whatever identifies the target. */
	targetId: string | null;
	/** Human-readable target (name, email, …). */
	targetLabel: string | null;
	success: boolean;
	error: string | null;
	meta: AuditMeta | null;
};

export type AuditEventsResult = {
	events: AuditEvent[];
	/** Absolute path used on the server (for ops hints). */
	path: string;
};

/** i18n keys for action labels. */
export const AUDIT_ACTION_LABEL_KEYS = {
	"application.accept": "audit.action.application.accept",
	"member.create": "audit.action.member.create",
	"member.groups.update": "audit.action.member.groups.update",
	"member.onboarding_stage.update":
		"audit.action.member.onboarding_stage.update",
	"offboarding.revoke_mitglieder": "audit.action.offboarding.revoke_mitglieder",
	"offboarding.delete_account": "audit.action.offboarding.delete_account",
} as const;

export function isAuditAction(value: unknown): value is AuditAction {
	return (
		typeof value === "string" &&
		(AUDIT_ACTIONS as readonly string[]).includes(value)
	);
}
