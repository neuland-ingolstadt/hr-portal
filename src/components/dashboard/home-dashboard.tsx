import { Await, Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	ClipboardList,
	FileCheck2,
	UserMinus,
	Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import type { SessionUser } from "#/lib/auth";
import { primaryRole, roleBadgeVariant } from "#/lib/auth";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

export type DashboardStats = {
	memberCount: number | null;
	groupCount: number | null;
	source: "authentik" | "mock" | "unavailable";
};

type HomeDashboardProps = {
	user: SessionUser;
	statsPromise: Promise<DashboardStats>;
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatStat(value: number | null): string {
	if (value == null) return "—";
	return new Intl.NumberFormat("de-DE").format(value);
}

function StatCard({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="surface-panel surface-panel--interactive relative overflow-hidden p-5 [animation:none]">
			<span
				aria-hidden
				className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent"
			/>
			<p className="text-xs font-medium tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-3 font-mono text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
				{value}
			</p>
			{hint ? (
				<p className="mt-2 text-xs text-muted-foreground">{hint}</p>
			) : null}
		</div>
	);
}

function ActionCard({
	to,
	icon,
	title,
	description,
	cta,
	delay,
}: {
	to: string;
	icon: ReactNode;
	title: string;
	description: string;
	cta: string;
	delay: string;
}) {
	return (
		<Link
			to={to}
			className="surface-panel surface-panel--interactive group relative flex h-full flex-col gap-4 p-5 no-underline"
			style={{ animationDelay: delay }}
		>
			<div className="flex items-start justify-between gap-3">
				<span className="flex size-10 items-center justify-center border border-border bg-muted text-foreground transition-colors group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary">
					{icon}
				</span>
				<ArrowUpRight
					className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
					aria-hidden
				/>
			</div>
			<div className="space-y-1.5">
				<h2 className="text-base font-semibold tracking-tight">{title}</h2>
				<p className="text-sm leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
			<span className="mt-auto text-sm font-medium text-primary">{cta}</span>
		</Link>
	);
}

function PlaceholderCard({
	to,
	icon,
	title,
	description,
	delay,
}: {
	to: string;
	icon: ReactNode;
	title: string;
	description: string;
	delay: string;
}) {
	const { t } = useI18n();
	return (
		<Link
			to={to}
			className="surface-panel surface-panel--interactive relative flex h-full flex-col gap-4 p-5 no-underline opacity-[0.96]"
			style={{ animationDelay: delay }}
		>
			<div className="flex items-start justify-between gap-3">
				<span className="flex size-10 items-center justify-center border border-dashed border-border bg-muted/50 text-muted-foreground">
					{icon}
				</span>
				<span className="border border-border bg-muted px-2 py-0.5 font-mono text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
					{t("home.soon")}
				</span>
			</div>
			<div className="space-y-1.5">
				<h2 className="text-base font-semibold tracking-tight text-foreground/90">
					{title}
				</h2>
				<p className="text-sm leading-relaxed text-muted-foreground">
					{description}
				</p>
			</div>
			<div className="mt-auto space-y-2 pt-1" aria-hidden>
				<div className="h-2 w-3/4 bg-muted" />
				<div className="h-2 w-1/2 bg-muted/70" />
			</div>
		</Link>
	);
}

function StatsSkeleton({ roleLabel }: { roleLabel: string }) {
	const { t } = useI18n();
	return (
		<section className="grid gap-4 sm:grid-cols-3" aria-busy="true">
			<StatCard
				label={t("home.statMembers")}
				value="…"
				hint={t("home.statMembersHint")}
			/>
			<StatCard
				label={t("home.statGroups")}
				value="…"
				hint={t("home.statGroupsHint")}
			/>
			<StatCard
				label={t("home.statAccess")}
				value={roleLabel}
				hint={t("home.statAccessHint")}
			/>
		</section>
	);
}

function StatsGrid({
	stats,
	role,
}: {
	stats: DashboardStats;
	role: ReturnType<typeof primaryRole>;
}) {
	const { t } = useI18n();
	return (
		<section className="grid gap-4 sm:grid-cols-3">
			<StatCard
				label={t("home.statMembers")}
				value={formatStat(stats.memberCount)}
				hint={
					stats.source === "mock"
						? t("home.statMock")
						: stats.source === "unavailable"
							? t("home.statUnavailable")
							: t("home.statMembersHint")
				}
			/>
			<StatCard
				label={t("home.statGroups")}
				value={formatStat(stats.groupCount)}
				hint={
					stats.source === "unavailable"
						? t("home.statUnavailable")
						: t("home.statGroupsHint")
				}
			/>
			<StatCard
				label={t("home.statAccess")}
				value={
					role === "admin"
						? t("role.admin")
						: role === "vorstand"
							? t("role.vorstand")
							: role === "hr"
								? t("role.hr")
								: t("home.empty")
				}
				hint={t("home.statAccessHint")}
			/>
		</section>
	);
}

export function HomeDashboard({ user, statsPromise }: HomeDashboardProps) {
	const { t } = useI18n();
	const role = primaryRole(user.roles);
	const firstName = user.name.trim().split(/\s+/)[0] || user.name;
	const accessLabel =
		role === "admin"
			? t("role.admin")
			: role === "vorstand"
				? t("role.vorstand")
				: role === "hr"
					? t("role.hr")
					: t("home.empty");

	return (
		<div className="flex w-full min-w-0 flex-col gap-6 sm:gap-8">
			<section
				className="surface-panel relative overflow-hidden"
				style={{ animationDelay: "0ms" }}
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,color-mix(in_oklab,hsl(var(--primary))_14%,transparent),transparent_55%)]"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-primary"
				/>
				<div className="relative flex flex-col gap-6 p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0 space-y-3">
						<p className="eyebrow mb-0">{t("home.eyebrow")}</p>
						<h1 className="page-title text-balance">
							{t("home.hello", { name: firstName })}
						</h1>
						<p className="page-lead max-w-xl">{t("home.lead")}</p>
						<div className="flex flex-wrap items-center gap-2 pt-1">
							{role ? (
								<Badge variant={roleBadgeVariant(role)}>
									{role === "admin"
										? t("role.admin")
										: role === "vorstand"
											? t("role.vorstand")
											: t("role.hr")}
								</Badge>
							) : null}
							<span className="text-xs text-muted-foreground">
								{t("home.signedInAs", { email: user.email || user.name })}
							</span>
						</div>
					</div>
					<div className="flex shrink-0 flex-wrap gap-2">
						<Button asChild size="lg">
							<Link to={ROUTES.MITGLIEDER}>
								<Users />
								{t("home.openMembers")}
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<Await
				promise={statsPromise}
				fallback={<StatsSkeleton roleLabel={accessLabel} />}
			>
				{(stats) => <StatsGrid stats={stats} role={role} />}
			</Await>

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)]">
				<div className="grid gap-4 sm:grid-cols-2">
					<ActionCard
						to={ROUTES.MITGLIEDER}
						icon={<Users className="size-5" aria-hidden />}
						title={t("home.actionMembersTitle")}
						description={t("home.actionMembersDesc")}
						cta={t("home.openMembers")}
						delay="200ms"
					/>
					<PlaceholderCard
						to={ROUTES.BEWERBUNGEN}
						icon={<FileCheck2 className="size-5" aria-hidden />}
						title={t("home.moduleApplicationsTitle")}
						description={t("home.moduleApplicationsDesc")}
						delay="240ms"
					/>
					<PlaceholderCard
						to={ROUTES.ONBOARDING}
						icon={<ClipboardList className="size-5" aria-hidden />}
						title={t("home.moduleOnboardingTitle")}
						description={t("home.moduleOnboardingDesc")}
						delay="280ms"
					/>
					<PlaceholderCard
						to={ROUTES.OFFBOARDING}
						icon={<UserMinus className="size-5" aria-hidden />}
						title={t("home.moduleOffboardingTitle")}
						description={t("home.moduleOffboardingDesc")}
						delay="320ms"
					/>
				</div>

				<aside
					className="surface-panel flex flex-col gap-5 p-5 sm:p-6"
					style={{ animationDelay: "220ms" }}
				>
					<div className="flex items-center gap-3">
						<span
							aria-hidden
							className="flex size-12 shrink-0 items-center justify-center border border-border bg-muted font-mono text-sm font-semibold tracking-wide"
						>
							{initials(user.name)}
						</span>
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold">{user.name}</p>
							<p className="truncate text-xs text-muted-foreground">
								{user.email || t("home.empty")}
							</p>
						</div>
					</div>

					<div className="grid gap-3 border-t border-border pt-4">
						<div className="grid gap-1">
							<span className="meta-label">{t("home.name")}</span>
							<span className="meta-value text-sm">{user.name}</span>
						</div>
						<div className="grid gap-1">
							<span className="meta-label">{t("home.email")}</span>
							<span className="meta-value truncate text-sm">
								{user.email || t("home.empty")}
							</span>
						</div>
						<div className="grid gap-1">
							<span className="meta-label">{t("home.role")}</span>
							{role ? (
								<Badge variant={roleBadgeVariant(role)} className="w-fit">
									{role === "admin"
										? t("role.admin")
										: role === "vorstand"
											? t("role.vorstand")
											: t("role.hr")}
								</Badge>
							) : (
								<span className="meta-value text-sm">{t("home.empty")}</span>
							)}
						</div>
					</div>

					<p
						className={cn(
							"mt-auto text-xs leading-relaxed text-muted-foreground",
						)}
					>
						{t("home.profileHint")}
					</p>
				</aside>
			</section>
		</div>
	);
}
