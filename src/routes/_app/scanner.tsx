import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/layout/page-header";
import { MemberIdScanner } from "#/components/scanner/member-id-scanner";
import { useI18n } from "#/lib/i18n/locale-context";

export const Route = createFileRoute("/_app/scanner")({
	component: ScannerPage,
});

function ScannerPage() {
	const { t } = useI18n();

	return (
		<>
			<PageHeader
				eyebrow={t("scanner.eyebrow")}
				title={t("scanner.title")}
				lead={t("scanner.lead")}
			/>
			<MemberIdScanner />
		</>
	);
}
