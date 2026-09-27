import { useCallback, useEffect, useState } from "react";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { useI18n } from "#/lib/i18n/locale-context";
import type { OnboardingStage, RecentOnboardingMember } from "#/lib/onboarding";
import {
	ONBOARDING_STAGE_LABEL_KEYS,
	ONBOARDING_STAGE_MAX,
	ONBOARDING_STAGES,
} from "#/lib/onboarding";
import { cn } from "#/lib/utils";

type RecentMembersGridProps = {
	members: RecentOnboardingMember[];
};

/** Top glow fill — stage 0 still shows a small segment. */
function stageGlowPct(stage: OnboardingStage): number {
	if (stage <= 0) return 12;
	return Math.round((stage / ONBOARDING_STAGE_MAX) * 100);
}

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

function groupByStage(
	members: RecentOnboardingMember[],
	stages: Record<string, OnboardingStage>,
): { stage: OnboardingStage; members: RecentOnboardingMember[] }[] {
	const byStage = new Map<OnboardingStage, RecentOnboardingMember[]>();
	for (const stage of ONBOARDING_STAGES) {
		byStage.set(stage, []);
	}
	for (const member of members) {
		const stage = stages[member.id] ?? member.onboardingStage;
		byStage.get(stage)?.push(member);
	}
	return ONBOARDING_STAGES.map((stage) => ({
		stage,
		members: byStage.get(stage) ?? [],
	})).filter((section) => section.members.length > 0);
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

	const sections = groupByStage(members, stages);

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
			<div className="space-y-8">
				{sections.map(({ stage, members: sectionMembers }) => (
					<section key={stage} className="min-w-0 space-y-3">
						<div className="flex items-baseline justify-between gap-3">
							<h3 className="text-sm font-semibold tracking-tight text-foreground">
								{t(ONBOARDING_STAGE_LABEL_KEYS[stage])}
							</h3>
							<span className="font-mono text-xs tabular-nums text-muted-foreground">
								{sectionMembers.length}
							</span>
						</div>
						<ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{sectionMembers.map((member) => {
								const memberStage = stages[member.id] ?? member.onboardingStage;
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
												className="absolute inset-x-0 top-0 h-0.5 bg-muted"
											>
												<span
													className="block h-full bg-gradient-to-r from-primary via-primary to-primary/30 transition-[width] duration-300 ease-out"
													style={{
														width: `${stageGlowPct(memberStage)}%`,
													}}
												/>
											</span>
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
											<p className="mt-auto text-xs text-muted-foreground">
												{t("onboarding.recent.joined", {
													date: formatJoinedDate(member.dateJoined, locale),
												})}
											</p>
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				))}
			</div>

			<MemberProfileSheet
				memberId={profileId}
				open={profileOpen}
				onOpenChange={handleProfileOpenChange}
				onOnboardingStageChange={(id, nextStage) => {
					setStages((current) => ({ ...current, [id]: nextStage }));
				}}
			/>
		</>
	);
}
