/**
 * Inspect EasyVerein billing / payment status for members by email.
 *
 * Neuland tracks "paid for year" via the custom field **Letzter Mitgliedsbeitrag**
 * (date). SEPA mandate + IBAN live on contact details. EV balance/invoices are
 * unused here (and `/booking` is forbidden for this API token).
 *
 * Usage:
 *   bun run scripts/check-easyverein-billing.ts
 *   bun run scripts/check-easyverein-billing.ts alice@example.com bob@example.com
 *   bun run scripts/check-easyverein-billing.ts --overdue
 *   bun run scripts/check-easyverein-billing.ts --year 2025
 *
 * Requires: EASYVEREIN_API_TOKEN
 * Optional: EASYVEREIN_API_BASE (default https://easyverein.com/api/v3.0)
 * (Bun loads `.env` / `.env.local` automatically.)
 */

const DEFAULT_EMAILS = ["robert.eggl@icloud.com", "dah4601@thi.de"];

/** Custom field: date of last membership-fee payment. */
const LAST_FEE_FIELD_ID = 207476292;
/** Custom field: honorary member (exempt from fee checks). */
const HONORARY_FIELD_ID = 83398813;

const MEMBER_QUERY = [
	"{id,email,email_or_user_name,name_for_sorting,membership_number,",
	"join_date,resignation_date,is_application,is_blocked,block_reason,",
	"payment_amount,payment_intervall_months,payment_start_date,",
	"use_balance_for_membership_fee,",
	"contact_details{id,name,first_name,family_name,primary_email,",
	"private_email,company_email,balance,iban,bic,bank_account_owner,",
	"sepa_mandate,sepa_date,method_of_payment,method_of_payment_name},",
	"custom_fields{id,value,custom_field{id,name},selected_options{id,value}}}",
].join("");

type EvContact = {
	id?: number;
	name?: string | null;
	first_name?: string | null;
	family_name?: string | null;
	primary_email?: string | null;
	private_email?: string | null;
	company_email?: string | null;
	balance?: string | number | null;
	iban?: string | null;
	bic?: string | null;
	bank_account_owner?: string | null;
	sepa_mandate?: string | null;
	sepa_date?: string | null;
	method_of_payment?: number | null;
	method_of_payment_name?: string | null;
};

type EvCustomField = {
	id?: number;
	value?: string | null;
	custom_field?: { id?: number; name?: string | null } | string | null;
	selected_options?: { id?: number; value?: string | null }[];
};

type EvMember = {
	id: number;
	email?: string | null;
	email_or_user_name?: string | null;
	name_for_sorting?: string | null;
	membership_number?: string | null;
	join_date?: string | null;
	resignation_date?: string | null;
	is_application?: boolean;
	is_blocked?: boolean;
	block_reason?: string | null;
	payment_amount?: number | null;
	payment_intervall_months?: number | null;
	payment_start_date?: string | null;
	use_balance_for_membership_fee?: boolean;
	contact_details?: EvContact | string | null;
	custom_fields?: EvCustomField[] | string[];
};

type EvPage<T> = {
	next?: string | null;
	results?: T[];
};

type PaymentStatus =
	| "paid"
	| "overdue"
	| "exempt_honorary"
	| "application"
	| "left"
	| "unknown";

type MemberBillingReport = {
	emailQuery: string;
	found: boolean;
	memberId?: number;
	membershipNumber?: string | null;
	displayName?: string;
	emails?: string[];
	joinDate?: string | null;
	resignationDate?: string | null;
	isApplication?: boolean;
	isBlocked?: boolean;
	statusSelect?: string | null;
	honorary?: boolean;
	lastFeeDate?: string | null;
	lastFeeYear?: number | null;
	feeYearChecked?: number;
	sepaMandate?: string | null;
	sepaDate?: string | null;
	iban?: string | null;
	methodOfPayment?: string | null;
	balance?: string;
	paymentAmount?: number | null;
	paymentIntervalMonths?: number | null;
	paymentStatus?: PaymentStatus;
	notes?: string[];
};

function parseArgs(argv: string[]) {
	const emails: string[] = [];
	let overdue = false;
	let year = new Date().getFullYear();
	let help = false;

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i]!;
		if (arg === "--help" || arg === "-h") help = true;
		else if (arg === "--overdue") overdue = true;
		else if (arg === "--year") {
			const raw = argv[++i];
			const parsed = Number(raw);
			if (!Number.isInteger(parsed) || parsed < 2000) {
				throw new Error(`Invalid --year ${raw}`);
			}
			year = parsed;
		} else if (arg.startsWith("-")) {
			throw new Error(`Unknown flag: ${arg}`);
		} else {
			emails.push(arg.trim().toLowerCase());
		}
	}

	return {
		emails: emails.length > 0 ? emails : DEFAULT_EMAILS,
		overdue,
		year,
		help,
	};
}

function apiBase(): string {
	return (
		process.env.EASYVEREIN_API_BASE?.replace(/\/$/, "") ||
		"https://easyverein.com/api/v3.0"
	);
}

function apiToken(): string {
	const token = process.env.EASYVEREIN_API_TOKEN?.trim();
	if (!token) {
		throw new Error("Missing EASYVEREIN_API_TOKEN");
	}
	return token;
}

async function evFetch<T>(path: string): Promise<T> {
	const url = path.startsWith("http") ? path : `${apiBase()}${path}`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${apiToken()}`,
			Accept: "application/json",
		},
	});
	if (!res.ok) {
		const detail = await res.text().catch(() => "");
		throw new Error(
			`EasyVerein GET ${path} → ${res.status}: ${detail.slice(0, 300)}`,
		);
	}
	return (await res.json()) as T;
}

function contactOf(member: EvMember): EvContact | null {
	return member.contact_details && typeof member.contact_details === "object"
		? member.contact_details
		: null;
}

function customFieldsOf(member: EvMember): EvCustomField[] {
	if (!Array.isArray(member.custom_fields)) return [];
	return member.custom_fields.filter(
		(cf): cf is EvCustomField => typeof cf === "object" && cf !== null,
	);
}

function customFieldId(cf: EvCustomField): number | null {
	if (cf.custom_field && typeof cf.custom_field === "object") {
		return typeof cf.custom_field.id === "number" ? cf.custom_field.id : null;
	}
	if (typeof cf.custom_field === "string") {
		const m = cf.custom_field.match(/\/custom-field\/(\d+)/);
		return m ? Number(m[1]) : null;
	}
	return null;
}

function findCustomField(
	member: EvMember,
	fieldId: number,
): EvCustomField | null {
	return customFieldsOf(member).find((cf) => customFieldId(cf) === fieldId) ?? null;
}

function truthyCustom(value: string | null | undefined): boolean {
	const v = value?.trim().toLowerCase();
	return v === "true" || v === "1" || v === "yes" || v === "ja";
}

function yearFromIsoDate(value: string | null | undefined): number | null {
	if (!value) return null;
	const m = value.trim().match(/^(\d{4})-\d{2}-\d{2}/);
	return m ? Number(m[1]) : null;
}

function maskIban(iban: string | null | undefined): string | null {
	const cleaned = iban?.replace(/\s+/g, "").trim() ?? "";
	if (!cleaned) return null;
	if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}…`;
	return `${cleaned.slice(0, 4)} … ${cleaned.slice(-4)}`;
}

function memberEmails(member: EvMember): string[] {
	const c = contactOf(member);
	return [
		member.email,
		member.email_or_user_name,
		c?.primary_email,
		c?.private_email,
		c?.company_email,
	]
		.map((e) => e?.trim().toLowerCase() ?? "")
		.filter(Boolean)
		.filter((e, i, arr) => arr.indexOf(e) === i);
}

function classify(
	member: EvMember,
	feeYear: number,
): Pick<
	MemberBillingReport,
	| "honorary"
	| "lastFeeDate"
	| "lastFeeYear"
	| "paymentStatus"
	| "statusSelect"
	| "notes"
> {
	const notes: string[] = [];
	const honorary = truthyCustom(findCustomField(member, HONORARY_FIELD_ID)?.value);
	const feeField = findCustomField(member, LAST_FEE_FIELD_ID);
	const lastFeeDate = feeField?.value?.trim() || null;
	const lastFeeYear = yearFromIsoDate(lastFeeDate);
	const statusSelect =
		findCustomField(member, 81911051)?.selected_options?.[0]?.value?.trim() ||
		null;

	if (member.is_application) {
		return {
			honorary,
			lastFeeDate,
			lastFeeYear,
			statusSelect,
			paymentStatus: "application",
			notes,
		};
	}

	const resignation = member.resignation_date?.trim() || null;
	if (resignation && resignation.slice(0, 10) <= new Date().toISOString().slice(0, 10)) {
		return {
			honorary,
			lastFeeDate,
			lastFeeYear,
			statusSelect,
			paymentStatus: "left",
			notes,
		};
	}

	if (honorary) {
		notes.push("Ehrenmitglied — fee check skipped");
		return {
			honorary,
			lastFeeDate,
			lastFeeYear,
			statusSelect,
			paymentStatus: "exempt_honorary",
			notes,
		};
	}

	if (lastFeeYear === feeYear) {
		return {
			honorary,
			lastFeeDate,
			lastFeeYear,
			statusSelect,
			paymentStatus: "paid",
			notes,
		};
	}

	if (!lastFeeDate) {
		notes.push("custom field „Letzter Mitgliedsbeitrag“ not set");
	} else {
		notes.push(`last fee year ${lastFeeYear} ≠ ${feeYear}`);
	}

	return {
		honorary,
		lastFeeDate,
		lastFeeYear,
		statusSelect,
		paymentStatus: "overdue",
		notes,
	};
}

function toReport(
	emailQuery: string,
	member: EvMember | null,
	feeYear: number,
): MemberBillingReport {
	if (!member) {
		return { emailQuery, found: false, feeYearChecked: feeYear };
	}

	const c = contactOf(member);
	const classified = classify(member, feeYear);
	const balance =
		c?.balance == null || c.balance === "" ? "0.00" : String(c.balance);

	return {
		emailQuery,
		found: true,
		memberId: member.id,
		membershipNumber: member.membership_number ?? null,
		displayName:
			c?.name?.trim() ||
			member.name_for_sorting?.trim() ||
			member.email?.trim() ||
			`#${member.id}`,
		emails: memberEmails(member),
		joinDate: member.join_date ?? null,
		resignationDate: member.resignation_date ?? null,
		isApplication: Boolean(member.is_application),
		isBlocked: Boolean(member.is_blocked),
		...classified,
		feeYearChecked: feeYear,
		sepaMandate: c?.sepa_mandate?.trim() || null,
		sepaDate: c?.sepa_date?.trim() || null,
		iban: maskIban(c?.iban),
		methodOfPayment: c?.method_of_payment_name?.trim() || null,
		balance,
		paymentAmount: member.payment_amount ?? null,
		paymentIntervalMonths: member.payment_intervall_months ?? null,
	};
}

async function findMemberByEmail(email: string): Promise<EvMember | null> {
	const page = await evFetch<EvPage<EvMember>>(
		`/member?${new URLSearchParams({
			limit: "20",
			email,
			query: MEMBER_QUERY,
		}).toString()}`,
	);
	const needle = email.trim().toLowerCase();
	const exact =
		(page.results ?? []).find((m) => memberEmails(m).includes(needle)) ?? null;
	if (exact) return exact;
	// `email=` sometimes returns unrelated first pages — fall back to search.
	const searched = await evFetch<EvPage<EvMember>>(
		`/member?${new URLSearchParams({
			limit: "20",
			search: email,
			query: MEMBER_QUERY,
		}).toString()}`,
	);
	return (
		(searched.results ?? []).find((m) => memberEmails(m).includes(needle)) ??
		null
	);
}

async function listAcceptedMembers(): Promise<EvMember[]> {
	const members: EvMember[] = [];
	let next: string | null = `/member?${new URLSearchParams({
		limit: "100",
		is_application: "false",
		query: MEMBER_QUERY,
	}).toString()}`;

	while (next) {
		const page = await evFetch<EvPage<EvMember>>(next);
		members.push(...(page.results ?? []).filter((m) => !m.is_application));
		next = page.next ?? null;
	}
	return members;
}

function printReport(report: MemberBillingReport) {
	if (!report.found) {
		console.log(`\n✘ ${report.emailQuery}`);
		console.log("  not found in EasyVerein");
		return;
	}

	const icon =
		report.paymentStatus === "paid" || report.paymentStatus === "exempt_honorary"
			? "✔"
			: report.paymentStatus === "overdue"
				? "✘"
				: "·";

	console.log(`\n${icon} ${report.displayName} <${report.emailQuery}>`);
	console.log(`  member #${report.memberId} / Nr. ${report.membershipNumber ?? "—"}`);
	console.log(`  status:          ${report.paymentStatus} (fee year ${report.feeYearChecked})`);
	console.log(`  last fee:        ${report.lastFeeDate ?? "—"}`);
	console.log(
		`  SEPA:            ${report.sepaMandate ? `${report.sepaMandate} (${report.sepaDate ?? "no date"})` : "—"}`,
	);
	console.log(`  IBAN:            ${report.iban ?? "—"}`);
	console.log(`  payment method:  ${report.methodOfPayment ?? "—"}`);
	console.log(`  balance:         ${report.balance}`);
	console.log(`  student status:  ${report.statusSelect ?? "—"}`);
	console.log(`  honorary:        ${report.honorary ? "yes" : "no"}`);
	console.log(`  join:            ${report.joinDate ?? "—"}`);
	if (report.isBlocked) {
		console.log("  blocked:         yes");
	}
	for (const note of report.notes ?? []) {
		console.log(`  note:            ${note}`);
	}
}

function printHelp() {
	console.log(`Usage:
  bun run scripts/check-easyverein-billing.ts [emails...]
  bun run scripts/check-easyverein-billing.ts --overdue [--year YYYY]
  bun run scripts/check-easyverein-billing.ts --year 2025 alice@x.com

Default emails: ${DEFAULT_EMAILS.join(", ")}

Env: EASYVEREIN_API_TOKEN (required), EASYVEREIN_API_BASE (optional)

Payment rule: custom field „Letzter Mitgliedsbeitrag“ year must match --year
(default: current calendar year). Ehrenmitglied is exempt. SEPA/IBAN are shown
but do not alone mark someone as paid.`);
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		return;
	}

	apiToken();

	console.log(`EasyVerein billing check (fee year ${args.year})`);
	console.log(`API: ${apiBase()}`);
	console.log(
		"Source of truth: custom field „Letzter Mitgliedsbeitrag“ + SEPA on contact details",
	);

	if (args.overdue) {
		const members = await listAcceptedMembers();
		const reports = members
			.map((m) => toReport(memberEmails(m)[0] ?? `#${m.id}`, m, args.year))
			.filter((r) => r.paymentStatus === "overdue");

		const withSepa = reports.filter((r) => r.sepaMandate).length;
		console.log(
			`\nOverdue (not paid for ${args.year}, not honorary): ${reports.length} / ${members.length} accepted members (${withSepa} with SEPA mandate)`,
		);
		for (const report of reports) printReport(report);
		return;
	}

	for (const email of args.emails) {
		const member = await findMemberByEmail(email);
		printReport(toReport(email, member, args.year));
	}
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
});
