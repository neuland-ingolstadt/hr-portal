import {
	Await,
	createFileRoute,
	type ErrorComponentProps,
} from "@tanstack/react-router";
import { AuditEventsPanel } from "#/components/audit/audit-events-panel";
import { Button } from "#/components/ui/button";
import type { AuditEventsResult } from "#/lib/audit";
import { listAuditEventsFn } from "#/lib/audit.functions";
import { useI18n } from "#/lib/i18n/locale-context";
import { requireElevatedUser } from "#/lib/require-app-user";

export const Route = createFileRoute("/_app/audit")({
	beforeLoad: ({ context }) => {
		requireElevatedUser(context.user);
	},
	loader: () => ({
		eventsPromise: listAuditEventsFn({ data: { limit: 150 } }),
	}),
	staleTime: 15_000,
	preloadStaleTime: 15_000,
	errorComponent: AuditError,
	component: AuditPage,
});

function AuditHeader({ meta }: { meta?: string }) {
	const { t } = useI18n();
	return (
		<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0 space-y-2">
				<p className="eyebrow mb-0">{t("audit.eyebrow")}</p>
				<h1 className="page-title text-balance">{t("audit.title")}</h1>
				<p className="page-lead max-w-2xl">{t("audit.lead")}</p>
			</div>
			{meta ? <p className="page-meta shrink-0 sm:pb-1">{meta}</p> : null}
		</header>
	);
}

function AuditBodySkeleton() {
	const { t } = useI18n();
	return (
		<section className="surface-panel min-w-0 overflow-hidden" aria-busy="true">
			<span className="sr-only">{t("audit.loading")}</span>
			<div className="border-b border-border px-4 py-3.5 sm:px-5">
				<div className="h-4 w-28 animate-pulse bg-muted" />
			</div>
			<ul className="divide-y divide-border">
				{Array.from({ length: 8 }, (_, i) => (
					<li
						key={`audit-skel-${String(i)}`}
						className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5"
					>
						<div className="min-w-0 flex-1 space-y-2">
							<div className="h-3.5 w-48 max-w-full animate-pulse bg-muted" />
							<div className="h-3 w-64 max-w-full animate-pulse bg-muted" />
						</div>
						<div className="h-3 w-24 shrink-0 animate-pulse bg-muted" />
					</li>
				))}
			</ul>
		</section>
	);
}

function AuditBody({ data }: { data: AuditEventsResult }) {
	return <AuditEventsPanel events={data.events} />;
}

function AuditPage() {
	const { eventsPromise } = Route.useLoaderData();

	return (
		<>
			<AuditHeader />
			<Await promise={eventsPromise} fallback={<AuditBodySkeleton />}>
				{(data) => <AuditBody data={data} />}
			</Await>
		</>
	);
}

function AuditError({ error, reset }: ErrorComponentProps) {
	const { t } = useI18n();
	const message = error instanceof Error ? error.message : t("error.generic");
	return (
		<>
			<AuditHeader />
			<div className="surface-panel flex min-h-64 flex-col items-center justify-center gap-3 p-6">
				<p className="m-0 text-center text-sm text-destructive">{message}</p>
				<Button type="button" variant="outline" onClick={reset}>
					{t("audit.retry")}
				</Button>
			</div>
		</>
	);
}
