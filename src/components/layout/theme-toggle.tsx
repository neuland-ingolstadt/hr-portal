import { Laptop, MoonStar, SunMedium } from "lucide-react";
import { useEffect } from "react";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

export function ThemeToggle({
	className,
	size = "icon-sm",
}: {
	className?: string;
	size?: "sm" | "icon-sm";
}) {
	useEffect(() => {
		document.dispatchEvent(new Event("neuland:theme-hydrate"));
	}, []);

	return (
		<Button
			type="button"
			variant="outline"
			size={size}
			data-theme-toggle
			data-theme-mode="system"
			aria-label="System-Design"
			title="System-Design"
			className={cn(className)}
		>
			<Laptop data-theme-icon="system" aria-hidden />
			<SunMedium data-theme-icon="light" className="hidden" aria-hidden />
			<MoonStar data-theme-icon="dark" className="hidden" aria-hidden />
		</Button>
	);
}
