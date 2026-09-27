import { Button } from "#/components/ui/button";
import { useI18n } from "#/lib/i18n/locale-context";
import { otherLocale } from "#/lib/i18n/messages";

export function LanguageToggle() {
	const { locale, toggleLocale, t } = useI18n();
	const next = otherLocale(locale);

	return (
		<Button
			type="button"
			variant="outline"
			size="icon-sm"
			onClick={toggleLocale}
			aria-label={`${t("header.language")}: ${t(`header.language.${next}`)}`}
			title={t(`header.language.${next}`)}
			className="font-mono text-[11px] tracking-wide"
		>
			{next.toUpperCase()}
		</Button>
	);
}
