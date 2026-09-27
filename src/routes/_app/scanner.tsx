import { createFileRoute } from "@tanstack/react-router";
import { MemberIdScanner } from "#/components/scanner/member-id-scanner";
import { useI18n } from "#/lib/i18n/locale-context";

export const Route = createFileRoute("/_app/scanner")({
	component: ScannerPage,
});

function ScannerPage() {
	const { t } = useI18n();

	return (
		<>
			<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0 space-y-2">
					<p className="eyebrow mb-0">{t("scanner.eyebrow")}</p>
					<h1 className="page-title text-balance">{t("scanner.title")}</h1>
					<p className="page-lead max-w-2xl">{t("scanner.lead")}</p>
				</div>
			</header>
			<MemberIdScanner />
		</>
	);
}
