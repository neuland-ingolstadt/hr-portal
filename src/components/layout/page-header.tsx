import {
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import { HelpTriggerButton } from "#/components/layout/help-sheet";
import { cn } from "#/lib/utils";

const MOBILE_TOP_OFFSET_PX = 56; // matches app-shell mobile bar (h-14)

function usePageTitleStuck(titleRef: RefObject<HTMLElement | null>): boolean {
	const [stuck, setStuck] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(min-width: 768px)");
		let observer: IntersectionObserver | undefined;

		function setup() {
			const el = titleRef.current;
			if (!el) return;

			observer?.disconnect();
			const topOffset = mq.matches ? 0 : MOBILE_TOP_OFFSET_PX;
			observer = new IntersectionObserver(
				([entry]) => {
					if (!entry) return;
					setStuck(!entry.isIntersecting);
				},
				{
					rootMargin: `-${topOffset + 1}px 0px 0px 0px`,
					threshold: 0,
				},
			);
			observer.observe(el);
		}

		setup();
		mq.addEventListener("change", setup);
		return () => {
			mq.removeEventListener("change", setup);
			observer?.disconnect();
		};
	}, [titleRef]);

	return stuck;
}

type StickyPageTitleBarProps = {
	title: string;
	stuck: boolean;
};

/** Compact title strip that pins under the mobile nav / at the top on desktop. */
export function StickyPageTitleBar({ title, stuck }: StickyPageTitleBarProps) {
	return (
		<div
			className={cn(
				"page-title-sticky pointer-events-auto",
				stuck
					? "translate-y-0 opacity-100"
					: "pointer-events-none -translate-y-2.5 opacity-0",
			)}
			aria-hidden={!stuck}
		>
			<div className="relative mx-auto flex h-14 w-full min-w-0 max-w-[92rem] items-center justify-between gap-3">
				<p className="min-w-0 truncate font-sans text-sm font-semibold tracking-tight text-foreground sm:text-[0.95rem]">
					{title}
				</p>
				{stuck ? <HelpTriggerButton className="shrink-0" /> : null}
			</div>
		</div>
	);
}

type PageHeaderProps = {
	eyebrow: ReactNode;
	title: string;
	lead?: ReactNode;
	end?: ReactNode;
	className?: string;
};

/**
 * Standard page chrome: large in-flow header plus a compact sticky title
 * that appears once the main heading leaves the viewport.
 */
export function PageHeader({
	eyebrow,
	title,
	lead,
	end,
	className,
}: PageHeaderProps) {
	const titleRef = useRef<HTMLHeadingElement>(null);
	const stuck = usePageTitleStuck(titleRef);

	return (
		<>
			<StickyPageTitleBar title={title} stuck={stuck} />
			<header
				className={cn(
					"page-header flex flex-row items-start justify-between gap-3 sm:items-end",
					className,
				)}
			>
				<div className="min-w-0 flex-1 space-y-2">
					{eyebrow ? <p className="eyebrow mb-0">{eyebrow}</p> : null}
					<h1 ref={titleRef} className="page-title text-balance">
						{title}
					</h1>
					{lead ? (
						typeof lead === "string" ? (
							<p className="page-lead max-w-2xl">{lead}</p>
						) : (
							<div className="page-lead max-w-2xl">{lead}</div>
						)
					) : null}
				</div>
				<div className="flex shrink-0 flex-wrap items-center gap-3 sm:pb-1">
					<HelpTriggerButton />
					{end}
				</div>
			</header>
		</>
	);
}

type StickyPageTitleProps = {
	title: string;
	children: (titleRef: RefObject<HTMLHeadingElement | null>) => ReactNode;
};

/** For custom layouts (e.g. home hero) that still want the compact sticky title. */
export function StickyPageTitle({ title, children }: StickyPageTitleProps) {
	const titleRef = useRef<HTMLHeadingElement>(null);
	const stuck = usePageTitleStuck(titleRef);

	return (
		<>
			<StickyPageTitleBar title={title} stuck={stuck} />
			{children(titleRef)}
		</>
	);
}
