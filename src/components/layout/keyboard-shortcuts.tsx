import { getRouteApi, useRouter } from "@tanstack/react-router";
import { Keyboard } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { hasElevatedAccess } from "#/lib/auth";
import { ROUTES } from "#/lib/constants";
import { useI18n } from "#/lib/i18n/locale-context";
import type { MessageKey } from "#/lib/i18n/messages";
import { cn } from "#/lib/utils";

const GO_TIMEOUT_MS = 1000;

const GO_TARGETS: Record<string, string> = {
	s: ROUTES.HOME, // Startseite
	m: ROUTES.MEMBERS, // Mitglieder
	q: ROUTES.SCANNER, // QR / Scanner
	e: ROUTES.ONBOARDING, // Eintritt
	a: ROUTES.OFFBOARDING, // Austritt (elevated)
	v: ROUTES.AUDIT, // Verlauf / audit (elevated)
};

const ELEVATED_GO_KEYS = new Set(["a", "v"]);

const appRouteApi = getRouteApi("/_app");

type ShortcutRow = {
	keys: readonly string[];
	labelKey: MessageKey;
};

const GENERAL_SHORTCUTS: ShortcutRow[] = [
	{ keys: ["f"], labelKey: "shortcuts.focusSearch" }, // Finden
	{ keys: ["#"], labelKey: "shortcuts.toggleSidebar" }, // DE: eigene Taste
	{ keys: ["?"], labelKey: "shortcuts.showHelp" }, // Shift+ß
];

const GO_SHORTCUTS: ShortcutRow[] = [
	{ keys: ["g", "s"], labelKey: "nav.home" },
	{ keys: ["g", "m"], labelKey: "nav.members" },
	{ keys: ["g", "q"], labelKey: "nav.scanner" },
	{ keys: ["g", "e"], labelKey: "nav.onboarding" },
	{ keys: ["g", "a"], labelKey: "nav.offboarding" },
	{ keys: ["g", "v"], labelKey: "nav.audit" },
];

function isModalOpen(): boolean {
	return Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
}

function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	if (target.isContentEditable) return true;
	const tag = target.tagName;
	if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
	return Boolean(target.closest("[contenteditable='true']"));
}

function focusPageSearch(): boolean {
	const el = document.querySelector<HTMLInputElement>(
		"[data-shortcut='search']",
	);
	if (!el || el.disabled) return false;
	el.focus();
	el.select();
	return true;
}

function Kbd({ children }: { children: string }) {
	return (
		<kbd className="inline-flex min-w-6 items-center justify-center border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] font-medium text-foreground">
			{children}
		</kbd>
	);
}

function ShortcutKeys({ keys }: { keys: readonly string[] }) {
	return (
		<span className="inline-flex items-center gap-1">
			{keys.map((key) => (
				<Kbd key={key}>{key}</Kbd>
			))}
		</span>
	);
}

type KeyboardShortcutsProps = {
	onToggleSidebar: () => void;
};

export function KeyboardShortcutsHelpButton({
	onOpen,
	className,
}: {
	onOpen: () => void;
	className?: string;
}) {
	const { t } = useI18n();

	return (
		<Button
			type="button"
			variant="ghost"
			size="icon-sm"
			className={cn("text-muted-foreground", className)}
			aria-label={t("shortcuts.showHelp")}
			onClick={onOpen}
		>
			<Keyboard aria-hidden />
		</Button>
	);
}

export function KeyboardShortcuts({ onToggleSidebar }: KeyboardShortcutsProps) {
	const { t } = useI18n();
	const router = useRouter();
	const { user } = appRouteApi.useRouteContext();
	const elevated = hasElevatedAccess(user.roles);
	const goShortcuts = useMemo(
		() =>
			GO_SHORTCUTS.filter(
				(row) => elevated || !ELEVATED_GO_KEYS.has(row.keys[1] ?? ""),
			),
		[elevated],
	);
	const [helpOpen, setHelpOpen] = useState(false);
	const awaitingGo = useRef(false);
	const goTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const clearGoPending = useCallback(() => {
		awaitingGo.current = false;
		if (goTimer.current) {
			clearTimeout(goTimer.current);
			goTimer.current = null;
		}
	}, []);

	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented) return;
			if (event.metaKey || event.ctrlKey || event.altKey) return;

			const key = event.key;

			if (helpOpen) {
				return;
			}

			if (isModalOpen()) {
				if (key === "#") {
					event.preventDefault();
					onToggleSidebar();
				}
				return;
			}
			if (isEditableTarget(event.target)) return;

			if (key === "Escape") {
				clearGoPending();
				return;
			}

			if (awaitingGo.current) {
				clearGoPending();
				const goKey = key.toLowerCase();
				if (ELEVATED_GO_KEYS.has(goKey) && !elevated) return;
				const target = GO_TARGETS[goKey];
				if (target) {
					event.preventDefault();
					void router.navigate({ to: target });
				}
				return;
			}

			if (key === "?") {
				event.preventDefault();
				window.dispatchEvent(new Event("neuland:open-help"));
				return;
			}

			if (key === "f" || key === "F") {
				if (focusPageSearch()) {
					event.preventDefault();
				}
				return;
			}

			if (key === "#") {
				event.preventDefault();
				onToggleSidebar();
				return;
			}

			if (key === "g" || key === "G") {
				event.preventDefault();
				awaitingGo.current = true;
				goTimer.current = setTimeout(clearGoPending, GO_TIMEOUT_MS);
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			clearGoPending();
		};
	}, [clearGoPending, elevated, helpOpen, onToggleSidebar, router]);

	useEffect(() => {
		function onOpenHelp() {
			setHelpOpen(true);
		}
		window.addEventListener("neuland:open-shortcuts", onOpenHelp);
		return () =>
			window.removeEventListener("neuland:open-shortcuts", onOpenHelp);
	}, []);

	return (
		<Dialog open={helpOpen} onOpenChange={setHelpOpen}>
			<DialogContent className="gap-0 p-0">
				<DialogHeader>
					<DialogTitle>{t("shortcuts.title")}</DialogTitle>
					<DialogDescription>{t("shortcuts.lead")}</DialogDescription>
				</DialogHeader>

				<div className="max-h-[min(70vh,28rem)] overflow-y-auto px-5 py-4">
					<section className="space-y-2">
						<p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							{t("shortcuts.sectionGeneral")}
						</p>
						<ul className="space-y-1.5">
							{GENERAL_SHORTCUTS.map((row) => (
								<li
									key={row.labelKey}
									className="flex items-center justify-between gap-4 py-1.5 text-sm"
								>
									<span className="text-foreground">{t(row.labelKey)}</span>
									<ShortcutKeys keys={row.keys} />
								</li>
							))}
						</ul>
					</section>

					<section className="mt-5 space-y-2">
						<p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							{t("shortcuts.sectionGo")}
						</p>
						<ul className="space-y-1.5">
							{goShortcuts.map((row) => (
								<li
									key={row.labelKey}
									className="flex items-center justify-between gap-4 py-1.5 text-sm"
								>
									<span className="text-foreground">{t(row.labelKey)}</span>
									<ShortcutKeys keys={row.keys} />
								</li>
							))}
						</ul>
					</section>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export function openKeyboardShortcutsHelp() {
	window.dispatchEvent(new Event("neuland:open-shortcuts"));
}
