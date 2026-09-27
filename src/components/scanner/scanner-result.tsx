import { Link } from "@tanstack/react-router";
import { CheckCircle2, Link2, ShieldX, User } from "lucide-react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import {
	type LookupMemberResult,
	QRType,
	type VerificationResult,
} from "#/lib/member-id/types";
import { cn } from "#/lib/utils";

type ScannerResultProps = {
	result: VerificationResult | null;
	lookup: LookupMemberResult | null;
	lookupLoading: boolean;
	onClear: () => void;
};

function formatTimestamp(seconds: number, locale: string): string {
	const tag = locale === "de" ? "de-DE" : "en-US";
	return new Date(seconds * 1000).toLocaleString(tag, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function qrTypeKey(type: QRType): MessageKey {
	switch (type) {
		case QRType.APP:
			return "scanner.typeApp";
		case QRType.APPLE_WALLET:
			return "scanner.typeApple";
		case QRType.ANDROID_WALLET:
			return "scanner.typeAndroid";
		default:
			return "scanner.typeApp";
	}
}

function verifyErrorMessage(
	t: (key: MessageKey) => string,
	error?: string,
): string {
	if (!error) return "";
	if (error === "public_key_unavailable")
		return t("scanner.publicKeyUnavailable");
	if (error === "invalid_signature") return t("scanner.errorInvalidSignature");
	if (error === "expired") return t("scanner.errorExpired");
	return error;
}

function groupBadgeVariant(group: string) {
	const key = group.toLowerCase();
	if (key === "vorstand" || key === "admin") return "vorstand" as const;
	if (key === "hr") return "hr" as const;
	return "muted" as const;
}

export function ScannerResult({
	result,
	lookup,
	lookupLoading,
	onClear,
}: ScannerResultProps) {
	const { t, locale } = useI18n();

	if (!result) {
		return (
			<div className="surface-panel p-5 sm:p-6">
				<div className="flex items-start gap-3">
					<div className="border border-border bg-muted p-2 text-muted-foreground">
						<User className="size-5" aria-hidden />
					</div>
					<div className="min-w-0 space-y-1">
						<h2 className="text-base font-semibold tracking-tight">
							{t("scanner.awaitingTitle")}
						</h2>
						<p className="text-sm text-muted-foreground">
							{t("scanner.awaitingLead")}
						</p>
						<p className="text-xs text-muted-foreground">
							{t("scanner.awaitingHint")}
						</p>
					</div>
				</div>
			</div>
		);
	}

	const success = result.success;

	return (
		<div
			className={cn(
				"surface-panel space-y-5 p-5 sm:p-6",
				success ? "border-primary/30" : "border-destructive/40",
			)}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex min-w-0 items-start gap-3">
					<div
						className={cn(
							"border p-2",
							success
								? "border-primary/40 bg-primary/10 text-primary"
								: "border-destructive/40 bg-destructive/10 text-destructive",
						)}
					>
						{success ? (
							<CheckCircle2 className="size-5" aria-hidden />
						) : (
							<ShieldX className="size-5" aria-hidden />
						)}
					</div>
					<div className="min-w-0 space-y-1">
						<h2 className="text-base font-semibold tracking-tight">
							{success ? t("scanner.resultValid") : t("scanner.resultInvalid")}
						</h2>
						<p className="text-sm text-muted-foreground">
							{success
								? t("scanner.resultValidLead")
								: verifyErrorMessage(t, result.error)}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<Badge variant={success ? "default" : "destructive"}>
						{success ? t("scanner.badgeValid") : t("scanner.badgeInvalid")}
					</Badge>
					<Button type="button" variant="outline" size="sm" onClick={onClear}>
						{t("scanner.clearResult")}
					</Button>
				</div>
			</div>

			{result.payload ? (
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label={t("scanner.fieldName")} value={result.payload.name} />
					<Field
						label={t("scanner.fieldSub")}
						value={result.payload.sub}
						mono
					/>
					<Field
						label={t("scanner.fieldIssued")}
						value={formatTimestamp(result.payload.iat, locale)}
					/>
					<Field
						label={t("scanner.fieldExpires")}
						value={formatTimestamp(result.payload.exp, locale)}
					/>
					<Field
						label={t("scanner.fieldType")}
						value={t(qrTypeKey(result.payload.type))}
					/>
				</div>
			) : null}

			{success && result.payload ? (
				<section className="space-y-3 border-t border-border pt-4">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<h3 className="text-sm font-semibold tracking-tight">
							{t("scanner.enrichTitle")}
						</h3>
						<Button variant="outline" size="sm" asChild>
							<Link to={ROUTES.MITGLIEDER}>
								<Link2 />
								{t("scanner.openMembers")}
							</Link>
						</Button>
					</div>

					{lookupLoading ? (
						<p className="text-sm text-muted-foreground">
							{t("scanner.enrichLoading")}
						</p>
					) : null}

					{!lookupLoading && lookup?.status === "found" ? (
						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-base font-semibold">{lookup.member.name}</p>
								<Badge
									variant={lookup.member.isActive ? "default" : "destructive"}
								>
									{lookup.member.isActive
										? t("scanner.enrichActive")
										: t("scanner.enrichInactive")}
								</Badge>
								<Badge variant={lookup.member.isMitglied ? "hr" : "muted"}>
									{lookup.member.isMitglied
										? t("scanner.enrichMember")
										: t("scanner.enrichNotMember")}
								</Badge>
							</div>
							<div className="space-y-2">
								<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{t("scanner.enrichGroups")}
								</p>
								{lookup.member.groups.length === 0 ? (
									<p className="text-sm text-muted-foreground">
										{t("scanner.enrichNoGroups")}
									</p>
								) : (
									<div className="flex flex-wrap gap-1.5">
										{lookup.member.groups.map((group) => (
											<Badge key={group} variant={groupBadgeVariant(group)}>
												{group}
											</Badge>
										))}
									</div>
								)}
							</div>
						</div>
					) : null}

					{!lookupLoading && lookup?.status === "not_found" ? (
						<p className="text-sm text-muted-foreground">
							{t("scanner.enrichMissing")}
						</p>
					) : null}

					{!lookupLoading && lookup?.status === "error" ? (
						<p className="text-sm text-destructive" role="alert">
							{lookup.error === "authentik_api_missing"
								? t("scanner.enrichErrorApi")
								: t("scanner.enrichError")}
						</p>
					) : null}
				</section>
			) : null}
		</div>
	);
}

function Field({
	label,
	value,
	mono,
}: {
	label: string;
	value: string;
	mono?: boolean;
}) {
	return (
		<div className="space-y-1">
			<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{label}
			</p>
			<p
				className={cn(
					"break-all text-sm text-foreground",
					mono && "font-mono text-xs text-muted-foreground",
				)}
			>
				{value}
			</p>
		</div>
	);
}
