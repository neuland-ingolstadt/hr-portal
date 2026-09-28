import { getRouteApi } from "@tanstack/react-router";
import {
	CheckCircle2,
	CircleDashed,
	ExternalLink,
	Loader2,
	Pencil,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { OnboardingStageSlider } from "#/components/onboarding/onboarding-stage-slider";
import { Badge } from "#/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { hasElevatedAccess } from "#/lib/auth";
import {
	groupBadgeVariant,
	matchRessort,
	partitionEditableGroups,
	partitionGroups,
	RESSORTS,
	ressortLabelKey,
	sortGroupsForDisplay,
} from "#/lib/groups";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { UpdateMemberGroupsError } from "#/lib/member-groups";
import type { MemberProfile, MemberProfileResult } from "#/lib/members";
import {
	getMemberProfileFn,
	updateMemberGroupsFn,
} from "#/lib/members.functions";
import type {
	OnboardingContactRef,
	OnboardingStage,
	UpdateMemberOnboardingContactError,
	UpdateMemberOnboardingStageError,
} from "#/lib/onboarding";
import {
	listOnboardingContactsFn,
	updateMemberOnboardingContactFn,
	updateMemberOnboardingStageFn,
} from "#/lib/onboarding.functions";
import { cn } from "#/lib/utils";

const appRouteApi = getRouteApi("/_app");

const GROUP_ERROR_KEYS: Record<UpdateMemberGroupsError, MessageKey> = {
	invalid_id: "profile.errorGroupsNotFound",
	invalid_groups: "profile.errorGroupsInvalid",
	protected_group: "profile.errorGroupsProtected",
	user_not_found: "profile.errorGroupsNotFound",
	group_not_found: "profile.errorGroupsNotFound",
	authentik_api_missing: "profile.errorGroupsApi",
	update_failed: "profile.errorGroupsFailed",
};

const STAGE_ERROR_KEYS: Record<UpdateMemberOnboardingStageError, MessageKey> = {
	invalid_id: "profile.errorOnboardingNotFound",
	invalid_stage: "profile.errorOnboardingInvalid",
	user_not_found: "profile.errorOnboardingNotFound",
	authentik_api_missing: "profile.errorOnboardingApi",
	update_failed: "profile.errorOnboardingFailed",
};

const CONTACT_ERROR_KEYS: Record<
	UpdateMemberOnboardingContactError,
	MessageKey
> = {
	invalid_id: "profile.errorContactNotFound",
	invalid_contact: "profile.errorContactInvalid",
	user_not_found: "profile.errorContactNotFound",
	authentik_api_missing: "profile.errorContactApi",
	update_failed: "profile.errorContactFailed",
};

type MemberProfileSheetProps = {
	memberId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Called when the stage changes (optimistic) so list cards regroup immediately. */
	onOnboardingStageChange?: (memberId: string, stage: OnboardingStage) => void;
	/** Called when the contact changes so list cards update immediately. */
	onOnboardingContactChange?: (
		memberId: string,
		contact: OnboardingContactRef | null,
	) => void;
	/** Called when assignable groups change so list rows update immediately. */
	onGroupsChange?: (memberId: string, groups: string[]) => void;
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
	onOnboardingStageChange,
	onOnboardingContactChange,
	onGroupsChange,
}: MemberProfileSheetProps) {
	const { t } = useI18n();
	const { user } = appRouteApi.useRouteContext();
	const canEditGroups = hasElevatedAccess(user.roles);
	const [result, setResult] = useState<MemberProfileResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [contacts, setContacts] = useState<OnboardingContactRef[]>([]);
	const [myContactId, setMyContactId] = useState<string | null>(null);
	const sheetOpen = open && Boolean(memberId);

	useEffect(() => {
		if (!sheetOpen || !memberId) {
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
	}, [sheetOpen, memberId]);

	useEffect(() => {
		if (!sheetOpen) return;
		let cancelled = false;
		void listOnboardingContactsFn()
			.then((next) => {
				if (!cancelled) {
					setContacts(next.contacts);
					setMyContactId(next.myContactId);
				}
			})
			.catch((err) => {
				console.error("[members] onboarding contacts load failed", err);
			});
		return () => {
			cancelled = true;
		};
	}, [sheetOpen]);

	// Radix locks body pointer-events while open; restore if we unmount mid-open
	// (e.g. Await remount) so the app does not stay frozen.
	useEffect(() => {
		if (!sheetOpen) return;
		return () => {
			document.body.style.pointerEvents = "";
		};
	}, [sheetOpen]);

	const profile = result?.status === "found" ? result.profile : null;

	return (
		<Sheet open={sheetOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full gap-0 overflow-y-auto p-0 sm:max-w-2xl"
			>
				<SheetHeader className="border-b border-border px-6 py-5 pr-14">
					<SheetTitle className="font-sans text-base tracking-tight">
						{t("profile.title")}
					</SheetTitle>
					<SheetDescription>{t("profile.lead")}</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-6 px-6 py-6">
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

					{!loading && profile ? (
						<ProfileBody
							profile={profile}
							listMemberId={memberId ?? profile.id}
							canEditGroups={canEditGroups}
							myContactId={myContactId}
							contacts={contacts}
							onProfileUpdate={(next) => {
								setResult({ status: "found", profile: next });
							}}
							onOnboardingStageChange={onOnboardingStageChange}
							onOnboardingContactChange={onOnboardingContactChange}
							onGroupsChange={onGroupsChange}
						/>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function selectedFromProfile(groups: string[]): Set<string> {
	const selected = new Set<string>();
	for (const group of groups) {
		const ressort = matchRessort(group);
		if (ressort) selected.add(ressort);
	}
	return selected;
}

function mergeAssignableGroups(
	current: string[],
	assignable: Iterable<string>,
): string[] {
	const { readonly } = partitionEditableGroups(current);
	return sortGroupsForDisplay([...readonly, ...assignable]);
}

function ProfileBody({
	profile,
	listMemberId,
	canEditGroups,
	myContactId,
	contacts,
	onProfileUpdate,
	onOnboardingStageChange,
	onOnboardingContactChange,
	onGroupsChange,
}: {
	profile: MemberProfile;
	/** Id used by the parent list (may be pk while profile.id is uuid). */
	listMemberId: string;
	canEditGroups: boolean;
	myContactId: string | null;
	contacts: OnboardingContactRef[];
	onProfileUpdate: (profile: MemberProfile) => void;
	onOnboardingStageChange?: (memberId: string, stage: OnboardingStage) => void;
	onOnboardingContactChange?: (
		memberId: string,
		contact: OnboardingContactRef | null,
	) => void;
	onGroupsChange?: (memberId: string, groups: string[]) => void;
}) {
	const { t } = useI18n();
	const { ressorts, other } = partitionGroups(profile.groups);
	const { readonly } = partitionEditableGroups(profile.groups);
	const readOnlyGroups = canEditGroups ? readonly : other;
	const [selected, setSelected] = useState(() =>
		selectedFromProfile(profile.groups),
	);
	const [pending, setPending] = useState(false);
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
	const [saved, setSaved] = useState(false);

	const [stage, setStage] = useState<OnboardingStage>(profile.onboardingStage);
	const [stagePending, setStagePending] = useState(false);
	const [stageErrorKey, setStageErrorKey] = useState<MessageKey | null>(null);
	const [stageSaved, setStageSaved] = useState(false);

	const [contact, setContact] = useState<OnboardingContactRef | null>(
		profile.onboardingContact,
	);
	const [contactPending, setContactPending] = useState(false);
	const [contactErrorKey, setContactErrorKey] = useState<MessageKey | null>(
		null,
	);
	const [contactSavedKey, setContactSavedKey] = useState<MessageKey | null>(
		null,
	);

	const stageRequestId = useRef(0);
	const contactRequestId = useRef(0);
	const groupsRequestId = useRef(0);
	const contactSelectId = useId();
	const profileId = profile.id;
	const stageListId = listMemberId;

	const contactOptions = (() => {
		const byId = new Map<string, OnboardingContactRef>();
		for (const entry of contacts) byId.set(entry.id, entry);
		if (profile.onboardingContact) {
			byId.set(profile.onboardingContact.id, profile.onboardingContact);
		}
		if (contact) byId.set(contact.id, contact);
		return [...byId.values()].sort((a, b) =>
			a.name.localeCompare(b.name, "de"),
		);
	})();
	const selfContactId = myContactId;
	const canAssignSelf = Boolean(selfContactId);
	const isAssignedToSelf =
		contact?.id != null &&
		selfContactId != null &&
		contact.id === selfContactId;

	useEffect(() => {
		setSelected(selectedFromProfile(profile.groups));
	}, [profile.groups]);

	useEffect(() => {
		setStage(profile.onboardingStage);
	}, [profile.onboardingStage]);

	useEffect(() => {
		setContact(profile.onboardingContact);
	}, [profile.onboardingContact]);

	async function persistStage(next: OnboardingStage) {
		const requestId = ++stageRequestId.current;
		setStagePending(true);
		setStageErrorKey(null);
		setStageSaved(false);
		try {
			const result = await updateMemberOnboardingStageFn({
				data: { id: profileId, stage: next },
			});
			if (requestId !== stageRequestId.current) return;
			if (!result.success) {
				setStage(profile.onboardingStage);
				onOnboardingStageChange?.(stageListId, profile.onboardingStage);
				setStageErrorKey(STAGE_ERROR_KEYS[result.error]);
				return;
			}
			onProfileUpdate(result.profile);
			setStage(result.profile.onboardingStage);
			onOnboardingStageChange?.(stageListId, result.profile.onboardingStage);
			setStageSaved(true);
		} catch (err) {
			console.error("[members] update onboarding stage failed", err);
			if (requestId === stageRequestId.current) {
				setStage(profile.onboardingStage);
				onOnboardingStageChange?.(stageListId, profile.onboardingStage);
				setStageErrorKey("profile.errorOnboardingFailed");
			}
		} finally {
			if (requestId === stageRequestId.current) setStagePending(false);
		}
	}

	function handleStageChange(next: OnboardingStage) {
		setStage(next);
		setStageErrorKey(null);
		setStageSaved(false);
		onOnboardingStageChange?.(stageListId, next);
		if (next === profile.onboardingStage) return;
		void persistStage(next);
	}

	async function persistContact(nextId: string | null) {
		const requestId = ++contactRequestId.current;
		const previous = profile.onboardingContact;
		setContactPending(true);
		setContactErrorKey(null);
		setContactSavedKey(null);
		try {
			const result = await updateMemberOnboardingContactFn({
				data: { id: profileId, contactId: nextId },
			});
			if (requestId !== contactRequestId.current) return;
			if (!result.success) {
				setContact(previous);
				onOnboardingContactChange?.(stageListId, previous);
				setContactErrorKey(CONTACT_ERROR_KEYS[result.error]);
				return;
			}
			onProfileUpdate(result.profile);
			setContact(result.profile.onboardingContact);
			onOnboardingContactChange?.(
				stageListId,
				result.profile.onboardingContact,
			);
			if (result.notifyEmailSent === true) {
				setContactSavedKey("profile.onboardingContactNotified");
			} else if (result.notifyEmailSent === false) {
				setContactSavedKey("profile.onboardingContactNotifyFailed");
			} else {
				setContactSavedKey("profile.onboardingContactSaved");
			}
		} catch (err) {
			console.error("[members] update onboarding contact failed", err);
			if (requestId === contactRequestId.current) {
				setContact(previous);
				onOnboardingContactChange?.(stageListId, previous);
				setContactErrorKey("profile.errorContactFailed");
			}
		} finally {
			if (requestId === contactRequestId.current) setContactPending(false);
		}
	}

	function handleContactChange(nextId: string | null) {
		const currentId = contact?.id ?? null;
		if (nextId === currentId) return;
		const optimistic =
			nextId == null
				? null
				: (contactOptions.find((entry) => entry.id === nextId) ?? {
						id: nextId,
						name: nextId,
						username: null,
					});
		setContact(optimistic);
		setContactErrorKey(null);
		setContactSavedKey(null);
		onOnboardingContactChange?.(stageListId, optimistic);
		void persistContact(nextId);
	}

	async function persistGroups(next: Set<string>, previousGroups: string[]) {
		const requestId = ++groupsRequestId.current;
		setPending(true);
		setErrorKey(null);
		setSaved(false);
		try {
			const result = await updateMemberGroupsFn({
				data: {
					id: profileId,
					groups: [...next],
				},
			});
			if (requestId !== groupsRequestId.current) return;
			if (!result.success) {
				setSelected(selectedFromProfile(previousGroups));
				onGroupsChange?.(stageListId, previousGroups);
				setErrorKey(GROUP_ERROR_KEYS[result.error]);
				return;
			}
			onProfileUpdate(result.profile);
			setSelected(selectedFromProfile(result.profile.groups));
			onGroupsChange?.(stageListId, result.profile.groups);
			setSaved(true);
		} catch (err) {
			console.error("[members] update groups failed", err);
			if (requestId === groupsRequestId.current) {
				setSelected(selectedFromProfile(previousGroups));
				onGroupsChange?.(stageListId, previousGroups);
				setErrorKey("profile.errorGroupsFailed");
			}
		} finally {
			if (requestId === groupsRequestId.current) setPending(false);
		}
	}

	function toggle(value: string) {
		if (pending) return;
		setSaved(false);
		setErrorKey(null);
		const previousGroups = profile.groups;
		const next = new Set(selected);
		if (next.has(value)) next.delete(value);
		else next.add(value);
		setSelected(next);
		onGroupsChange?.(stageListId, mergeAssignableGroups(previousGroups, next));
		void persistGroups(next, previousGroups);
	}

	return (
		<>
			{/* Identity header */}
			<section className="flex items-start gap-4">
				<span
					aria-hidden
					className="flex size-14 shrink-0 items-center justify-center border border-border bg-muted font-mono text-base font-semibold tracking-wide text-muted-foreground"
				>
					{initials(profile.name)}
				</span>
				<div className="min-w-0 flex-1 space-y-3">
					<div className="min-w-0 space-y-0.5">
						<p className="truncate text-xl font-semibold tracking-tight">
							{profile.name}
						</p>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
							{profile.username ? (
								<p className="truncate font-mono text-xs text-muted-foreground">
									@{profile.username}
								</p>
							) : null}
							{profile.authentikAdminUrl ? (
								<a
									href={profile.authentikAdminUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
								>
									{t("profile.openInAuthentik")}
									<ExternalLink className="size-3" aria-hidden />
								</a>
							) : null}
						</div>
					</div>
					<dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
						{profile.email ? (
							<Field label={t("profile.fieldEmail")} value={profile.email} />
						) : null}
						<Field
							label={t("profile.fieldUsername")}
							value={profile.username ?? t("profile.empty")}
							mono={Boolean(profile.username)}
						/>
					</dl>
				</div>
			</section>

			{/* Onboarding - stepped slider + contact */}
			<section className="space-y-4 border-t border-border pt-6">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{t("profile.onboarding")}
				</p>
				<OnboardingStageSlider
					value={stage}
					disabled={stagePending}
					onChange={handleStageChange}
				/>
				{(stagePending || stageSaved || stageErrorKey) && (
					<div className="flex flex-wrap items-center gap-3">
						{stagePending ? (
							<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
								<Loader2 className="size-3.5 animate-spin" aria-hidden />
								{t("profile.onboardingSaving")}
							</p>
						) : null}
						{stageSaved && !stagePending ? (
							<p className="text-sm text-primary">
								{t("profile.onboardingSaved")}
							</p>
						) : null}
						{stageErrorKey ? (
							<p className="text-sm text-destructive" role="alert">
								{t(stageErrorKey)}
							</p>
						) : null}
					</div>
				)}

				<div className="space-y-2">
					<label
						htmlFor={contactSelectId}
						className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
					>
						{t("profile.onboardingContact")}
					</label>
					<p className="text-sm text-muted-foreground">
						{t("profile.onboardingContactHint")}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						<select
							id={contactSelectId}
							value={contact?.id ?? ""}
							disabled={contactPending}
							onChange={(event) => {
								const value = event.target.value;
								handleContactChange(value.length > 0 ? value : null);
							}}
							className={cn(
								"h-9 min-w-[12rem] flex-1 border border-border bg-background px-3 text-sm text-foreground",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								"disabled:cursor-not-allowed disabled:opacity-60",
							)}
						>
							<option value="">{t("profile.onboardingContactNone")}</option>
							{contactOptions.map((entry) => (
								<option key={entry.id} value={entry.id}>
									{entry.name}
									{entry.username ? ` (@${entry.username})` : ""}
								</option>
							))}
						</select>
						{canAssignSelf && !isAssignedToSelf ? (
							<button
								type="button"
								disabled={contactPending}
								onClick={() => handleContactChange(selfContactId)}
								className={cn(
									"h-9 shrink-0 border border-border px-3 text-sm text-foreground transition-colors",
									"hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									"disabled:cursor-not-allowed disabled:opacity-60",
								)}
							>
								{t("profile.onboardingContactAssignMe")}
							</button>
						) : null}
					</div>
					{(contactPending || contactSavedKey || contactErrorKey) && (
						<div className="flex flex-wrap items-center gap-3">
							{contactPending ? (
								<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="size-3.5 animate-spin" aria-hidden />
									{t("profile.onboardingContactSaving")}
								</p>
							) : null}
							{contactSavedKey && !contactPending ? (
								<p className="text-sm text-primary">{t(contactSavedKey)}</p>
							) : null}
							{contactErrorKey ? (
								<p className="text-sm text-destructive" role="alert">
									{t(contactErrorKey)}
								</p>
							) : null}
						</div>
					)}
				</div>
			</section>
			{/* Ressorts - full width, checkboxes in a comfortable grid */}
			<section className="space-y-3 border-t border-border pt-6">
				{canEditGroups ? (
					<>
						<div className="space-y-1">
							<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								{t("profile.editRoles")}
							</p>
							<p className="text-sm text-muted-foreground">
								{t("profile.editRolesHint")}
							</p>
						</div>
						<ul className="grid gap-2 sm:grid-cols-2">
							{RESSORTS.map((ressort) => {
								const labelKey = ressortLabelKey(ressort);
								return (
									<GroupCheckbox
										key={ressort}
										checked={selected.has(ressort)}
										disabled={pending}
										label={labelKey ? t(labelKey) : ressort}
										onChange={() => toggle(ressort)}
									/>
								);
							})}
						</ul>
						{(pending || saved || errorKey) && (
							<div className="flex flex-wrap items-center gap-3">
								{pending ? (
									<p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="size-3.5 animate-spin" aria-hidden />
										{t("profile.savingGroups")}
									</p>
								) : null}
								{saved && !pending ? (
									<p className="text-sm text-primary">
										{t("profile.groupsSaved")}
									</p>
								) : null}
								{errorKey ? (
									<p className="text-sm text-destructive" role="alert">
										{t(errorKey)}
									</p>
								) : null}
							</div>
						)}
					</>
				) : (
					<>
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
					</>
				)}
			</section>

			{readOnlyGroups.length > 0 || profile.authentikAdminGroupsUrl ? (
				<section className="space-y-3 border-t border-border pt-6">
					<div className="flex items-center gap-2">
						<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							{t("profile.groups")}
						</p>
						{profile.authentikAdminGroupsUrl ? (
							<a
								href={profile.authentikAdminGroupsUrl}
								target="_blank"
								rel="noopener noreferrer"
								aria-label={t("profile.openGroupsInAuthentik")}
								title={t("profile.openGroupsInAuthentik")}
								className="inline-flex text-muted-foreground transition-colors hover:text-foreground"
							>
								<Pencil className="size-3.5" aria-hidden />
							</a>
						) : null}
					</div>
					{readOnlyGroups.length > 0 ? (
						<ul className="flex flex-wrap gap-1.5">
							{readOnlyGroups.map((group) => (
								<li key={group}>
									<Badge variant={groupBadgeVariant(group)}>{group}</Badge>
								</li>
							))}
						</ul>
					) : (
						<p className="text-sm text-muted-foreground">
							{t("profile.empty")}
						</p>
					)}
				</section>
			) : null}

			{/* Integrations */}
			<section className="space-y-3 border-t border-border pt-6">
				<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					{t("profile.integrations")}
				</p>
				<ul className="grid gap-2 sm:grid-cols-2">
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

function GroupCheckbox({
	checked,
	disabled,
	label,
	onChange,
}: {
	checked: boolean;
	disabled?: boolean;
	label: string;
	onChange: () => void;
}) {
	const id = useId();
	return (
		<li>
			<label
				htmlFor={id}
				className={cn(
					"flex cursor-pointer items-center gap-3 border border-border bg-muted/20 px-3 py-2.5 text-sm transition-colors",
					checked && "border-primary/40 bg-primary/5",
					disabled && "cursor-not-allowed opacity-60",
				)}
			>
				<input
					id={id}
					type="checkbox"
					checked={checked}
					disabled={disabled}
					onChange={onChange}
					className="size-4 shrink-0 accent-primary"
				/>
				<span className="font-medium">{label}</span>
			</label>
		</li>
	);
}

function Field({
	label,
	value,
	mono,
	className,
}: {
	label: string;
	value: string;
	mono?: boolean;
	className?: string;
}) {
	return (
		<div className={cn("space-y-1", className)}>
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
