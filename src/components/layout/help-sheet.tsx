import { getRouteApi, useRouterState } from "@tanstack/react-router";
import { CircleHelp, Keyboard } from "lucide-react";
import { useEffect, useState } from "react";
import { openKeyboardShortcutsHelp } from "#/components/layout/keyboard-shortcuts";
import { Button } from "#/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "#/components/ui/sheet";
import { hasElevatedAccess } from "#/lib/auth";
import { getHelpTopic, HELP_TOPICS, type HelpTopicId } from "#/lib/help";
import { useI18n } from "#/lib/i18n/locale-context";
import { cn } from "#/lib/utils";

const appRouteApi = getRouteApi("/_app");

const OPEN_HELP_EVENT = "neuland:open-help";

export function openHelpSheet() {
	window.dispatchEvent(new Event(OPEN_HELP_EVENT));
}

export function HelpTriggerButton({ className }: { className?: string }) {
	const { t } = useI18n();

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn("text-muted-foreground", className)}
			aria-label={t("help.open")}
			onClick={openHelpSheet}
		>
			<CircleHelp aria-hidden />
		</Button>
	);
}

export function HelpSheet() {
	const { t } = useI18n();
	const { user } = appRouteApi.useRouteContext();
	const elevated = hasElevatedAccess(user.roles);
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [open, setOpen] = useState(false);
	const [topicId, setTopicId] = useState<HelpTopicId>(
		() => getHelpTopic(pathname).id,
	);

	useEffect(() => {
		function onOpenHelp() {
			setTopicId(getHelpTopic(pathname).id);
			setOpen(true);
		}
		window.addEventListener(OPEN_HELP_EVENT, onOpenHelp);
		return () => window.removeEventListener(OPEN_HELP_EVENT, onOpenHelp);
	}, [pathname]);

	const topic = HELP_TOPICS[topicId];
	const overviewTopics = (
		Object.values(HELP_TOPICS) as (typeof HELP_TOPICS)[HelpTopicId][]
	).filter((item) => !item.elevatedOnly || elevated);

	function openShortcuts() {
		setOpen(false);
		window.setTimeout(() => openKeyboardShortcutsHelp(), 150);
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
				<SheetHeader className="border-b border-border px-5 py-4 pr-12">
					<p className="eyebrow mb-1">{t("help.sheetTitle")}</p>
					<SheetTitle className="font-sans text-lg font-semibold tracking-tight">
						{t(topic.titleKey)}
					</SheetTitle>
					<SheetDescription className="text-sm leading-relaxed">
						{t(topic.leadKey)}
					</SheetDescription>
				</SheetHeader>

				<div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
					<div className="flex flex-wrap gap-2">
						{overviewTopics.map((item) => {
							const active = item.id === topicId;
							return (
								<button
									key={item.id}
									type="button"
									onClick={() => setTopicId(item.id)}
									className={cn(
										"border px-2.5 py-1 font-mono text-[0.7rem] font-semibold tracking-wide transition-colors",
										active
											? "border-primary bg-primary/10 text-foreground"
											: "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
									)}
								>
									{t(item.titleKey)}
								</button>
							);
						})}
					</div>

					<p className="text-sm leading-relaxed text-foreground">
						{t(topic.introKey)}
					</p>

					<div className="space-y-5">
						{topic.sections.map((section) => (
							<section key={section.headingKey} className="space-y-2">
								<h3 className="font-sans text-sm font-semibold tracking-tight text-foreground">
									{t(section.headingKey)}
								</h3>
								<p className="text-sm leading-relaxed text-muted-foreground">
									{t(section.bodyKey)}
								</p>
							</section>
						))}
					</div>
				</div>

				<SheetFooter className="border-t border-border px-5 py-4 sm:justify-start">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={openShortcuts}
					>
						<Keyboard className="size-4" aria-hidden />
						{t("help.shortcutsCta")}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
