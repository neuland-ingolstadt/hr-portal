import { createFileRoute } from "@tanstack/react-router";
import { FileCheck2 } from "lucide-react";
import { ComingSoonPage } from "#/components/layout/coming-soon-page";

export const Route = createFileRoute("/_app/applications")({
	component: ApplicationsPage,
});

function ApplicationsPage() {
	return (
		<ComingSoonPage
			eyebrowKey="applications.eyebrow"
			titleKey="applications.title"
			leadKey="applications.lead"
			icon={FileCheck2}
			bullets={[
				"applications.bulletReview",
				"applications.bulletDecide",
				"applications.bulletNotify",
				"applications.bulletHistory",
			]}
		/>
	);
}
