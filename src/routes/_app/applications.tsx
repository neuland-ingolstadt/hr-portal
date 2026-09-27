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
import { Button } from "#/components/ui/button";
import { Spinner } from "#/components/ui/spinner";
import type {
	ApplicationsResult,
	PendingApplication,
} from "#/lib/applications";
import { listApplicationsFn } from "#/lib/applications.functions";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";

export const Route = createFileRoute("/_app/applications")({
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
	return (
		<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="min-w-0 space-y-2">
				<p className="eyebrow mb-0">{t("applications.eyebrow")}</p>
				<h1 className="page-title text-balance">{t("applications.title")}</h1>
				<p className="page-lead max-w-2xl">{t("applications.leadLive")}</p>
			</div>
			<div className="flex shrink-0 flex-wrap items-center gap-3 sm:pb-1">
				{meta ? <p className="page-meta m-0">{meta}</p> : null}
				{onManualCreate ? (
					<Button type="button" variant="outline" onClick={onManualCreate}>
						<UserPlus className="size-4" aria-hidden />
						{t("applications.manualCreate")}
					</Button>
				) : null}
			</div>
		</header>
	);
}

function ApplicationsSkeleton() {
	const { t } = useI18n();
	return (
		<div className="surface-panel flex min-h-72 items-center justify-center">
			<Spinner label={t("applications.loading")} />
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
