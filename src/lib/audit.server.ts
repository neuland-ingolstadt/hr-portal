/**
 * Append-only audit log for HR portal mutations.
 * Authentik API calls use a service token; the real actor is the OIDC session
 * user and is recorded here (not in Authentik’s event log).
 *
 * Storage: JSONL file (not a member/identity DB). Mount a volume on
 * `AUDIT_LOG_PATH` in production so events survive restarts.
 */

import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
	type AuditAction,
	type AuditEvent,
	type AuditEventsResult,
	type AuditMeta,
	isAuditAction,
} from "#/lib/audit";
import type { SessionUser } from "#/lib/auth";
import { serverConfig } from "#/lib/config";

export type RecordAuditInput = {
	actor: SessionUser;
	action: AuditAction;
	targetId?: string | null;
	targetLabel?: string | null;
	meta?: AuditMeta | null;
};

const DEFAULT_LIST_LIMIT = 100;
const MAX_LIST_LIMIT = 500;
/** Cap file parse size so a runaway log cannot OOM the process. */
const MAX_READ_BYTES = 8 * 1024 * 1024;

function auditLogPath(): string {
	return serverConfig.auditLogPath;
}

function ensureParentDir(path: string): void {
	mkdirSync(dirname(path), { recursive: true });
}

function parseEvent(line: string): AuditEvent | null {
	const trimmed = line.trim();
	if (!trimmed) return null;
	try {
		const raw = JSON.parse(trimmed) as Partial<AuditEvent>;
		if (!raw || typeof raw !== "object") return null;
		if (typeof raw.id !== "string" || typeof raw.at !== "string") return null;
		if (!isAuditAction(raw.action)) return null;
		if (typeof raw.actorSub !== "string") return null;
		// Legacy rows may include success/error; only keep successful events.
		if ("success" in raw && raw.success === false) return null;
		return {
			id: raw.id,
			at: raw.at,
			action: raw.action,
			actorSub: raw.actorSub,
			actorName: typeof raw.actorName === "string" ? raw.actorName : "",
			actorEmail: typeof raw.actorEmail === "string" ? raw.actorEmail : "",
			actorRoles: Array.isArray(raw.actorRoles)
				? raw.actorRoles.filter((r): r is string => typeof r === "string")
				: [],
			targetId: typeof raw.targetId === "string" ? raw.targetId : null,
			targetLabel: typeof raw.targetLabel === "string" ? raw.targetLabel : null,
			meta:
				raw.meta && typeof raw.meta === "object" && !Array.isArray(raw.meta)
					? (raw.meta as AuditMeta)
					: null,
		};
	} catch {
		return null;
	}
}

/**
 * Persist one audit event. Never throws to callers — mutation success must not
 * depend on the log. Also emits a structured console line for log shippers.
 */
export function recordAudit(input: RecordAuditInput): void {
	const event: AuditEvent = {
		id: crypto.randomUUID(),
		at: new Date().toISOString(),
		action: input.action,
		actorSub: input.actor.sub,
		actorName: input.actor.name,
		actorEmail: input.actor.email,
		actorRoles: [...input.actor.roles],
		targetId: input.targetId?.trim() || null,
		targetLabel: input.targetLabel?.trim() || null,
		meta: input.meta ?? null,
	};

	console.info("[audit]", JSON.stringify(event));

	try {
		const path = auditLogPath();
		ensureParentDir(path);
		appendFileSync(path, `${JSON.stringify(event)}\n`, "utf8");
	} catch (err) {
		console.error("[audit] write failed", err);
	}
}

/** Newest-first list for the elevated audit UI. */
export function listAuditEvents(limit = DEFAULT_LIST_LIMIT): AuditEventsResult {
	const path = auditLogPath();
	const capped = Math.min(
		MAX_LIST_LIMIT,
		Math.max(1, Math.trunc(limit) || DEFAULT_LIST_LIMIT),
	);

	let raw = "";
	try {
		raw = readFileSync(path, "utf8");
	} catch (err) {
		const code =
			err && typeof err === "object" && "code" in err
				? String((err as { code: unknown }).code)
				: "";
		if (code !== "ENOENT") {
			console.error("[audit] read failed", err);
		}
		return { events: [], path };
	}

	if (raw.length > MAX_READ_BYTES) {
		raw = raw.slice(raw.length - MAX_READ_BYTES);
		const firstNl = raw.indexOf("\n");
		if (firstNl >= 0) raw = raw.slice(firstNl + 1);
	}

	const events: AuditEvent[] = [];
	const lines = raw.split("\n");
	for (let i = lines.length - 1; i >= 0 && events.length < capped; i--) {
		const event = parseEvent(lines[i] ?? "");
		if (event) events.push(event);
	}

	return { events, path };
}
