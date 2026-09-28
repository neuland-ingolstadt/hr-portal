/**
 * Local backfill: set Authentik `attributes.easyVereinMemberId` from EasyVerein.
 *
 * Matching:
 *   1. Unique email → auto-apply with `--apply`
 *   2. Unique name (no email hit) → review only (use `--apply-name` after review)
 *
 * Usage:
 *   bun run scripts/backfill-easyverein-ids.ts
 *   bun run scripts/backfill-easyverein-ids.ts --apply
 *   bun run scripts/backfill-easyverein-ids.ts --apply --apply-name
 *
 * Requires: EASYVEREIN_API_TOKEN, AUTHENTIK_API_URL, AUTHENTIK_API_TOKEN
 * (Bun loads `.env` automatically.)
 */

import { serverConfig } from "#/lib/config";
import {
	listEasyVereinDirectoryMembers,
	type EasyVereinDirectoryMember,
} from "#/lib/easyverein.server";

const ATTR_EASYVEREIN = "easyVereinMemberId";

type AuthentikUser = {
	pk?: number;
	uuid?: string;
	name?: string;
	username?: string;
	email?: string;
	is_active?: boolean;
	type?: string;
	attributes?: Record<string, unknown>;
};

type AuthentikPaginated<T> = {
	pagination?: { next?: number | null };
	results?: T[];
};

type MatchKind = "email" | "name";

type ProposedLink = {
	kind: MatchKind;
	ev: EasyVereinDirectoryMember;
	user: AuthentikUser;
};

type Conflict = {
	reason: string;
	ev: EasyVereinDirectoryMember;
	users?: AuthentikUser[];
};

function parseFlags(argv: string[]) {
	return {
		apply: argv.includes("--apply"),
		applyName: argv.includes("--apply-name"),
		includeApplications: argv.includes("--include-applications"),
		help: argv.includes("--help") || argv.includes("-h"),
	};
}

function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

function normalizeName(text: string): string {
	return text
		.toLowerCase()
		.replace(/prof\.?/gi, " ")
		.replace(/dr\.?/gi, " ")
		.replace(/ä/g, "ae")
		.replace(/ö/g, "oe")
		.replace(/ü/g, "ue")
		.replace(/ß/g, "ss")
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.replace(/\s+/g, " ");
}

/** Sorted token key so "Last First" ≈ "First Last". */
function nameKey(text: string): string {
	const normalized = normalizeName(text);
	if (!normalized) return "";
	return normalized.split(" ").filter(Boolean).sort().join(" ");
}

function easyVereinIdFromAttributes(
	attributes: Record<string, unknown> | undefined,
): number | null {
	const value = attributes?.[ATTR_EASYVEREIN];
	if (typeof value === "number" && Number.isInteger(value) && value > 0) {
		return value;
	}
	if (typeof value === "string" && /^\d+$/.test(value.trim())) {
		const parsed = Number.parseInt(value.trim(), 10);
		return parsed > 0 ? parsed : null;
	}
	return null;
}

function userLabel(user: AuthentikUser): string {
	const name = user.name?.trim() || user.username || "?";
	const email = user.email?.trim() || "-";
	const pk = user.pk != null ? `pk=${user.pk}` : "pk=?";
	return `${name} <${email}> (${pk})`;
}

function evLabel(ev: EasyVereinDirectoryMember): string {
	const email = ev.email || "-";
	return `#${ev.id} ${ev.displayName} <${email}>`;
}

function evNameCandidates(ev: EasyVereinDirectoryMember): string[] {
	const keys = new Set<string>();
	for (const raw of [
		ev.displayName,
		[ev.firstName, ev.lastName].filter(Boolean).join(" "),
		[ev.lastName, ev.firstName].filter(Boolean).join(" "),
	]) {
		const key = nameKey(raw);
		if (key) keys.add(key);
	}
	return [...keys];
}

function authentikNameCandidates(user: AuthentikUser): string[] {
	const keys = new Set<string>();
	const attrs = user.attributes ?? {};
	const first =
		typeof attrs.firstName === "string" ? attrs.firstName.trim() : "";
	const last = typeof attrs.lastName === "string" ? attrs.lastName.trim() : "";

	for (const raw of [
		user.name ?? "",
		[first, last].filter(Boolean).join(" "),
		[last, first].filter(Boolean).join(" "),
	]) {
		const key = nameKey(raw);
		if (key) keys.add(key);
	}
	return [...keys];
}

function isAuthentikConfigured(): boolean {
	return Boolean(
		serverConfig.authentik.apiUrl && serverConfig.authentik.apiToken,
	);
}

function authentikBase(): string {
	return serverConfig.authentik.apiUrl?.replace(/\/$/, "") ?? "";
}

function authentikHeaders(json = false): HeadersInit {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${serverConfig.authentik.apiToken}`,
		Accept: "application/json",
	};
	if (json) headers["Content-Type"] = "application/json";
	return headers;
}

async function authentikFetch<T>(
	path: string,
	init?: RequestInit,
): Promise<T> {
	const response = await fetch(`${authentikBase()}${path}`, init);
	if (!response.ok) {
		const detail = await response.text().catch(() => "");
		const title = detail.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
		if (title || detail.trimStart().startsWith("<!DOCTYPE")) {
			throw new Error(
				`Authentik ${init?.method ?? "GET"} ${path} → ${response.status}: gateway/HTML error` +
					(title ? ` (“${title}”)` : "") +
					` - is ${authentikBase()} up?`,
			);
		}
		throw new Error(
			`Authentik ${init?.method ?? "GET"} ${path} → ${response.status}: ${detail.slice(0, 300)}`,
		);
	}
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

async function listAuthentikUsers(): Promise<AuthentikUser[]> {
	const users: AuthentikUser[] = [];
	let page = 1;

	while (true) {
		const body = await authentikFetch<AuthentikPaginated<AuthentikUser>>(
			`/api/v3/core/users/?page=${page}&page_size=100`,
			{ headers: authentikHeaders() },
		);
		users.push(...(body.results ?? []));
		const next = body.pagination?.next;
		if (!next || next === page) break;
		page = next;
	}

	return users.filter(
		(u) => u.is_active !== false && u.type !== "service_account" && u.pk != null,
	);
}

async function patchEasyVereinMemberId(
	user: AuthentikUser,
	easyVereinMemberId: number,
): Promise<void> {
	if (user.pk == null) throw new Error("Authentik user missing pk");

	const current = await authentikFetch<AuthentikUser>(
		`/api/v3/core/users/${user.pk}/`,
		{ headers: authentikHeaders() },
	);

	await authentikFetch(`/api/v3/core/users/${user.pk}/`, {
		method: "PATCH",
		headers: authentikHeaders(true),
		body: JSON.stringify({
			attributes: {
				...(current.attributes ?? {}),
				[ATTR_EASYVEREIN]: easyVereinMemberId,
			},
		}),
	});
}

function buildIndexes(users: AuthentikUser[]) {
	const byEmail = new Map<string, AuthentikUser[]>();
	const byName = new Map<string, AuthentikUser[]>();
	const byEvId = new Map<number, AuthentikUser>();

	for (const user of users) {
		const linked = easyVereinIdFromAttributes(user.attributes);
		if (linked != null) byEvId.set(linked, user);

		const email = user.email ? normalizeEmail(user.email) : "";
		if (email) {
			const list = byEmail.get(email) ?? [];
			list.push(user);
			byEmail.set(email, list);
		}

		for (const key of authentikNameCandidates(user)) {
			const list = byName.get(key) ?? [];
			list.push(user);
			byName.set(key, list);
		}
	}

	return { byEmail, byName, byEvId };
}

function matchMembers(
	evMembers: EasyVereinDirectoryMember[],
	users: AuthentikUser[],
) {
	const { byEmail, byName, byEvId } = buildIndexes(users);
	const claimedUserPks = new Set<number>();

	const alreadyLinked: ProposedLink[] = [];
	const emailMatches: ProposedLink[] = [];
	const nameReviews: ProposedLink[] = [];
	const conflicts: Conflict[] = [];
	const unmatched: EasyVereinDirectoryMember[] = [];

	for (const ev of evMembers) {
		const existing = byEvId.get(ev.id);
		if (existing) {
			alreadyLinked.push({ kind: "email", ev, user: existing });
			if (existing.pk != null) claimedUserPks.add(existing.pk);
			continue;
		}

		const email = ev.email ? normalizeEmail(ev.email) : "";
		if (email) {
			const hits = (byEmail.get(email) ?? []).filter(
				(u) => u.pk == null || !claimedUserPks.has(u.pk),
			);
			if (hits.length === 1) {
				const user = hits[0]!;
				const linked = easyVereinIdFromAttributes(user.attributes);
				if (linked != null && linked !== ev.id) {
					conflicts.push({
						reason: `Authentik already has easyVereinMemberId=${linked}`,
						ev,
						users: [user],
					});
					continue;
				}
				emailMatches.push({ kind: "email", ev, user });
				if (user.pk != null) claimedUserPks.add(user.pk);
				continue;
			}
			if (hits.length > 1) {
				conflicts.push({
					reason: `multiple Authentik users for email ${email}`,
					ev,
					users: hits,
				});
				continue;
			}
		}

		const nameHits = new Map<number, AuthentikUser>();
		for (const key of evNameCandidates(ev)) {
			for (const user of byName.get(key) ?? []) {
				if (user.pk == null || claimedUserPks.has(user.pk)) continue;
				nameHits.set(user.pk, user);
			}
		}
		const nameList = [...nameHits.values()];
		if (nameList.length === 1) {
			const user = nameList[0]!;
			const linked = easyVereinIdFromAttributes(user.attributes);
			if (linked != null && linked !== ev.id) {
				conflicts.push({
					reason: `name match but Authentik already has easyVereinMemberId=${linked}`,
					ev,
					users: [user],
				});
				continue;
			}
			nameReviews.push({ kind: "name", ev, user });
			if (user.pk != null) claimedUserPks.add(user.pk);
			continue;
		}
		if (nameList.length > 1) {
			conflicts.push({
				reason: "multiple Authentik users for normalized name",
				ev,
				users: nameList,
			});
			continue;
		}

		unmatched.push(ev);
	}

	return {
		alreadyLinked,
		emailMatches,
		nameReviews,
		conflicts,
		unmatched,
	};
}

function printSection(title: string, lines: string[]) {
	console.log(`\n=== ${title} (${lines.length}) ===`);
	if (lines.length === 0) {
		console.log("(none)");
		return;
	}
	for (const line of lines) console.log(line);
}

async function main() {
	const flags = parseFlags(process.argv.slice(2));
	if (flags.help) {
		console.log(`Usage: bun run scripts/backfill-easyverein-ids.ts [flags]

  (default)               dry-run - print email matches + name reviews
  --apply                 PATCH email matches only
  --apply-name            also PATCH unique name matches (review first!)
  --include-applications  include EasyVerein is_application=true members
  -h, --help              show this help
`);
		return;
	}

	if (!serverConfig.easyVerein.apiToken) {
		throw new Error("Missing EASYVEREIN_API_TOKEN");
	}
	if (!isAuthentikConfigured()) {
		throw new Error("Missing AUTHENTIK_API_URL / AUTHENTIK_API_TOKEN");
	}

	if (flags.applyName && !flags.apply) {
		throw new Error("--apply-name requires --apply");
	}

	console.log("Fetching EasyVerein members…");
	const evMembers = await listEasyVereinDirectoryMembers({
		acceptedOnly: !flags.includeApplications,
	});
	console.log(`  ${evMembers.length} EasyVerein members`);

	console.log("Fetching Authentik users…");
	const users = await listAuthentikUsers();
	console.log(`  ${users.length} active Authentik users`);

	const result = matchMembers(evMembers, users);

	printSection(
		"Already linked",
		result.alreadyLinked.map(
			(m) => `  OK  ${evLabel(m.ev)}  →  ${userLabel(m.user)}`,
		),
	);

	printSection(
		"Email matches (auto with --apply)",
		result.emailMatches.map(
			(m) => `  EMAIL  ${evLabel(m.ev)}  →  ${userLabel(m.user)}`,
		),
	);

	printSection(
		"Name-only matches (review - apply with --apply --apply-name)",
		result.nameReviews.map(
			(m) => `  NAME   ${evLabel(m.ev)}  →  ${userLabel(m.user)}`,
		),
	);

	printSection(
		"Conflicts",
		result.conflicts.map((c) => {
			const users =
				c.users?.map((u) => `      - ${userLabel(u)}`).join("\n") ?? "";
			return `  ! ${evLabel(c.ev)}\n      ${c.reason}${users ? `\n${users}` : ""}`;
		}),
	);

	printSection(
		"Unmatched EasyVerein",
		result.unmatched.map((ev) => `  ? ${evLabel(ev)}`),
	);

	console.log("\n--- Summary ---");
	console.log(`  already linked:  ${result.alreadyLinked.length}`);
	console.log(`  email matches:   ${result.emailMatches.length}`);
	console.log(`  name reviews:    ${result.nameReviews.length}`);
	console.log(`  conflicts:       ${result.conflicts.length}`);
	console.log(`  unmatched:       ${result.unmatched.length}`);

	if (!flags.apply) {
		console.log("\nDry-run only. Re-run with --apply to write email matches.");
		if (result.nameReviews.length > 0) {
			console.log(
				"After reviewing name matches, add --apply-name to write those too.",
			);
		}
		return;
	}

	const toApply: ProposedLink[] = [...result.emailMatches];
	if (flags.applyName) {
		toApply.push(...result.nameReviews);
	} else if (result.nameReviews.length > 0) {
		console.log(
			`\nSkipping ${result.nameReviews.length} name-only match(es) (pass --apply-name to include).`,
		);
	}

	console.log(`\nApplying ${toApply.length} update(s)…`);
	let ok = 0;
	let failed = 0;
	for (const link of toApply) {
		try {
			await patchEasyVereinMemberId(link.user, link.ev.id);
			console.log(`  ✓ ${evLabel(link.ev)} → ${userLabel(link.user)}`);
			ok++;
		} catch (err) {
			failed++;
			const message = err instanceof Error ? err.message : String(err);
			console.error(
				`  ✗ ${evLabel(link.ev)} → ${userLabel(link.user)}: ${message}`,
			);
		}
	}

	console.log(`\nDone. Applied ${ok}, failed ${failed}.`);
	if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
