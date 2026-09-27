import { CheckCircle2, Info, ShieldX, User } from "lucide-react";
import { useState } from "react";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { partitionGroups, ressortLabelKey } from "#/lib/groups";
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
	isDuplicate?: boolean;
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

export function ScannerResult({
	result,
	lookup,
	lookupLoading,
	isDuplicate = false,
	onClear,
}: ScannerResultProps) {
	const { t, locale } = useI18n();
	const [profileId, setProfileId] = useState<string | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);

	function openProfile(id: string) {
		setProfileId(id);
		setProfileOpen(true);
	}

	function handleProfileOpenChange(open: boolean) {
		setProfileOpen(open);
		if (!open) setProfileId(null);
	}

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
	const duplicate = success && isDuplicate;
	const foundMember =
		!lookupLoading && lookup?.status === "found" ? lookup.member : null;
	const previewRessorts = foundMember
		? partitionGroups(foundMember.groups).ressorts
		: [];

	return (
		<>
			<div
				className={cn(
					"surface-panel space-y-5 p-5 sm:p-6",
					duplicate
						? "border-sky-500/40"
						: success
							? "border-primary/30"
							: "border-destructive/40",
				)}
			>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="flex min-w-0 items-start gap-3">
						<div
							className={cn(
								"border p-2",
								duplicate
									? "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300"
									: success
										? "border-primary/40 bg-primary/10 text-primary"
										: "border-destructive/40 bg-destructive/10 text-destructive",
							)}
						>
							{duplicate ? (
								<Info className="size-5" aria-hidden />
							) : success ? (
								<CheckCircle2 className="size-5" aria-hidden />
							) : (
								<ShieldX className="size-5" aria-hidden />
							)}
						</div>
						<div className="min-w-0 space-y-1">
							<h2
								className={cn(
									"text-base font-semibold tracking-tight",
									duplicate && "text-sky-800 dark:text-sky-300",
								)}
							>
								{duplicate
									? t("scanner.resultDuplicate")
									: success
										? t("scanner.resultValid")
										: t("scanner.resultInvalid")}
							</h2>
							<p
								className={cn(
									"text-sm text-muted-foreground",
									duplicate && "text-sky-700/80 dark:text-sky-300/80",
								)}
							>
								{duplicate
									? t("scanner.resultDuplicateLead")
									: success
										? t("scanner.resultValidLead")
										: verifyErrorMessage(t, result.error)}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						{duplicate ? null : (
							<Badge variant={success ? "default" : "destructive"}>
								{success ? t("scanner.badgeValid") : t("scanner.badgeInvalid")}
							</Badge>
						)}
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
							{foundMember ? (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => openProfile(foundMember.id)}
								>
									<User />
									{t("scanner.openProfile")}
								</Button>
							) : null}
						</div>

						{lookupLoading ? (
							<p className="text-sm text-muted-foreground">
								{t("scanner.enrichLoading")}
							</p>
						) : null}

						{foundMember ? (
							<button
								type="button"
								onClick={() => openProfile(foundMember.id)}
								aria-label={`${t("scanner.openProfile")}: ${foundMember.name}`}
								className="w-full space-y-2.5 border border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<div className="flex flex-wrap items-center gap-2">
									<p className="text-base font-semibold">{foundMember.name}</p>
									<Badge
										variant={foundMember.isActive ? "default" : "destructive"}
									>
										{foundMember.isActive
											? t("scanner.enrichActive")
											: t("scanner.enrichInactive")}
									</Badge>
									<Badge variant={foundMember.isMitglied ? "hr" : "muted"}>
										{foundMember.isMitglied
											? t("scanner.enrichMember")
											: t("scanner.enrichNotMember")}
									</Badge>
								</div>
								{previewRessorts.length > 0 ? (
									<div className="flex flex-wrap gap-1.5">
										{previewRessorts.map((group) => {
											const labelKey = ressortLabelKey(group);
											return (
												<Badge key={group} variant="ressort">
													{labelKey ? t(labelKey) : group}
												</Badge>
											);
										})}
									</div>
								) : (
									<p className="text-sm text-muted-foreground">
										{t("profile.noRessorts")}
									</p>
								)}
							</button>
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

			<MemberProfileSheet
				memberId={profileId}
				open={profileOpen}
				onOpenChange={handleProfileOpenChange}
			/>
		</>
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
