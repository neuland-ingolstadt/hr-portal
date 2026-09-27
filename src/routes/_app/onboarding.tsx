import { createFileRoute } from "@tanstack/react-router";
import { CreateMemberForm } from "#/components/onboarding/create-member-form";
import { useI18n } from "#/lib/i18n/locale-context";

export const Route = createFileRoute("/_app/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	const { t } = useI18n();

	return (
		<>
			<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0 space-y-2">
					<p className="eyebrow mb-0">{t("onboarding.eyebrow")}</p>
					<h1 className="page-title text-balance">{t("onboarding.title")}</h1>
					<p className="page-lead max-w-2xl">{t("onboarding.leadLive")}</p>
				</div>
			</header>

			<div className="space-y-8">
				<CreateMemberForm />

				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{(
						[
							"onboarding.bulletChecklist",
							"onboarding.bulletWelcome",
							"onboarding.bulletTrack",
						] as const
					).map((key) => (
						<div
							key={key}
							className="surface-panel border-dashed p-4 text-sm text-muted-foreground"
						>
							<span className="mb-2 inline-block border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold tracking-wide uppercase">
								{t("home.soon")}
							</span>
							<p>{t(key)}</p>
						</div>
					))}
				</section>
			</div>
		</>
	);
}
