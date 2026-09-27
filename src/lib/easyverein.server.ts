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
	contact_details?: EasyVereinContactDetails | string | null;
};

type EasyVereinPaginated<T> = {
	next?: string | null;
	results?: T[];
};

const MEMBER_LIST_QUERY =
	"{id,email,email_or_user_name,name_for_sorting,is_application,application_date,join_date,contact_details{id,name,first_name,family_name,private_email,primary_email,company_email}}";

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

function mapMember(member: EasyVereinMember): PendingApplication {
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

	return {
		id: member.id,
		firstName,
		lastName,
		email: pickEmail(member),
		displayName,
		applicationDate: member.application_date ?? null,
	};
}

/**
 * Pending membership applications (`is_application=true`).
 * Uses EasyVerein nested `query` to embed contact details in one request.
 */
export async function listPendingApplications(): Promise<PendingApplication[]> {
	if (!isEasyVereinConfigured()) {
		throw new Error("easyverein_api_missing");
	}

	const applications: PendingApplication[] = [];
	let next: string | null = `/member?${new URLSearchParams({
		is_application: "true",
		limit: "100",
		query: MEMBER_LIST_QUERY,
		ordering: "application_date",
	}).toString()}`;

	while (next) {
		const page: EasyVereinPaginated<EasyVereinMember> = await easyVereinFetch<
			EasyVereinPaginated<EasyVereinMember>
		>(next, {
			headers: authHeaders(),
		});
		for (const member of page.results ?? []) {
			if (member.is_application) {
				applications.push(mapMember(member));
			}
		}
		next = page.next ?? null;
	}

	return applications;
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
