import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import { otherLocale } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

export function LanguageToggle({
	className,
	size = "icon-sm",
}: {
	className?: string;
	size?: "sm" | "icon-sm";
}) {
	const { locale, toggleLocale, t } = useI18n();
	const next = otherLocale(locale);

	return (
		<Button
			type="button"
			variant="outline"
			size={size}
			onClick={toggleLocale}
			aria-label={`${t("header.language")}: ${t(`header.language.${next}`)}`}
			title={t(`header.language.${next}`)}
			className={cn("font-mono text-[11px] tracking-wide", className)}
		>
			{next.toUpperCase()}
		</Button>
	);
}
