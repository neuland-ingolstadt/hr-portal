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

export const Route = createFileRoute("/_app/members")({
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
		<div
			className="members-workspace grid w-full min-w-0 gap-4 xl:grid-cols-[minmax(17rem,19rem)_minmax(0,1fr)] xl:items-start"
			aria-busy="true"
			aria-label={t("members.loading")}
		>
			<aside className="surface-panel flex flex-col" aria-hidden>
				<div className="border-b border-border px-4 py-3.5">
					<div className="h-4 w-24 animate-pulse bg-muted" />
				</div>
				<div className="flex flex-col gap-5 p-4">
					<div className="space-y-2">
						<div className="h-3 w-16 animate-pulse bg-muted" />
						<div className="h-9 w-full animate-pulse bg-muted" />
					</div>
					<div className="space-y-2">
						<div className="h-3 w-20 animate-pulse bg-muted" />
						{Array.from({ length: 6 }, (_, i) => (
							<div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
								<div className="size-4 shrink-0 animate-pulse bg-muted" />
								<div className="h-3.5 flex-1 animate-pulse bg-muted" />
								<div className="h-3 w-5 animate-pulse bg-muted" />
							</div>
						))}
					</div>
				</div>
			</aside>

			<section className="surface-panel min-w-0 overflow-hidden" aria-hidden>
				<div className="border-b border-border px-4 py-3.5 sm:px-5">
					<div className="h-4 w-32 animate-pulse bg-muted" />
				</div>
				<ul className="divide-y divide-border">
					{Array.from({ length: 8 }, (_, i) => (
						<li key={i} className="flex items-center gap-3 px-4 py-3 sm:px-5">
							<div className="size-9 shrink-0 animate-pulse bg-muted" />
							<div className="min-w-0 flex-1 space-y-2">
								<div className="h-3.5 w-40 max-w-full animate-pulse bg-muted" />
								<div className="h-3 w-24 max-w-full animate-pulse bg-muted" />
							</div>
							<div className="hidden h-5 w-16 animate-pulse bg-muted sm:block" />
						</li>
					))}
				</ul>
			</section>
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
					<MembersHeader lead={t("members.lead")} />
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
