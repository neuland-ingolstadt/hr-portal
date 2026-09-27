import { CheckCircle2, CircleDashed } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Badge } from "#/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import {
	groupBadgeVariant,
	partitionGroups,
	ressortLabelKey,
} from "#/lib/groups";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MemberProfile, MemberProfileResult } from "#/lib/members";
import { getMemberProfileFn } from "#/lib/members.functions";
import { cn } from "#/lib/utils";

type MemberProfileSheetProps = {
	memberId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function GitHubGlyph({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="currentColor"
			aria-hidden
		>
			<title>GitHub</title>
			<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
		</svg>
	);
}

function DiscordGlyph({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			className={className}
			fill="currentColor"
			aria-hidden
		>
			<title>Discord</title>
			<path d="M20.317 4.37a19.8 19.8 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.3 18.3 0 0 0-5.487 0 12.6 12.6 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.7 19.7 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.373-.292a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .079.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.8 19.8 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03M8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418m7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418" />
		</svg>
	);
}

export function MemberProfileSheet({
	memberId,
	open,
	onOpenChange,
}: MemberProfileSheetProps) {
	const { t } = useI18n();
	const [result, setResult] = useState<MemberProfileResult | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (!open || !memberId) {
			setResult(null);
			setLoading(false);
			return;
		}

		let cancelled = false;
		setLoading(true);
		setResult(null);

		void getMemberProfileFn({ data: { id: memberId } })
			.then((next) => {
				if (!cancelled) setResult(next);
			})
			.catch((err) => {
				console.error("[members] profile load failed", err);
				if (!cancelled) {
					setResult({ status: "error", error: "lookup_failed" });
				}
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [open, memberId]);

	const profile = result?.status === "found" ? result.profile : null;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				overlayClassName="bg-transparent duration-150"
				className="w-full gap-0 overflow-y-auto p-0 shadow-none duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] sm:max-w-md"
			>
				<SheetHeader className="border-b border-border px-5 py-5 pr-14">
					<SheetTitle className="font-sans text-base tracking-tight">
						{t("profile.title")}
					</SheetTitle>
					<SheetDescription>{t("profile.lead")}</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6 px-5 py-5">
					{loading ? (
						<p className="text-sm text-muted-foreground">
							{t("profile.loading")}
						</p>
					) : null}

					{!loading && result?.status === "not_found" ? (
						<p className="text-sm text-muted-foreground">
							{t("profile.notFound")}
						</p>
					) : null}

					{!loading && result?.status === "error" ? (
						<p className="text-sm text-destructive" role="alert">
							{result.error === "authentik_api_missing"
								? t("profile.errorApi")
								: t("profile.error")}
						</p>
					) : null}

					{!loading && profile ? <ProfileBody profile={profile} /> : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function ProfileBody({ profile }: { profile: MemberProfile }) {
	const { t } = useI18n();
	const { ressorts, other } = partitionGroups(profile.groups);

	return (
		<>
			<div className="flex items-center gap-3">
				<span
					aria-hidden
					className="flex size-12 shrink-0 items-center justify-center border border-border bg-muted font-mono text-sm font-semibold tracking-wide text-muted-foreground"
				>
					{initials(profile.name)}
				</span>
				<div className="min-w-0 space-y-0.5">
					<p className="truncate text-lg font-semibold tracking-tight">
						{profile.name}
					</p>
					{profile.username ? (
						<p className="truncate font-mono text-xs text-muted-foreground">
							@{profile.username}
						</p>
					) : null}
				</div>
			</div>

			<dl className="grid gap-4">
				<Field label={t("profile.fieldName")} value={profile.name} />
				<Field
					label={t("profile.fieldUsername")}
					value={profile.username ?? t("profile.empty")}
					mono={Boolean(profile.username)}
				/>
				{profile.email ? (
					<Field label={t("profile.fieldEmail")} value={profile.email} />
				) : null}
			</dl>

			<section className="space-y-3 border-t border-border pt-5">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{t("profile.ressorts")}
				</p>
				{ressorts.length > 0 ? (
					<ul className="flex flex-wrap gap-1.5">
						{ressorts.map((group) => {
							const labelKey = ressortLabelKey(group);
							return (
								<li key={group}>
									<Badge variant="ressort">
										{labelKey ? t(labelKey) : group}
									</Badge>
								</li>
							);
						})}
					</ul>
				) : (
					<p className="text-sm text-muted-foreground">
						{t("profile.noRessorts")}
					</p>
				)}
			</section>

			{other.length > 0 ? (
				<section className="space-y-3 border-t border-border pt-5">
					<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						{t("profile.groups")}
					</p>
					<ul className="flex flex-wrap gap-1.5">
						{other.map((group) => (
							<li key={group}>
								<Badge variant={groupBadgeVariant(group)}>{group}</Badge>
							</li>
						))}
					</ul>
				</section>
			) : null}

			<section className="space-y-3 border-t border-border pt-5">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{t("profile.integrations")}
				</p>
				<ul className="flex flex-col gap-2">
					<IntegrationRow
						icon={<GitHubGlyph className="size-4" />}
						label={t("profile.github")}
						connected={profile.githubConnected}
						connectedLabel={t("profile.connected")}
						missingLabel={t("profile.notConnected")}
					/>
					<IntegrationRow
						icon={<DiscordGlyph className="size-4" />}
						label={t("profile.discord")}
						connected={profile.discordConnected}
						connectedLabel={t("profile.connected")}
						missingLabel={t("profile.notConnected")}
					/>
				</ul>
			</section>
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
			<dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{label}
			</dt>
			<dd
				className={cn(
					"break-all text-sm text-foreground",
					mono && "font-mono text-xs",
				)}
			>
				{value}
			</dd>
		</div>
	);
}

function IntegrationRow({
	icon,
	label,
	connected,
	connectedLabel,
	missingLabel,
}: {
	icon: ReactNode;
	label: string;
	connected: boolean;
	connectedLabel: string;
	missingLabel: string;
}) {
	return (
		<li
			className={cn(
				"flex items-center gap-3 border px-3 py-2.5",
				connected
					? "border-primary/30 bg-primary/5"
					: "border-border bg-muted/30",
			)}
		>
			<span className="text-muted-foreground">{icon}</span>
			<span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
			<span
				className={cn(
					"inline-flex items-center gap-1.5 text-xs font-medium",
					connected ? "text-primary" : "text-muted-foreground",
				)}
			>
				{connected ? (
					<CheckCircle2 className="size-3.5" aria-hidden />
				) : (
					<CircleDashed className="size-3.5" aria-hidden />
				)}
				{connected ? connectedLabel : missingLabel}
			</span>
		</li>
	);
}
