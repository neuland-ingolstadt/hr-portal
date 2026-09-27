import { useCallback, useEffect, useState } from "react";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { OnboardingProgressBar } from "#/components/onboarding/onboarding-progress-bar";
import { useI18n } from "#/lib/i18n/locale-context";
import type { OnboardingStage, RecentOnboardingMember } from "#/lib/onboarding";
import { cn } from "#/lib/utils";

type RecentMembersGridProps = {
	members: RecentOnboardingMember[];
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function formatJoinedDate(iso: string, locale: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(date);
}

export function RecentMembersGrid({ members }: RecentMembersGridProps) {
	const { t, locale } = useI18n();
	const [profileId, setProfileId] = useState<string | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);
	const [stages, setStages] = useState(() => {
		const initial: Record<string, OnboardingStage> = {};
		for (const member of members) {
			initial[member.id] = member.onboardingStage;
		}
		return initial;
	});

	useEffect(() => {
		setStages((current) => {
			const next: Record<string, OnboardingStage> = {};
			for (const member of members) {
				next[member.id] = current[member.id] ?? member.onboardingStage;
			}
			return next;
		});
	}, [members]);

	const openProfile = useCallback((id: string) => {
		setProfileId(id);
		setProfileOpen(true);
	}, []);

	const handleProfileOpenChange = useCallback((open: boolean) => {
		setProfileOpen(open);
		if (!open) setProfileId(null);
	}, []);

	return (
		<>
			<ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{members.map((member) => {
					const stage = stages[member.id] ?? member.onboardingStage;
					return (
						<li key={member.id}>
							<button
								type="button"
								onClick={() => openProfile(member.id)}
								className={cn(
									"surface-panel surface-panel--interactive relative flex w-full flex-col gap-4 overflow-hidden p-4 text-left transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								)}
							>
								<span
									aria-hidden
									className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-primary/40 to-transparent"
								/>
								<div className="flex items-start gap-3">
									<span
										aria-hidden
										className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted font-mono text-xs font-semibold tracking-wide text-foreground"
									>
										{initials(member.name)}
									</span>
									<div className="min-w-0 space-y-1">
										<p className="truncate text-sm font-semibold tracking-tight">
											{member.name}
										</p>
										{member.username ? (
											<p className="truncate font-mono text-xs text-muted-foreground">
												{member.username}
											</p>
										) : null}
									</div>
								</div>
								<div className="mt-auto space-y-2">
									<OnboardingProgressBar stage={stage} compact />
									<p className="text-xs text-muted-foreground">
										{t("onboarding.recent.joined", {
											date: formatJoinedDate(member.dateJoined, locale),
										})}
									</p>
								</div>
							</button>
						</li>
					);
				})}
			</ul>

			<MemberProfileSheet
				memberId={profileId}
				open={profileOpen}
				onOpenChange={handleProfileOpenChange}
				onOnboardingStageChange={(id, stage) => {
					setStages((current) => ({ ...current, [id]: stage }));
				}}
			/>
		</>
	);
}
