import { Loader2 } from "lucide-react";
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
} from "#/lib/applications";
import { acceptApplicationFn } from "#/lib/applications.functions";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";

const ERROR_KEYS: Record<AcceptApplicationError, MessageKey> = {
	unauthorized: "onboarding.create.errorUnauthorized",
	invalid_input: "onboarding.create.errorInvalid",
	authentik_api_missing: "onboarding.create.errorApiMissing",
	username_exists: "onboarding.create.errorUsernameExists",
	create_failed: "onboarding.create.errorFailed",
	easyverein_api_missing: "applications.errorApiMissing",
	easyverein_not_found: "applications.errorNotFound",
	easyverein_not_pending: "applications.errorNotPending",
	easyverein_accept_failed: "applications.errorAcceptPartial",
};

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
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
	const [partialUsername, setPartialUsername] = useState<string | null>(null);
	const [success, setSuccess] = useState<{
		username: string;
		emailSent: boolean;
	} | null>(null);

	useEffect(() => {
		if (!open) return;
		setErrorKey(null);
		setPartialUsername(null);
		setSuccess(null);
		setPending(false);
	}, [open]);

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

			setSuccess({
				username: result.username,
				emailSent: result.emailSent,
			});
			onAccepted();
		} catch {
			setErrorKey("applications.errorAcceptFailed");
		} finally {
			setPending(false);
		}
	}

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

					{errorKey ? (
						<p className="error-banner m-0" role="alert">
							{partialUsername
								? t(errorKey, { username: partialUsername })
								: t(errorKey)}
						</p>
					) : null}

					{success ? (
						<output className="m-0 block border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
							{t("applications.acceptSuccess", {
								username: success.username,
							})}
							{!success.emailSent
								? ` ${t("onboarding.create.successNoEmail")}`
								: null}
						</output>
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
										{t("applications.acceptSubmitting")}
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
