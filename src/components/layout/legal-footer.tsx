import { BUILD_COMMIT } from "#/lib/build-info";
import { EXTERNAL_LINKS } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

type LegalFooterProps = {
	className?: string;
};

export function LegalFooter({ className }: LegalFooterProps) {
	const { t } = useI18n();

	return (
		<footer
			className={cn(
				"page-gutter w-full min-w-0 border-t border-border/60 py-6 text-center font-mono text-xs text-foreground/45",
				className,
			)}
		>
			<nav className="flex flex-wrap items-center justify-center gap-4">
				<a
					href={EXTERNAL_LINKS.WEBSITE_IMPRESSUM}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors hover:text-foreground"
				>
					{t("footer.imprint")}
				</a>
				<span aria-hidden="true" className="text-border">
					|
				</span>
				<a
					href={EXTERNAL_LINKS.WEBSITE_DATENSCHUTZ}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors hover:text-foreground"
				>
					{t("footer.privacy")}
				</a>
				<span aria-hidden="true" className="text-border">
					|
				</span>
				<a
					href={EXTERNAL_LINKS.WEBSITE}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors hover:text-foreground"
				>
					neuland-ingolstadt.de
				</a>
			</nav>
			<p className="mt-3">
				{t("footer.build")}:{" "}
				<span className="rounded border border-border/80 px-1.5 py-0.5 font-mono text-foreground/60">
					{BUILD_COMMIT}
				</span>
			</p>
			<p className="mt-2">
				{t("footer.copyright")}
				<br />
				{t("footer.by")}{" "}
				<a
					href={EXTERNAL_LINKS.EGGL_DEV}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors hover:text-foreground"
				>
					Robert Eggl
				</a>{" "}
				{t("footer.and")}{" "}
				<a
					href={EXTERNAL_LINKS.WEBSITE}
					target="_blank"
					rel="noopener noreferrer"
					className="transition-colors hover:text-foreground"
				>
					Neuland Ingolstadt e.V.
				</a>
			</p>
		</footer>
	);
}
