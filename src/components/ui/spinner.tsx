import { Loader2 } from "lucide-react";
import { cn } from "#/lib/utils";

type SpinnerProps = {
	label: string;
	className?: string;
};

export function Spinner({ label, className }: SpinnerProps) {
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
			<Loader2
				className="size-6 animate-spin text-muted-foreground"
				aria-hidden
			/>
			<p className="m-0 text-sm text-muted-foreground">{label}</p>
		</output>
	);
}
