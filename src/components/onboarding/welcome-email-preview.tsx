import { Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { useI18n } from "#/lib/i18n/locale-context";
import { previewWelcomeEmailFn } from "#/lib/onboarding.functions";

type WelcomeEmailPreviewSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export function WelcomeEmailPreviewSheet({
	open,
	onOpenChange,
}: WelcomeEmailPreviewSheetProps) {
	const { t } = useI18n();
	const [html, setHtml] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(false);

	useEffect(() => {
		if (!open) return;

		let cancelled = false;
		setLoading(true);
		setError(false);

		void previewWelcomeEmailFn()
			.then((result) => {
				if (cancelled) return;
				setHtml(result.html);
			})
			.catch(() => {
				if (cancelled) return;
				setError(true);
				setHtml(null);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [open]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full gap-0 p-0 sm:max-w-2xl"
				aria-describedby={undefined}
			>
				<SheetHeader className="border-b border-border px-5 py-4 pr-12">
					<SheetTitle>{t("onboarding.preview.title")}</SheetTitle>
					<SheetDescription>{t("onboarding.preview.lead")}</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col bg-muted/40">
					{loading ? (
						<div className="flex flex-1 items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" aria-hidden />
							{t("onboarding.preview.loading")}
						</div>
					) : null}

					{!loading && error ? (
						<p className="error-banner m-4" role="alert">
							{t("onboarding.preview.error")}
						</p>
					) : null}

					{!loading && html ? (
						<iframe
							title={t("onboarding.preview.title")}
							srcDoc={html}
							sandbox=""
							className="h-full min-h-[70dvh] w-full flex-1 border-0 bg-white"
						/>
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

type WelcomeEmailPreviewButtonProps = {
	disabled?: boolean;
};

export function WelcomeEmailPreviewButton({
	disabled,
}: WelcomeEmailPreviewButtonProps) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				type="button"
				variant="outline"
				disabled={disabled}
				onClick={() => setOpen(true)}
			>
				<Mail className="size-4" aria-hidden />
				{t("onboarding.preview.open")}
			</Button>
			<WelcomeEmailPreviewSheet open={open} onOpenChange={setOpen} />
		</>
	);
}
