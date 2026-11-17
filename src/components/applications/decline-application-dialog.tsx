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
	DeclineApplicationError,
	PendingApplication,
} from "#/lib/applications";
import {
	DECLINE_REASON_MAX_LENGTH,
	DECLINE_REASON_MIN_LENGTH,
	normalizeDeclineReason,
} from "#/lib/applications";
import { declineApplicationFn } from "#/lib/applications.functions";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";

const ERROR_KEYS: Record<DeclineApplicationError, MessageKey> = {
	invalid_input: "applications.errorDeclineReason",
	easyverein_api_missing: "applications.errorApiMissing",
	easyverein_not_found: "applications.errorNotFound",
	easyverein_not_pending: "applications.errorNotPending",
	easyverein_decline_failed: "applications.errorDeclineFailed",
};

type DeclineApplicationDialogProps = {
	application: PendingApplication | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDeclined: () => void;
};

export function DeclineApplicationDialog({
	application,
	open,
	onOpenChange,
	onDeclined,
}: DeclineApplicationDialogProps) {
	const { t } = useI18n();
	const [reason, setReason] = useState("");
	const [pending, setPending] = useState(false);
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		if (!open) return;
		setReason("");
		setPending(false);
		setErrorKey(null);
		setSuccess(false);
	}, [open]);

	async function onConfirm() {
		if (!application) return;
		const normalized = normalizeDeclineReason(reason);
		if (!normalized) {
			setErrorKey("applications.errorDeclineReason");
			return;
		}

		setPending(true);
		setErrorKey(null);
		setSuccess(false);

		try {
			const result = await declineApplicationFn({
				data: { memberId: application.id, reason: normalized },
			});
			if (!result.success) {
				setErrorKey(ERROR_KEYS[result.error]);
				return;
			}
			setSuccess(true);
			onDeclined();
		} catch {
			setErrorKey("applications.errorDeclineFailed");
		} finally {
			setPending(false);
		}
	}

	const reasonOk = normalizeDeclineReason(reason) != null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md" showClose={!pending}>
				<DialogHeader>
					<DialogTitle>{t("applications.declineTitle")}</DialogTitle>
					<DialogDescription>{t("applications.declineLead")}</DialogDescription>
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
									{application.email || "-"}
								</dd>
							</div>
						</dl>
					) : null}

					{success ? (
						<output className="m-0 block border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
							{t("applications.declineSuccess")}
						</output>
					) : (
						<label className="grid gap-1.5 text-sm">
							<span className="font-medium text-foreground">
								{t("applications.declineReasonLabel")}
							</span>
							<textarea
								value={reason}
								onChange={(event) => setReason(event.target.value)}
								placeholder={t("applications.declineReasonPlaceholder")}
								rows={3}
								maxLength={DECLINE_REASON_MAX_LENGTH}
								disabled={pending}
								className="min-h-[5.5rem] w-full resize-y border border-border bg-background px-3 py-2 font-sans text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
								aria-invalid={errorKey === "applications.errorDeclineReason"}
							/>
							<span className="text-xs text-muted-foreground">
								{reason.trim().length}/{DECLINE_REASON_MAX_LENGTH} · min{" "}
								{DECLINE_REASON_MIN_LENGTH}
							</span>
						</label>
					)}

					{errorKey ? (
						<p className="error-banner m-0" role="alert">
							{t(errorKey)}
						</p>
					) : null}
				</div>

				<DialogFooter>
					{success ? (
						<Button type="button" onClick={() => onOpenChange(false)}>
							{t("applications.declineDone")}
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="secondary"
								onClick={() => onOpenChange(false)}
								disabled={pending}
							>
								{t("applications.declineCancel")}
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={onConfirm}
								disabled={pending || !reasonOk}
							>
								{pending ? (
									<>
										<Loader2 className="size-4 animate-spin" aria-hidden />
										{t("applications.declineSubmitting")}
									</>
								) : (
									t("applications.declineConfirm")
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
