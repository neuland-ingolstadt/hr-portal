import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "#/lib/utils";

const badgeVariants = cva(
	"inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap border px-2 py-0.5 text-[0.7rem] font-medium tracking-wide",
	{
		variants: {
			variant: {
				default: "border-primary/35 bg-primary/10 text-primary",
				hr: "border-primary/40 bg-primary/12 text-primary",
				vorstand:
					"border-[color:var(--badge-vorstand-border)] bg-[image:var(--badge-vorstand-bg)] text-[color:var(--badge-vorstand-text)]",
				ressort:
					"border-[color:var(--badge-ressort-border)] bg-[color:var(--badge-ressort-bg)] text-[color:var(--badge-ressort-text)]",
				muted: "border-border/80 bg-muted/70 text-muted-foreground",
				destructive: "border-destructive/40 bg-destructive/10 text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

export interface BadgeProps
	extends React.HTMLAttributes<HTMLSpanElement>,
		VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
	return (
		<span className={cn(badgeVariants({ variant }), className)} {...props} />
	);
}

export { Badge, badgeVariants };
