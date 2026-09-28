import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import type {
	AcceptApplicationError,
	PendingApplication,
	SepaMandateStatus,
} from "#/lib/applications";
import { acceptApplicationFn } from "#/lib/applications.functions";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

const ERROR_KEYS: Record<AcceptApplicationError, MessageKey> = {
	invalid_input: "onboarding.create.errorInvalid",
	authentik_api_missing: "onboarding.create.errorApiMissing",
	username_exists: "onboarding.create.errorUsernameExists",
	create_failed: "onboarding.create.errorFailed",
	easyverein_api_missing: "applications.errorApiMissing",
	easyverein_not_found: "applications.errorNotFound",
	easyverein_not_pending: "applications.errorNotPending",
	easyverein_accept_failed: "applications.errorAcceptPartial",
};

/** SEPA problems to surface after a successful accept — silent when set/already_set. */
const SEPA_ALERT_KEYS: Partial<
	Record<NonNullable<SepaMandateStatus>, MessageKey>
> = {
	skipped_no_iban: "applications.acceptSepaNoIban",
	skipped_no_contact: "applications.acceptSepaNoContact",
	failed: "applications.acceptSepaFailed",
};

const ACCEPT_STEPS: MessageKey[] = [
	"applications.acceptStepAccount",
	"applications.acceptStepEmail",
	"applications.acceptStepEasyVerein",
	"applications.acceptStepSepa",
];

/** Client-side step pacing while the single server call runs. */
const STEP_INTERVAL_MS = 2_200;

type AcceptApplicationDialogProps = {
	application: PendingApplication | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onAccepted: () => void;
};

function formatDate(value: string | null, locale: string): string {
	if (!value) return "—";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return new Intl.DateTimeFormat(locale, {
		year: "numeric",
		month: "short",
		day: "numeric",
	}).format(date);
}

export function AcceptApplicationDialog({
	application,
	open,
	onOpenChange,
	onAccepted,
}: AcceptApplicationDialogProps) {
	const { t, locale } = useI18n();
	const [pending, setPending] = useState(false);
	const [stepIndex, setStepIndex] = useState(0);
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
	const [partialUsername, setPartialUsername] = useState<string | null>(null);
	const [success, setSuccess] = useState<{
		username: string;
		emailSent: boolean;
		sepaMandate: SepaMandateStatus;
	} | null>(null);

	useEffect(() => {
		if (!open) return;
		setErrorKey(null);
		setPartialUsername(null);
		setSuccess(null);
		setPending(false);
		setStepIndex(0);
	}, [open]);

	useEffect(() => {
		if (!pending) return;
		setStepIndex(0);
		const id = window.setInterval(() => {
			setStepIndex((current) => Math.min(current + 1, ACCEPT_STEPS.length - 1));
		}, STEP_INTERVAL_MS);
		return () => window.clearInterval(id);
	}, [pending]);

	async function onConfirm() {
		if (!application) return;
		setPending(true);
		setErrorKey(null);
		setPartialUsername(null);
		setSuccess(null);

		try {
			const result = await acceptApplicationFn({
				data: { memberId: application.id },
			});

			if (!result.success) {
				setErrorKey(ERROR_KEYS[result.error]);
				if (result.username) {
					setPartialUsername(result.username);
				}
				return;
			}

			setStepIndex(ACCEPT_STEPS.length - 1);
			setSuccess({
				username: result.username,
				emailSent: result.emailSent,
				sepaMandate: result.sepaMandate,
			});
			onAccepted();
		} catch {
			setErrorKey("applications.errorAcceptFailed");
		} finally {
			setPending(false);
		}
	}

	const sepaAlertKey =
		success?.sepaMandate != null
			? SEPA_ALERT_KEYS[success.sepaMandate]
			: undefined;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md" showClose={!pending}>
				<DialogHeader>
					<DialogTitle>{t("applications.acceptTitle")}</DialogTitle>
					<DialogDescription>{t("applications.acceptLead")}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 px-5 py-4">
					{application ? (
						<dl className="grid gap-3 text-sm">
							<div className="grid gap-0.5">
								<dt className="text-muted-foreground">
									{t("applications.colName")}
								</dt>
								<dd className="font-medium text-foreground">
									{application.displayName}
								</dd>
							</div>
							<div className="grid gap-0.5">
								<dt className="text-muted-foreground">
									{t("applications.colEmail")}
								</dt>
								<dd className="font-medium text-foreground">
									{application.email || "—"}
								</dd>
							</div>
							<div className="grid gap-0.5">
								<dt className="text-muted-foreground">
									{t("applications.colDate")}
								</dt>
								<dd className="font-medium text-foreground">
									{formatDate(application.applicationDate, locale)}
								</dd>
							</div>
						</dl>
					) : null}

					{pending ? (
						<div
							className="grid gap-3 border border-border bg-muted/20 px-3 py-3"
							aria-live="polite"
							aria-busy="true"
						>
							<div className="h-1 overflow-hidden bg-muted">
								<div className="h-full w-1/3 animate-accept-progress bg-primary" />
							</div>
							<ol className="grid gap-2.5 m-0 list-none p-0">
								{ACCEPT_STEPS.map((key, index) => {
									const done = index < stepIndex;
									const active = index === stepIndex;
									return (
										<li
											key={key}
											className={cn(
												"flex items-center gap-2.5 text-sm",
												done && "text-foreground",
												active && "font-medium text-foreground",
												!done && !active && "text-muted-foreground",
											)}
										>
											<span
												className={cn(
													"flex size-5 shrink-0 items-center justify-center",
													done && "text-primary",
													active && "text-primary",
												)}
												aria-hidden
											>
												{done ? (
													<Check className="size-4" strokeWidth={2.5} />
												) : active ? (
													<Loader2 className="size-4 animate-spin" />
												) : (
													<span className="size-1.5 rounded-full bg-muted-foreground/40" />
												)}
											</span>
											<span>{t(key)}</span>
										</li>
									);
								})}
							</ol>
							<p className="m-0 text-xs text-muted-foreground">
								{t("applications.acceptSubmittingHint")}
							</p>
						</div>
					) : null}

					{errorKey ? (
						<p className="error-banner m-0" role="alert">
							{partialUsername
								? t(errorKey, { username: partialUsername })
								: t(errorKey)}
						</p>
					) : null}

					{success ? (
						<>
							<output className="m-0 block border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
								{t("applications.acceptSuccess", {
									username: success.username,
								})}
								{!success.emailSent
									? ` ${t("onboarding.create.successNoEmail")}`
									: null}
							</output>
							{sepaAlertKey ? (
								<p className="error-banner m-0" role="alert">
									{t(sepaAlertKey)}
								</p>
							) : null}
						</>
					) : null}
				</div>

				<DialogFooter>
					{success ? (
						<Button type="button" onClick={() => onOpenChange(false)}>
							{t("applications.acceptDone")}
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="secondary"
								onClick={() => onOpenChange(false)}
								disabled={pending}
							>
								{t("applications.acceptCancel")}
							</Button>
							<Button type="button" onClick={onConfirm} disabled={pending}>
								{pending ? (
									<>
										<Loader2 className="size-4 animate-spin" aria-hidden />
										{t(
											ACCEPT_STEPS[stepIndex] ??
												"applications.acceptSubmitting",
										)}
									</>
								) : (
									t("applications.acceptConfirm")
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
