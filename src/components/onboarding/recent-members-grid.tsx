import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { MemberProfileSheet } from "#/components/members/member-profile-sheet";
import { useI18n } from "#/lib/i18n/locale-context";
import type {
	OnboardingContactRef,
	OnboardingStage,
	RecentOnboardingMember,
} from "#/lib/onboarding";
import {
	contactIdMatchesAnyViewer,
	ONBOARDING_STAGE_LABEL_KEYS,
	ONBOARDING_STAGE_MAX,
	ONBOARDING_STAGES,
} from "#/lib/onboarding";
import { cn } from "#/lib/utils";

type ContactFilter = "all" | "mine" | "unassigned";

type RecentMembersGridProps = {
	members: RecentOnboardingMember[];
	viewerContactIds: readonly string[];
};

type ContactState = {
	id: string | null;
	name: string | null;
};

/** Top glow fill - stage 0 still shows a small segment. */
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

export function RecentMembersGrid({
	members,
	viewerContactIds,
}: RecentMembersGridProps) {
	const { t, locale } = useI18n();
	const viewerIds = viewerContactIds;
	const [profileId, setProfileId] = useState<string | null>(null);
	const [profileOpen, setProfileOpen] = useState(false);
	const [contactFilter, setContactFilter] = useState<ContactFilter>("all");
	const [collapsed, setCollapsed] = useState<
		Partial<Record<OnboardingStage, boolean>>
	>({});
	const [stages, setStages] = useState(() => {
		const initial: Record<string, OnboardingStage> = {};
		for (const member of members) {
			initial[member.id] = member.onboardingStage;
		}
		return initial;
	});
	const [contacts, setContacts] = useState(() => {
		const initial: Record<string, ContactState> = {};
		for (const member of members) {
			initial[member.id] = {
				id: member.onboardingContactId,
				name: member.onboardingContactName,
			};
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
		setContacts((current) => {
			const next: Record<string, ContactState> = {};
			for (const member of members) {
				const prev = current[member.id];
				// Field-level merge: a stale `{ id: null }` must not block server ids.
				next[member.id] = {
					id: prev?.id ?? member.onboardingContactId,
					name: prev?.name ?? member.onboardingContactName,
				};
			}
			return next;
		});
	}, [members]);

	const filteredMembers =
		contactFilter === "all"
			? members
			: members.filter((member) => {
					const contactId =
						contacts[member.id]?.id ?? member.onboardingContactId;
					if (contactFilter === "mine") {
						return (
							member.onboardingContactIsMe === true ||
							contactIdMatchesAnyViewer(contactId, viewerIds)
						);
					}
					return contactId == null;
				});

	const sections = groupByStage(filteredMembers, stages);

	const openProfile = useCallback((id: string) => {
		setProfileId(id);
		setProfileOpen(true);
	}, []);

	const handleProfileOpenChange = useCallback((open: boolean) => {
		setProfileOpen(open);
		if (!open) setProfileId(null);
	}, []);

	const toggleStage = useCallback((stage: OnboardingStage) => {
		setCollapsed((current) => ({
			...current,
			[stage]: !current[stage],
		}));
	}, []);

	const applyStageChange = useCallback(
		(id: string, nextStage: OnboardingStage) => {
			setStages((current) => {
				const next = { ...current, [id]: nextStage };
				if (profileId && profileId !== id) {
					next[profileId] = nextStage;
				}
				return next;
			});
			setCollapsed((current) =>
				current[nextStage] ? { ...current, [nextStage]: false } : current,
			);
		},
		[profileId],
	);

	const applyContactChange = useCallback(
		(id: string, contact: OnboardingContactRef | null) => {
			const nextState: ContactState = {
				id: contact?.id ?? null,
				name: contact?.name ?? null,
			};
			setContacts((current) => {
				const next = { ...current, [id]: nextState };
				if (profileId && profileId !== id) {
					next[profileId] = nextState;
				}
				return next;
			});
		},
		[profileId],
	);

	const filters: { id: ContactFilter; label: string }[] = [
		{ id: "all", label: t("onboarding.filter.all") },
		{ id: "mine", label: t("onboarding.filter.mine") },
		{ id: "unassigned", label: t("onboarding.filter.unassigned") },
	];

	return (
		<>
			<div className="flex flex-col gap-6">
				<fieldset
					className="m-0 flex flex-wrap gap-2 border-0 p-0"
					aria-label={t("onboarding.filter.label")}
				>
					{filters.map((filter) => {
						const active = contactFilter === filter.id;
						return (
							<button
								key={filter.id}
								type="button"
								aria-pressed={active}
								onClick={() => setContactFilter(filter.id)}
								className={cn(
									"h-8 border px-3 text-xs font-medium transition-colors",
									"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									active
										? "border-foreground bg-foreground text-background"
										: "border-border bg-background text-muted-foreground hover:text-foreground",
								)}
							>
								{filter.label}
							</button>
						);
					})}
				</fieldset>

				{filteredMembers.length === 0 ? (
					<div className="surface-panel flex min-h-40 items-center justify-center p-6">
						<p className="text-sm text-muted-foreground">
							{t("onboarding.filter.empty")}
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-8">
						{sections.map(({ stage, members: sectionMembers }) => {
							const isOpen = !collapsed[stage];
							const headingId = `onboarding-stage-${stage}`;
							return (
								<section key={stage} className="min-w-0 space-y-3">
									<button
										type="button"
										id={headingId}
										aria-expanded={isOpen}
										aria-controls={`onboarding-stage-panel-${stage}`}
										onClick={() => toggleStage(stage)}
										className={cn(
											"flex w-full items-center gap-2 text-left",
											"rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
										)}
									>
										<ChevronDown
											aria-hidden
											className={cn(
												"size-4 shrink-0 text-muted-foreground transition-transform duration-200",
												!isOpen && "-rotate-90",
											)}
										/>
										<h3 className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-foreground">
											{t(ONBOARDING_STAGE_LABEL_KEYS[stage])}
										</h3>
										<span className="font-mono text-xs tabular-nums text-muted-foreground">
											{sectionMembers.length}
										</span>
									</button>

									{isOpen ? (
										<section
											id={`onboarding-stage-panel-${stage}`}
											aria-labelledby={headingId}
										>
											<ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
												{sectionMembers.map((member) => {
													const memberStage =
														stages[member.id] ?? member.onboardingStage;
													const contact =
														contacts[member.id] ??
														({
															id: member.onboardingContactId,
															name: member.onboardingContactName,
														} satisfies ContactState);
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
																<div className="mt-auto space-y-1">
																	<p className="text-xs text-muted-foreground">
																		{t("onboarding.recent.joined", {
																			date: formatJoinedDate(
																				member.dateJoined,
																				locale,
																			),
																		})}
																	</p>
																	<p className="truncate text-xs text-muted-foreground">
																		{contact.id
																			? contact.name
																				? t("onboarding.recent.contact", {
																						name: contact.name,
																					})
																				: t("onboarding.recent.contactAssigned")
																			: t("onboarding.recent.contactNone")}
																	</p>
																</div>
															</button>
														</li>
													);
												})}
											</ul>
										</section>
									) : null}
								</section>
							);
						})}
					</div>
				)}
			</div>

			<MemberProfileSheet
				memberId={profileId}
				open={profileOpen}
				onOpenChange={handleProfileOpenChange}
				onOnboardingStageChange={applyStageChange}
				onOnboardingContactChange={applyContactChange}
			/>
		</>
	);
}
