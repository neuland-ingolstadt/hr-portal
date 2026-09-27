import { useI18n } from "#/lib/i18n/locale-context";
import {
	ONBOARDING_STAGE_LABEL_KEYS,
	ONBOARDING_STAGE_MAX,
	ONBOARDING_STAGES,
	type OnboardingStage,
} from "#/lib/onboarding";
import { cn } from "#/lib/utils";

type OnboardingStageSliderProps = {
	value: OnboardingStage;
	onChange: (stage: OnboardingStage) => void;
	disabled?: boolean;
	className?: string;
};

export function OnboardingStageSlider({
	value,
	onChange,
	disabled = false,
	className,
}: OnboardingStageSliderProps) {
	const { t } = useI18n();
	const pct = (value / ONBOARDING_STAGE_MAX) * 100;

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex items-baseline justify-between gap-2">
				<span className="text-sm text-muted-foreground">
					{t("onboarding.stage.progress")}
				</span>
				<span className="font-medium tracking-tight text-foreground">
					{t(ONBOARDING_STAGE_LABEL_KEYS[value])}
				</span>
			</div>

			<div
				role="radiogroup"
				aria-label={t("profile.onboarding")}
				aria-disabled={disabled || undefined}
				className="space-y-2"
			>
				{/* Track + step markers */}
				<div className="relative flex h-5 items-center">
					<div aria-hidden className="absolute inset-x-2.5 h-1.5 bg-muted">
						<div
							className="h-full bg-primary transition-[width] duration-200 ease-out"
							style={{ width: `${pct}%` }}
						/>
					</div>

					<ol className="relative z-10 grid w-full grid-cols-5">
						{ONBOARDING_STAGES.map((step) => {
							const reached = step <= value;
							const active = step === value;
							return (
								<li key={step} className="flex justify-center">
									{/* biome-ignore lint/a11y/useSemanticElements: custom radio look for stepped track */}
									<button
										type="button"
										role="radio"
										aria-checked={active}
										disabled={disabled}
										aria-label={`${step}: ${t(ONBOARDING_STAGE_LABEL_KEYS[step])}`}
										onClick={() => onChange(step)}
										className={cn(
											"flex size-5 items-center justify-center border-2 transition-colors",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
											reached
												? "border-primary bg-primary text-primary-foreground"
												: "border-border bg-card text-muted-foreground hover:border-primary/50",
											active && "ring-2 ring-primary/25",
											disabled && "cursor-not-allowed opacity-60",
										)}
									>
										<span className="font-mono text-[10px] font-semibold leading-none">
											{step}
										</span>
									</button>
								</li>
							);
						})}
					</ol>
				</div>

				{/* Step labels */}
				<ol className="grid grid-cols-5 gap-1">
					{ONBOARDING_STAGES.map((step) => {
						const active = step === value;
						return (
							<li
								key={step}
								className={cn(
									"text-center text-[11px] leading-snug",
									active
										? "font-medium text-foreground"
										: "text-muted-foreground",
								)}
							>
								{t(ONBOARDING_STAGE_LABEL_KEYS[step])}
							</li>
						);
					})}
				</ol>
			</div>
		</div>
	);
}
