import {
	Await,
	createFileRoute,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { MembersTable } from "#/components/members/members-table";
import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { MembersResult } from "#/lib/members";
import { listMembersFn } from "#/lib/members.functions";

export const Route = createFileRoute("/_app/mitglieder")({
	loader: () => ({
		// Do not await — page chrome stays interactive while Authentik loads.
		membersPromise: listMembersFn(),
	}),
	staleTime: 30_000,
	preloadStaleTime: 30_000,
	errorComponent: MembersError,
	component: MembersPage,
});

function MembersHeader({ lead, meta }: { lead: string; meta?: string }) {
	const { t } = useI18n();
	return (
		<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0 space-y-2">
				<p className="eyebrow mb-0">{t("members.eyebrow")}</p>
				<h1 className="page-title text-balance">{t("members.title")}</h1>
				<p className="page-lead max-w-2xl">{lead}</p>
			</div>
			{meta ? <p className="page-meta shrink-0 sm:pb-1">{meta}</p> : null}
		</header>
	);
}

function MembersBodySkeleton() {
	const { t } = useI18n();
	return (
		<div className="grid gap-4 xl:grid-cols-[minmax(17rem,19rem)_minmax(0,1fr)]">
			<div className="surface-panel min-h-48 animate-pulse" aria-hidden />
			<div
				className="surface-panel flex min-h-64 items-center justify-center"
				aria-busy="true"
			>
				<p className="text-sm text-muted-foreground">{t("members.loading")}</p>
			</div>
		</div>
	);
}

function MembersBody({ data }: { data: MembersResult }) {
	const { t } = useI18n();
	const { members, availableGroups, source } = data;

	return (
		<>
			{source === "mock" ? (
				<p className="hint m-0 -mt-3">{t("members.mockHint")}</p>
			) : null}

			{members.length === 0 ? (
				<div className="surface-panel flex min-h-64 items-center justify-center p-6">
					<p className="text-sm text-muted-foreground">{t("members.empty")}</p>
				</div>
			) : (
				<MembersTable members={members} availableGroups={availableGroups} />
			)}
		</>
	);
}

function MembersError({ error, reset }: ErrorComponentProps) {
	const { t } = useI18n();
	const message = error instanceof Error ? error.message : "";
	const key: MessageKey =
		message === "authentik_api_missing"
			? "members.errorApiMissing"
			: "members.errorLoad";

	return (
		<>
			<MembersHeader lead={t("members.lead")} />
			<div className="surface-panel p-5 sm:p-6">
				<p className="error-banner" role="alert">
					{t(key)}
				</p>
				<Button type="button" variant="outline" onClick={reset}>
					{t("members.retry")}
				</Button>
			</div>
		</>
	);
}

function MembersPage() {
	const { membersPromise } = Route.useLoaderData();
	const { t } = useI18n();

	return (
		<Await
			promise={membersPromise}
			fallback={
				<>
					<MembersHeader lead={t("members.loading")} />
					<MembersBodySkeleton />
				</>
			}
		>
			{(data) => (
				<>
					<MembersHeader
						lead={t("members.lead")}
						meta={
							data.members.length > 0
								? t("members.count", {
										count: String(data.members.length),
									})
								: undefined
						}
					/>
					<MembersBody data={data} />
				</>
			)}
		</Await>
	);
}
