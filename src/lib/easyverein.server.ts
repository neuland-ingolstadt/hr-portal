import type { PendingApplication } from "#/lib/applications";
import { serverConfig } from "#/lib/config";

type EasyVereinContactDetails = {
	id?: number;
	name?: string | null;
	first_name?: string | null;
	family_name?: string | null;
	private_email?: string | null;
	primary_email?: string | null;
	company_email?: string | null;
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

let membershipSnapshotCache: {
	expiresAt: number;
	value: EasyVereinMembershipSnapshot | null;
	inflight: Promise<EasyVereinMembershipSnapshot> | null;
} = {
	expiresAt: 0,
	value: null,
	inflight: null,
};

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
	const url = path.startsWith("http") ? path : `${apiBase()}${path}`;
	const response = await fetch(url, init);
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
