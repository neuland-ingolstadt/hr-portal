import { Loader2 } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { WelcomeEmailPreviewButton } from "#/components/onboarding/welcome-email-preview";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import type { CreateMemberError } from "#/lib/onboarding";
import { createMemberFn } from "#/lib/onboarding.functions";

const ERROR_KEYS: Record<CreateMemberError, MessageKey> = {
	unauthorized: "onboarding.create.errorUnauthorized",
	invalid_input: "onboarding.create.errorInvalid",
	authentik_api_missing: "onboarding.create.errorApiMissing",
	username_exists: "onboarding.create.errorUsernameExists",
	create_failed: "onboarding.create.errorFailed",
};

export function CreateMemberForm() {
	const { t } = useI18n();
	const firstNameId = useId();
	const lastNameId = useId();
	const emailId = useId();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [pending, setPending] = useState(false);
	const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
	const [success, setSuccess] = useState<{
		username: string;
		emailSent: boolean;
	} | null>(null);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setPending(true);
		setErrorKey(null);
		setSuccess(null);

		try {
			const result = await createMemberFn({
				data: { firstName, lastName, email },
			});

			if (!result.success) {
				setErrorKey(ERROR_KEYS[result.error]);
				return;
			}

			setSuccess({
				username: result.username,
				emailSent: result.emailSent,
			});
			setFirstName("");
			setLastName("");
			setEmail("");
		} catch {
			setErrorKey("onboarding.create.errorFailed");
		} finally {
			setPending(false);
		}
	}

	function onReset() {
		setFirstName("");
		setLastName("");
		setEmail("");
		setErrorKey(null);
		setSuccess(null);
	}

	return (
		<section className="surface-panel space-y-5 p-5 sm:p-6">
			<div className="space-y-1">
				<h2 className="text-base font-semibold tracking-tight">
					{t("onboarding.create.title")}
				</h2>
				<p className="max-w-2xl text-sm text-muted-foreground">
					{t("onboarding.create.lead")}
				</p>
			</div>

			<form onSubmit={onSubmit} className="grid max-w-xl gap-4" noValidate>
				<div className="grid gap-1.5">
					<label htmlFor={firstNameId} className="text-sm font-medium">
						{t("onboarding.create.firstName")}
					</label>
					<Input
						id={firstNameId}
						name="firstName"
						autoComplete="given-name"
						placeholder={t("onboarding.create.firstNamePlaceholder")}
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						required
						disabled={pending}
					/>
				</div>

				<div className="grid gap-1.5">
					<label htmlFor={lastNameId} className="text-sm font-medium">
						{t("onboarding.create.lastName")}
					</label>
					<Input
						id={lastNameId}
						name="lastName"
						autoComplete="family-name"
						placeholder={t("onboarding.create.lastNamePlaceholder")}
						value={lastName}
						onChange={(event) => setLastName(event.target.value)}
						required
						disabled={pending}
					/>
				</div>

				<div className="grid gap-1.5">
					<label htmlFor={emailId} className="text-sm font-medium">
						{t("onboarding.create.email")}
					</label>
					<Input
						id={emailId}
						name="email"
						type="email"
						autoComplete="email"
						placeholder={t("onboarding.create.emailPlaceholder")}
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
						disabled={pending}
					/>
				</div>

				{errorKey ? (
					<p className="error-banner m-0" role="alert">
						{t(errorKey)}
					</p>
				) : null}

				{success ? (
					<output className="m-0 block border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
						{t("onboarding.create.success", { username: success.username })}
						{!success.emailSent
							? ` ${t("onboarding.create.successNoEmail")}`
							: null}
					</output>
				) : null}

				<div className="flex flex-wrap gap-3 pt-1">
					<Button type="submit" disabled={pending}>
						{pending ? (
							<>
								<Loader2 className="size-4 animate-spin" aria-hidden />
								{t("onboarding.create.submitting")}
							</>
						) : (
							t("onboarding.create.submit")
						)}
					</Button>
					<Button
						type="button"
						variant="secondary"
						onClick={onReset}
						disabled={pending}
					>
						{t("onboarding.create.reset")}
					</Button>
					<WelcomeEmailPreviewButton disabled={pending} />
				</div>
			</form>
		</section>
	);
}
