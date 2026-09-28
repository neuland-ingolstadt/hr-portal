import { Loader2, Trash2 } from "lucide-react";
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
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type {
	DeleteAccountError,
	OffboardingCandidate,
} from "#/lib/offboarding";
import { daysSinceMembershipRevoked } from "#/lib/offboarding";
import { deleteAccountFn } from "#/lib/offboarding.functions";

const ERROR_KEYS: Record<DeleteAccountError, MessageKey> = {
	invalid_id: "offboarding.errorInvalid",
	not_eligible: "offboarding.errorNotEligible",
	authentik_api_missing: "offboarding.errorApiMissing",
	user_not_found: "offboarding.errorUserNotFound",
	delete_failed: "offboarding.errorDeleteFailed",
};

type DeleteAccountDialogProps = {
	candidate: OffboardingCandidate | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onDone: () => void;
};

export function DeleteAccountDialog({
	candidate,
	open,
	onOpenChange,
	onDone,
}: DeleteAccountDialogProps) {
	const { t } = useI18n();
	const [pending, setPending] = useState(false);
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
	const [successName, setSuccessName] = useState<string | null>(null);

	useEffect(() => {
		if (!open) return;
		setPending(false);
		setErrorKey(null);
		setSuccessName(null);
	}, [open]);

	async function onConfirm() {
		if (!candidate) return;
		setPending(true);
		setErrorKey(null);
		setSuccessName(null);

		try {
			const result = await deleteAccountFn({
				data: { memberId: candidate.id },
			});
			if (!result.success) {
				setErrorKey(ERROR_KEYS[result.error]);
				return;
			}
			setSuccessName(result.name);
			onDone();
		} catch {
			setErrorKey("offboarding.errorDeleteFailed");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg" showClose={!pending}>
				<DialogHeader>
					<DialogTitle>{t("offboarding.delete.title")}</DialogTitle>
					<DialogDescription>{t("offboarding.delete.lead")}</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 px-5 py-4">
					{candidate ? (
						<div className="grid gap-3">
							<div className="border border-border bg-muted/30 px-3 py-2.5">
								<p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									{t("members.colName")}
								</p>
								<p className="mt-0.5 font-medium text-foreground">
									{candidate.name}
								</p>
								{(() => {
									const days = daysSinceMembershipRevoked(
										candidate.membershipRevokedAt,
									);
									if (days == null) return null;
									const label =
										days === 0
											? t("offboarding.revokedToday")
											: days === 1
												? t("offboarding.revokedOneDayAgo")
												: t("offboarding.revokedDaysAgo", {
														days: String(days),
													});
									return (
										<p className="mt-1 text-sm text-muted-foreground">
											{t("offboarding.colRevoked")}: {label}
										</p>
									);
								})()}
							</div>

							<div className="border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-foreground">
								<p className="font-semibold text-destructive">
									{t("offboarding.delete.calloutTitle")}
								</p>
								<p className="mt-1 text-muted-foreground">
									{t("offboarding.delete.calloutBody")}
								</p>
							</div>

							<ul className="grid gap-1.5 text-sm text-muted-foreground">
								<li>• {t("offboarding.delete.bulletPermanent")}</li>
								<li>• {t("offboarding.delete.bulletLogin")}</li>
							</ul>
						</div>
					) : null}

					{errorKey ? (
						<p className="error-banner m-0" role="alert">
							{t(errorKey)}
						</p>
					) : null}

					{successName ? (
						<output className="m-0 block border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
							{t("offboarding.delete.success", { name: successName })}
						</output>
					) : null}
				</div>

				<DialogFooter>
					{successName ? (
						<Button type="button" onClick={() => onOpenChange(false)}>
							{t("offboarding.dialogDone")}
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="secondary"
								onClick={() => onOpenChange(false)}
								disabled={pending}
							>
								{t("offboarding.dialogCancel")}
							</Button>
							<Button
								type="button"
								variant="destructive"
								onClick={onConfirm}
								disabled={pending}
							>
								{pending ? (
									<>
										<Loader2 className="size-4 animate-spin" aria-hidden />
										{t("offboarding.delete.submitting")}
									</>
								) : (
									<>
										<Trash2 className="size-4" aria-hidden />
										{t("offboarding.delete.confirm")}
									</>
								)}
							</Button>
						</>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
