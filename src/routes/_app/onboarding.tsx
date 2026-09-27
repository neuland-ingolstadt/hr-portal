import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { ComingSoonPage } from "#/components/layout/coming-soon-page";

export const Route = createFileRoute("/_app/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	return (
		<ComingSoonPage
			eyebrowKey="onboarding.eyebrow"
			titleKey="onboarding.title"
			leadKey="onboarding.lead"
			icon={ClipboardList}
			bullets={[
				"onboarding.bulletChecklist",
				"onboarding.bulletAccess",
				"onboarding.bulletWelcome",
				"onboarding.bulletTrack",
			]}
		/>
	);
}
