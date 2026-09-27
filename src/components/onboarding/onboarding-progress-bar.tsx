import { useI18n } from "#/lib/i18n/locale-context";
import {
	ONBOARDING_STAGE_LABEL_KEYS,
	ONBOARDING_STAGE_MAX,
	type OnboardingStage,
} from "#/lib/onboarding";
import { cn } from "#/lib/utils";

type OnboardingProgressBarProps = {
	stage: OnboardingStage;
	/** Show stage label next to / under the bar. Default true. */
	showLabel?: boolean;
	className?: string;
	/** Compact variant for cards. */
	compact?: boolean;
};

export function OnboardingProgressBar({
	stage,
	showLabel = true,
	className,
	compact = false,
}: OnboardingProgressBarProps) {
	const { t } = useI18n();
	const pct = Math.round((stage / ONBOARDING_STAGE_MAX) * 100);
	const labelKey = ONBOARDING_STAGE_LABEL_KEYS[stage];

	return (
		<div className={cn("space-y-1.5", className)}>
			{showLabel ? (
				<div
					className={cn(
						"flex items-baseline justify-between gap-2",
						compact ? "text-xs" : "text-sm",
					)}
				>
					<span className="truncate text-muted-foreground">
						{t("onboarding.stage.progress")}
					</span>
					<span className="shrink-0 font-medium tracking-tight text-foreground">
						{t(labelKey)}
					</span>
				</div>
			) : null}
			<div
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={ONBOARDING_STAGE_MAX}
				aria-valuenow={stage}
				aria-label={t("onboarding.stage.progress")}
				className={cn("overflow-hidden bg-muted", compact ? "h-1" : "h-1.5")}
			>
				<div
					className="h-full bg-primary transition-[width] duration-300 ease-out"
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}
