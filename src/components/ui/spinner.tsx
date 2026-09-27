import { useEffect, useState } from "react";
import { NeulandPalm } from "#/components/brand/neuland-palm";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

type SpinnerProps = {
	label: string;
	className?: string;
};

const FUNNY_KEYS = [
	"spinner.fun.1",
	"spinner.fun.2",
	"spinner.fun.3",
	"spinner.fun.4",
	"spinner.fun.5",
	"spinner.fun.6",
] as const satisfies readonly MessageKey[];

export function Spinner({ label, className }: SpinnerProps) {
	const { t } = useI18n();
	const [index, setIndex] = useState(0);

	useEffect(() => {
		setIndex(Math.floor(Math.random() * FUNNY_KEYS.length));
		const id = window.setInterval(() => {
			setIndex((current) => (current + 1) % FUNNY_KEYS.length);
		}, 2600);
		return () => window.clearInterval(id);
	}, []);

	return (
		<output
			className={cn(
				"flex w-full flex-col items-center justify-center gap-3 p-8",
				className,
			)}
			aria-live="polite"
			aria-busy="true"
			aria-label={label}
		>
			<NeulandPalm
				className="h-10 w-auto text-primary"
				aria-hidden
				role="presentation"
			/>
			<p
				key={index}
				className="m-0 animate-[fade-up_280ms_ease-out] text-center text-sm text-muted-foreground"
			>
				{t(FUNNY_KEYS[index] ?? "spinner.fun.1")}
			</p>
		</output>
	);
}
