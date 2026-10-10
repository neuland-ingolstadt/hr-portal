import type { PendingApplication } from "#/lib/applications";
import { serverConfig } from "#/lib/config";
import { mergeTracingHeaders, withOutboundSpan } from "#/lib/tracing.server";

type EasyVereinContactDetails = {
	id?: number;
	name?: string | null;
	first_name?: string | null;
	family_name?: string | null;
	private_email?: string | null;
	primary_email?: string | null;
	company_email?: string | null;
	iban?: string | null;
	sepa_date?: string | null;
	sepa_mandate?: string | null;
};

type EasyVereinMember = {
	id: number;
	email?: string | null;
	email_or_user_name?: string | null;
	name_for_sorting?: string | null;
	is_application?: boolean;
	application_date?: string | null;
	join_date?: string | null;
	resignation_date?: string | null;
	contact_details?: EasyVereinContactDetails | string | null;
};

/** Result of optional SEPA mandate write during application accept. */
export type EasyVereinSepaMandateResult =
	| { status: "set"; sepaDate: string; sepaMandate: string }
	| { status: "already_set" }
	| { status: "skipped_no_iban" }
	| { status: "skipped_no_contact" }
	| { status: "failed"; message: string };

type EasyVereinPaginated<T> = {
	next?: string | null;
	results?: T[];
};

const MEMBER_LIST_QUERY =
	"{id,email,email_or_user_name,name_for_sorting,is_application,application_date,join_date,contact_details{id,name,first_name,family_name,private_email,primary_email,company_email}}";

const MEMBER_STATUS_QUERY = "{id,resignation_date,is_application}";

/** Read-only EasyVerein membership state for a linked Authentik user. */
export type EasyVereinMemberStatus =
	| { state: "active" }
	| { state: "leaving"; resignationDate: string }
	| { state: "left"; resignationDate: string | null }
	| { state: "missing" };

export type EasyVereinMembershipSnapshot = {
	/** Non-deleted members keyed by EV id. */
	byId: Map<number, { resignationDate: string | null }>;
	/** Soft-deleted member ids in the wastebasket. */
	wastebasketIds: Set<number>;
};

const MEMBERSHIP_SNAPSHOT_TTL_MS = 5 * 60_000;
/**
 * Dashboard pending-count - stale-while-revalidate.
 * Fresh: serve as-is. Soft-stale: serve + background refresh. Hard miss: await.
 */
const PENDING_COUNT_FRESH_MS = 5 * 60_000;
const PENDING_COUNT_MAX_AGE_MS = 30 * 60_000;
/** Id-only query - enough to count without contact nested payloads. */
const PENDING_COUNT_QUERY = "{id,is_application}";

let membershipSnapshotCache: {
	expiresAt: number;
	value: EasyVereinMembershipSnapshot | null;
	inflight: Promise<EasyVereinMembershipSnapshot> | null;
} = {
	expiresAt: 0,
	value: null,
	inflight: null,
};

let pendingCountCache: {
	fetchedAt: number;
	value: number | null;
	inflight: Promise<number> | null;
} = {
	fetchedAt: 0,
	value: null,
	inflight: null,
};

/** Drop cached pending count after accept (or when list is mutated). */
export function invalidatePendingApplicationCountCache(): void {
	pendingCountCache = { fetchedAt: 0, value: null, inflight: null };
}

function refreshPendingApplicationCount(): Promise<number> {
	if (pendingCountCache.inflight) return pendingCountCache.inflight;

	pendingCountCache.inflight = (async () => {
		const count = await countPendingApplicationsUncached();
		pendingCountCache.value = count;
		pendingCountCache.fetchedAt = Date.now();
		return count;
	})().finally(() => {
		pendingCountCache.inflight = null;
	});

	return pendingCountCache.inflight;
}

export function isEasyVereinConfigured(): boolean {
	return Boolean(serverConfig.easyVerein.apiToken);
}

function apiBase(): string {
	return serverConfig.easyVerein.apiBase;
}

function authHeaders(json = false): HeadersInit {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${serverConfig.easyVerein.apiToken}`,
		Accept: "application/json",
	};
	if (json) headers["Content-Type"] = "application/json";
	return headers;
}

async function easyVereinFetch<T>(
	path: string,
	init?: RequestInit & { responseType?: "json" | "none" },
): Promise<T> {
	// Child span is "METHOD easyverein" (method + fixed service label only -
	// never the path, which may contain member IDs). Trace context is injected
	// into the outbound request headers.
	return withOutboundSpan(
		"easyverein",
		init?.method ?? "GET",
		async ({ span, traceHeaders }) => {
			const url = path.startsWith("http") ? path : `${apiBase()}${path}`;
			const response = await fetch(url, {
				...init,
				headers: mergeTracingHeaders(init?.headers, traceHeaders),
			});
			// Status code only - response bodies / paths may hold identifiers.
			span?.setAttribute("http.response.status_code", response.status);
			if (!response.ok) {
				const detail = await response.text().catch(() => "");
				throw new Error(
					`EasyVerein ${init?.method ?? "GET"} ${path} → ${response.status}: ${detail.slice(0, 300)}`,
				);
			}
			if (init?.responseType === "none" || response.status === 204) {
				return undefined as T;
			}
			return (await response.json()) as T;
		},
	);
}

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

function pickEmail(member: EasyVereinMember): string {
	const contact =
		member.contact_details && typeof member.contact_details === "object"
			? member.contact_details
			: null;
	return (
		contact?.primary_email?.trim() ||
		contact?.private_email?.trim() ||
		contact?.company_email?.trim() ||
		member.email?.trim() ||
		member.email_or_user_name?.trim() ||
		""
	);
}

function contactParts(member: EasyVereinMember): {
	firstName: string;
	lastName: string;
	displayName: string;
} {
	const contact =
		member.contact_details && typeof member.contact_details === "object"
			? member.contact_details
			: null;
	const firstName = contact?.first_name?.trim() ?? "";
	const lastName = contact?.family_name?.trim() ?? "";
	const displayName =
		contact?.name?.trim() ||
		[firstName, lastName].filter(Boolean).join(" ") ||
		member.name_for_sorting?.trim() ||
		pickEmail(member) ||
		`#${member.id}`;
	return { firstName, lastName, displayName };
}

function mapMember(member: EasyVereinMember): PendingApplication {
	const { firstName, lastName, displayName } = contactParts(member);
	return {
		id: member.id,
		firstName,
		lastName,
		email: pickEmail(member),
		displayName,
		applicationDate: member.application_date ?? null,
	};
}

/** Accepted (or all) members for local backfill / linkage scripts. */
export type EasyVereinDirectoryMember = {
	id: number;
	email: string;
	firstName: string;
	lastName: string;
	displayName: string;
	isApplication: boolean;
};

function mapDirectoryMember(
	member: EasyVereinMember,
): EasyVereinDirectoryMember {
	const { firstName, lastName, displayName } = contactParts(member);
	return {
		id: member.id,
		email: pickEmail(member),
		firstName,
		lastName,
		displayName,
		isApplication: Boolean(member.is_application),
	};
}

async function paginateMembers(
	params: Record<string, string>,
): Promise<EasyVereinMember[]> {
	const members: EasyVereinMember[] = [];
	let next: string | null = `/member?${new URLSearchParams({
		limit: "100",
		query: MEMBER_LIST_QUERY,
		...params,
	}).toString()}`;

	while (next) {
		const page: EasyVereinPaginated<EasyVereinMember> = await easyVereinFetch<
			EasyVereinPaginated<EasyVereinMember>
		>(next, {
			headers: authHeaders(),
		});
		members.push(...(page.results ?? []));
		next = page.next ?? null;
	}

	return members;
}

/**
 * Pending membership applications (`is_application=true`).
 * Uses EasyVerein nested `query` to embed contact details in one request.
 */
export async function listPendingApplications(): Promise<PendingApplication[]> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const members = await paginateMembers({
		is_application: "true",
		ordering: "application_date",
	});
	return members.filter((m) => m.is_application).map(mapMember);
}

async function countPendingApplicationsUncached(): Promise<number> {
	let total = 0;
	let next: string | null = `/member?${new URLSearchParams({
		limit: "100",
		query: PENDING_COUNT_QUERY,
		is_application: "true",
		ordering: "application_date",
	}).toString()}`;

	while (next) {
		const page: EasyVereinPaginated<EasyVereinMember> = await easyVereinFetch<
			EasyVereinPaginated<EasyVereinMember>
		>(next, {
			headers: authHeaders(),
		});
		const results = page.results ?? [];
		total += results.filter((m) => m.is_application).length;
		next = page.next ?? null;
	}

	return total;
}

/**
 * Lightweight pending-application count for the dashboard
 * (id-only pages, SWR: fresh 5m / max 30m).
 */
export async function countPendingApplications(): Promise<number> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const now = Date.now();
	const cached = pendingCountCache.value;
	if (cached != null) {
		const age = now - pendingCountCache.fetchedAt;
		if (age < PENDING_COUNT_FRESH_MS) return cached;
		if (age < PENDING_COUNT_MAX_AGE_MS) {
			void refreshPendingApplicationCount().catch((err) => {
				console.error("[easyverein] pending count refresh failed", err);
			});
			return cached;
		}
	}

	return refreshPendingApplicationCount();
}

/**
 * All EasyVerein members (applications included unless `acceptedOnly`).
 * Used by the local `easyVereinMemberId` backfill script.
 */
export async function listEasyVereinDirectoryMembers(options?: {
	acceptedOnly?: boolean;
}): Promise<EasyVereinDirectoryMember[]> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const params: Record<string, string> = {
		ordering: "name_for_sorting",
	};
	if (options?.acceptedOnly) {
		params.is_application = "false";
	}

	const members = await paginateMembers(params);
	return members
		.filter((m) => (options?.acceptedOnly ? !m.is_application : true))
		.map(mapDirectoryMember);
}

export async function getPendingApplication(
	memberId: number,
): Promise<PendingApplication | null> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	try {
		const member = await easyVereinFetch<EasyVereinMember>(
			`/member/${memberId}?${new URLSearchParams({
				query: MEMBER_LIST_QUERY,
			}).toString()}`,
			{ headers: authHeaders() },
		);
		if (!member.is_application) return null;
		return mapMember(member);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes("→ 404")) return null;
		throw error;
	}
}

/**
 * Accept a pending application: clear `is_application` and ensure `join_date`.
 */
export async function acceptEasyVereinApplication(
	memberId: number,
): Promise<void> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const existing = await easyVereinFetch<EasyVereinMember>(
		`/member/${memberId}?${new URLSearchParams({
			query: "{id,is_application,join_date}",
		}).toString()}`,
		{ headers: authHeaders() },
	);

	if (!existing.is_application) {
		throw new Error("easyverein_not_pending");
	}

	const body: { is_application: false; join_date?: string } = {
		is_application: false,
	};
	if (!existing.join_date) {
		body.join_date = todayIsoDate();
	}

	await easyVereinFetch(`/member/${memberId}`, {
		method: "PATCH",
		headers: authHeaders(true),
		body: JSON.stringify(body),
	});
}

function resolveContactDetailsId(
	contact: EasyVereinContactDetails | string | null | undefined,
): number | null {
	if (
		contact &&
		typeof contact === "object" &&
		typeof contact.id === "number"
	) {
		return contact.id;
	}
	if (typeof contact === "string") {
		const match = contact.match(/\/contact-details\/(\d+)/);
		if (match) {
			const id = Number.parseInt(match[1] ?? "", 10);
			return Number.isInteger(id) && id > 0 ? id : null;
		}
	}
	return null;
}

function isoDateOnly(value: string | null | undefined): string | null {
	const raw = value?.trim();
	if (!raw) return null;
	return /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null;
}

/** Unique SEPA mandate reference (≤35 chars, creditor-unique). */
export function buildSepaMandateReference(
	memberId: number,
	sepaDate: string,
): string {
	const compactDate = sepaDate.replaceAll("-", "");
	return `NL${memberId}-${compactDate}`;
}

/**
 * Optionally set EasyVerein SEPA mandate on the member's contact details.
 * Only writes when IBAN is present and `sepa_mandate` is still empty.
 * `sepa_date` defaults to `application_date`, else today.
 */
export async function ensureEasyVereinSepaMandate(
	memberId: number,
): Promise<EasyVereinSepaMandateResult> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const member = await easyVereinFetch<EasyVereinMember>(
		`/member/${memberId}?${new URLSearchParams({
			query:
				"{id,application_date,join_date,contact_details{id,iban,sepa_date,sepa_mandate}}",
		}).toString()}`,
		{ headers: authHeaders() },
	);

	const contactId = resolveContactDetailsId(member.contact_details);
	if (contactId == null) {
		return { status: "skipped_no_contact" };
	}

	let contact: EasyVereinContactDetails;
	if (
		member.contact_details &&
		typeof member.contact_details === "object" &&
		"iban" in member.contact_details
	) {
		contact = member.contact_details;
	} else {
		contact = await easyVereinFetch<EasyVereinContactDetails>(
			`/contact-details/${contactId}`,
			{ headers: authHeaders() },
		);
	}

	const iban = contact.iban?.replace(/\s+/g, "").trim() ?? "";
	if (!iban) {
		return { status: "skipped_no_iban" };
	}

	const existingMandate = contact.sepa_mandate?.trim();
	if (existingMandate) {
		return { status: "already_set" };
	}

	const sepaDate =
		isoDateOnly(contact.sepa_date) ??
		isoDateOnly(member.application_date) ??
		todayIsoDate();
	const sepaMandate = buildSepaMandateReference(memberId, sepaDate);

	try {
		await easyVereinFetch(`/contact-details/${contactId}`, {
			method: "PATCH",
			headers: authHeaders(true),
			body: JSON.stringify({
				sepa_date: sepaDate,
				sepa_mandate: sepaMandate,
			}),
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { status: "failed", message };
	}

	return { status: "set", sepaDate, sepaMandate };
}

async function paginateIds(
	startPath: string,
): Promise<{ id: number; resignation_date?: string | null }[]> {
	type Row = { id: number; resignation_date?: string | null };
	const rows: Row[] = [];
	let next: string | null = startPath;

	while (next) {
		const page: EasyVereinPaginated<Row> = await easyVereinFetch(next, {
			headers: authHeaders(),
		});
		rows.push(...(page.results ?? []));
		next = page.next ?? null;
	}

	return rows;
}

async function fetchMembershipSnapshotUncached(): Promise<EasyVereinMembershipSnapshot> {
	const memberPath = `/member?${new URLSearchParams({
		limit: "100",
		query: MEMBER_STATUS_QUERY,
	}).toString()}`;
	const wastePath = `/wastebasket/member?${new URLSearchParams({
		limit: "100",
		query: "{id}",
	}).toString()}`;

	const [members, waste] = await Promise.all([
		paginateIds(memberPath),
		paginateIds(wastePath).catch((err) => {
			console.warn("[easyverein] wastebasket list failed", err);
			return [] as { id: number }[];
		}),
	]);

	const byId = new Map<number, { resignationDate: string | null }>();
	for (const entry of members) {
		if (typeof entry.id !== "number") continue;
		const raw = entry.resignation_date?.trim() || null;
		byId.set(entry.id, {
			resignationDate:
				raw && /^\d{4}-\d{2}-\d{2}/.test(raw) ? raw.slice(0, 10) : null,
		});
	}

	const wastebasketIds = new Set<number>();
	for (const entry of waste) {
		if (typeof entry.id === "number") wastebasketIds.add(entry.id);
	}

	return { byId, wastebasketIds };
}

/**
 * Cached snapshot of EasyVerein member ids + resignation dates (+ wastebasket).
 * Used by offboarding reconciliation (read-only).
 */
export async function getEasyVereinMembershipSnapshot(): Promise<EasyVereinMembershipSnapshot> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const now = Date.now();
	if (
		membershipSnapshotCache.value &&
		membershipSnapshotCache.expiresAt > now
	) {
		return membershipSnapshotCache.value;
	}
	if (membershipSnapshotCache.inflight) {
		return membershipSnapshotCache.inflight;
	}

	membershipSnapshotCache.inflight = (async () => {
		const value = await fetchMembershipSnapshotUncached();
		membershipSnapshotCache.value = value;
		membershipSnapshotCache.expiresAt = Date.now() + MEMBERSHIP_SNAPSHOT_TTL_MS;
		return value;
	})().finally(() => {
		membershipSnapshotCache.inflight = null;
	});

	return membershipSnapshotCache.inflight;
}

export function invalidateEasyVereinMembershipSnapshot(): void {
	membershipSnapshotCache = {
		expiresAt: 0,
		value: null,
		inflight: null,
	};
}

function compareIsoDate(a: string, b: string): number {
	return a.localeCompare(b);
}

/**
 * Classify a linked EasyVerein member id against a membership snapshot.
 */
export function classifyEasyVereinMemberStatus(
	memberId: number,
	snapshot: EasyVereinMembershipSnapshot,
	today = todayIsoDate(),
): EasyVereinMemberStatus {
	if (snapshot.wastebasketIds.has(memberId)) {
		const known = snapshot.byId.get(memberId);
		return {
			state: "left",
			resignationDate: known?.resignationDate ?? null,
		};
	}

	const entry = snapshot.byId.get(memberId);
	if (!entry) {
		return { state: "missing" };
	}

	const resignationDate = entry.resignationDate;
	if (!resignationDate) {
		return { state: "active" };
	}
	if (compareIsoDate(resignationDate, today) > 0) {
		return { state: "leaving", resignationDate };
	}
	return { state: "left", resignationDate };
}
