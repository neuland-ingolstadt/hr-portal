import {
	Await,
	createFileRoute,
	type ErrorComponentProps,
	useRouter,
} from "@tanstack/react-router";
import { UserPlus } from "lucide-react";
import { useCallback, useState } from "react";
import { AcceptApplicationDialog } from "#/components/applications/accept-application-dialog";
import { ApplicationsTable } from "#/components/applications/applications-table";
import { ManualCreateMemberDialog } from "#/components/applications/manual-create-member-dialog";
import { PageHeader } from "#/components/layout/page-header";
import { Button } from "#/components/ui/button";
import type {
	ApplicationsResult,
	PendingApplication,
} from "#/lib/applications";
import { listApplicationsFn } from "#/lib/applications.functions";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { requireElevatedUser } from "#/lib/require-app-user";

export const Route = createFileRoute("/_app/applications")({
	beforeLoad: ({ context }) => {
		requireElevatedUser(context.user);
	},
	loader: () => ({
		applicationsPromise: listApplicationsFn(),
	}),
	staleTime: 15_000,
	preloadStaleTime: 15_000,
	errorComponent: ApplicationsError,
	component: ApplicationsPage,
});

function ApplicationsHeader({
	meta,
	onManualCreate,
}: {
	meta?: string;
	onManualCreate?: () => void;
}) {
	const { t } = useI18n();
	const end =
		meta || onManualCreate ? (
			<>
				{meta ? <p className="page-meta m-0">{meta}</p> : null}
				{onManualCreate ? (
					<Button type="button" variant="outline" onClick={onManualCreate}>
						<UserPlus className="size-4" aria-hidden />
						{t("applications.manualCreate")}
					</Button>
				) : null}
			</>
		) : undefined;

	return (
		<PageHeader
			eyebrow={t("applications.eyebrow")}
			title={t("applications.title")}
			lead={t("applications.leadLive")}
			end={end}
		/>
	);
}

function ApplicationsSkeleton() {
	const { t } = useI18n();
	return (
		<div className="space-y-4" aria-busy="true">
			<span className="sr-only">{t("applications.loading")}</span>
			<div
				className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
				aria-hidden
			>
				<div className="h-9 w-full max-w-sm animate-pulse bg-muted" />
				<div className="h-4 w-20 animate-pulse bg-muted" />
			</div>
			<div className="surface-panel overflow-hidden" aria-hidden>
				<div className="flex gap-4 border-b border-border bg-muted/40 px-4 py-3">
					<div className="h-3 w-16 animate-pulse bg-muted" />
					<div className="h-3 w-20 animate-pulse bg-muted" />
					<div className="h-3 w-24 animate-pulse bg-muted" />
					<div className="ml-auto h-3 w-14 animate-pulse bg-muted" />
				</div>
				<ul className="divide-y divide-border">
					{Array.from({ length: 8 }, (_, i) => (
						<li
							key={`applications-skel-${String(i)}`}
							className="flex items-center gap-3 px-4 py-3"
						>
							<div className="size-9 shrink-0 animate-pulse bg-muted" />
							<div className="h-3.5 w-36 max-w-[30%] animate-pulse bg-muted" />
							<div className="h-3 w-40 max-w-[28%] animate-pulse bg-muted" />
							<div className="h-3 w-20 animate-pulse bg-muted" />
							<div className="ml-auto h-8 w-20 animate-pulse bg-muted" />
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

function ApplicationsBody({
	data,
	manualCreateOpen,
	onManualCreateOpenChange,
}: {
	data: ApplicationsResult;
	manualCreateOpen: boolean;
	onManualCreateOpenChange: (open: boolean) => void;
}) {
	const { t } = useI18n();
	const router = useRouter();
	const [selected, setSelected] = useState<PendingApplication | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	const onAccept = useCallback((application: PendingApplication) => {
		setSelected(application);
		setDialogOpen(true);
	}, []);

	const onDialogOpenChange = useCallback((open: boolean) => {
		setDialogOpen(open);
		if (!open) setSelected(null);
	}, []);

	const onAccepted = useCallback(() => {
		void router.invalidate();
	}, [router]);

	return (
		<>
			{data.applications.length === 0 ? (
				<div className="surface-panel flex min-h-64 items-center justify-center p-6">
					<p className="text-sm text-muted-foreground">
						{t("applications.empty")}
					</p>
				</div>
			) : (
				<ApplicationsTable
					applications={data.applications}
					onAccept={onAccept}
				/>
			)}
			<AcceptApplicationDialog
				application={selected}
				open={dialogOpen}
				onOpenChange={onDialogOpenChange}
				onAccepted={onAccepted}
			/>
			<ManualCreateMemberDialog
				open={manualCreateOpen}
				onOpenChange={onManualCreateOpenChange}
			/>
		</>
	);
}

function ApplicationsError({ error, reset }: ErrorComponentProps) {
	const { t } = useI18n();
	const message = error instanceof Error ? error.message : "";
	const key: MessageKey =
		message === "easyverein_api_missing"
			? "applications.errorApiMissing"
			: "applications.errorLoad";

	return (
		<>
			<ApplicationsHeader />
			<div className="surface-panel space-y-4 p-5 sm:p-6">
				<p className="error-banner" role="alert">
					{t(key)}
				</p>
				<Button type="button" variant="outline" onClick={reset}>
					{t("applications.retry")}
				</Button>
			</div>
		</>
	);
}

function ApplicationsPage() {
	const { applicationsPromise } = Route.useLoaderData();
	const { t } = useI18n();
	const [manualCreateOpen, setManualCreateOpen] = useState(false);

	return (
		<Await
			promise={applicationsPromise}
			fallback={
				<>
					<ApplicationsHeader
						onManualCreate={() => setManualCreateOpen(true)}
					/>
					<ApplicationsSkeleton />
					<ManualCreateMemberDialog
						open={manualCreateOpen}
						onOpenChange={setManualCreateOpen}
					/>
				</>
			}
		>
			{(data) => (
				<>
					<ApplicationsHeader
						meta={
							data.applications.length > 0
								? t("applications.count", {
										count: String(data.applications.length),
									})
								: undefined
						}
						onManualCreate={() => setManualCreateOpen(true)}
					/>
					<ApplicationsBody
						data={data}
						manualCreateOpen={manualCreateOpen}
						onManualCreateOpenChange={setManualCreateOpen}
					/>
				</>
			)}
		</Await>
	);
}
