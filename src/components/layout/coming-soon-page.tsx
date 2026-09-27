import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";

type ComingSoonPageProps = {
	eyebrowKey: MessageKey;
	titleKey: MessageKey;
	leadKey: MessageKey;
	icon: LucideIcon;
	bullets?: MessageKey[];
};

export function ComingSoonPage({
	eyebrowKey,
	titleKey,
	leadKey,
	icon: Icon,
	bullets = [],
}: ComingSoonPageProps) {
	const { t } = useI18n();

	return (
		<>
			<header className="page-header flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="min-w-0 space-y-2">
					<p className="eyebrow mb-0">{t(eyebrowKey)}</p>
					<h1 className="page-title text-balance">{t(titleKey)}</h1>
					<p className="page-lead max-w-2xl">{t(leadKey)}</p>
				</div>
				<span className="shrink-0 border border-border bg-muted px-2.5 py-1 font-mono text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:mb-1">
					{t("home.soon")}
				</span>
			</header>

			<section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
				<div className="surface-panel relative overflow-hidden p-5 sm:p-7">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_100%_0%,color-mix(in_oklab,hsl(var(--primary))_12%,transparent),transparent_55%)]"
					/>
					<div className="relative flex flex-col gap-5">
						<span className="flex size-12 items-center justify-center border border-border bg-muted text-primary">
							<Icon className="size-6" aria-hidden />
						</span>
						<div className="space-y-2">
							<h2 className="text-lg font-semibold tracking-tight">
								{t("comingSoon.workspaceTitle")}
							</h2>
							<p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
								{t("comingSoon.workspaceLead")}
							</p>
						</div>

						{bullets.length > 0 ? (
							<ul className="grid gap-2 sm:grid-cols-2">
								{bullets.map((key) => (
									<li
										key={key}
										className="border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground"
									>
										{t(key)}
									</li>
								))}
							</ul>
						) : null}
					</div>
				</div>

				<aside className="surface-panel flex flex-col gap-4 p-5 sm:p-6">
					<p className="text-xs font-medium tracking-wide text-muted-foreground">
						{t("comingSoon.preview")}
					</p>
					<div className="space-y-2" aria-hidden>
						<SkeletonRow wide />
						<SkeletonRow />
						<SkeletonRow mid />
						<div className="my-2 border-t border-border" />
						<SkeletonRow />
						<SkeletonRow mid />
						<SkeletonRow wide />
					</div>
					<p className="mt-auto text-xs leading-relaxed text-muted-foreground">
						{t("comingSoon.hint")}
					</p>
				</aside>
			</section>
		</>
	);
}

function SkeletonRow({
	wide,
	mid,
}: {
	wide?: boolean;
	mid?: boolean;
}): ReactNode {
	return (
		<div
			className={
				wide
					? "h-2.5 w-full bg-muted"
					: mid
						? "h-2.5 w-2/3 bg-muted/80"
						: "h-2.5 w-4/5 bg-muted/70"
			}
		/>
	);
}
