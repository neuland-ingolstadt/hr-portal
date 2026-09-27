export type Locale = "de" | "en";

export const DEFAULT_LOCALE: Locale = "de";
export const LOCALE_STORAGE_KEY = "neuland-locale" as const;
export const LOCALES: Locale[] = ["de", "en"];

const de = {
	"app.name": "Neuland HR",
	"header.logout": "Abmelden",
	"header.language": "Sprache",
	"header.language.de": "Deutsch",
	"header.language.en": "English",
	"nav.section": "Navigation",
	"nav.sectionOverview": "Übersicht",
	"nav.sectionWorkflows": "Abläufe",
	"nav.home": "Home",
	"nav.members": "Mitglieder",
	"nav.applications": "Bewerbungen",
	"nav.onboarding": "Onboarding",
	"nav.offboarding": "Offboarding",
	"nav.openMenu": "Menü öffnen",
	"nav.closeMenu": "Menü schließen",
	"footer.imprint": "Impressum",
	"footer.privacy": "Datenschutz",
	"footer.build": "Build",
	"footer.copyright": "Copyright © 2026",
	"footer.by": "von",
	"footer.and": "und",
	"role.hr": "HR",
	"role.vorstand": "Vorstand",
	"role.admin": "Admin",
	"login.eyebrow": "Anmeldung",
	"login.lead":
		"Melde dich mit deinem Neuland-Konto an, um das HR-Portal zu nutzen.",
	"login.cta": "Mit Neuland-Konto anmelden",
	"login.mockHint":
		"Authentik ist lokal noch nicht konfiguriert. Nutze die Mock-Anmeldung unten oder setze die AUTHENTIK_*-Variablen.",
	"login.mockLabel": "Lokale Mock-Anmeldung",
	"login.mockHr": "Als HR anmelden",
	"login.mockVorstand": "Als Vorstand anmelden",
	"login.mockAdmin": "Als Admin anmelden",
	"login.mockGuest": "Als Gast (kein Zugang)",
	"home.eyebrow": "Dashboard",
	"home.hello": "Hallo {name}",
	"home.lead":
		"Willkommen im Neuland HR Portal. Mitglieder und Abläufe an einem Ort.",
	"home.name": "Name",
	"home.email": "E-Mail",
	"home.role": "Rolle",
	"home.empty": "-",
	"home.openMembers": "Mitglieder öffnen",
	"home.signedInAs": "Angemeldet als {email}",
	"home.statMembers": "Mitglieder",
	"home.statGroups": "Gruppen",
	"home.statAccess": "Dein Zugang",
	"home.statMock": "Lokale Beispieldaten",
	"home.statUnavailable": "Konnten gerade nicht geladen werden",
	"home.statGroupsHint": "Im Verzeichnis",
	"home.statAccessHint": "Deine aktuelle Rolle",
	"home.statMembersHint": "Aktive Vereinsmitglieder",
	"home.actionMembersTitle": "Mitglieder",
	"home.actionMembersDesc":
		"Mitgliederverzeichnis durchsuchen, filtern und sortieren.",
	"home.soon": "Bald",
	"home.moduleOnboardingTitle": "Onboarding",
	"home.moduleOnboardingDesc": "Checklisten und Abläufe für neue Mitglieder.",
	"home.moduleApplicationsTitle": "Bewerbungen",
	"home.moduleApplicationsDesc":
		"Eingehende Mitgliedsanträge prüfen und freigeben.",
	"home.moduleOffboardingTitle": "Offboarding",
	"home.moduleOffboardingDesc":
		"Austritte strukturieren, Zugänge entziehen und Übergaben dokumentieren.",
	"home.moduleEasyVereinTitle": "EasyVerein",
	"home.moduleEasyVereinDesc":
		"Vereinsdaten anbinden, sobald die Integration freigegeben ist.",
	"home.profileHint":
		"Profil und Rollen werden zentral über dein Neuland-Konto gesteuert.",
	"comingSoon.workspaceTitle": "In Vorbereitung",
	"comingSoon.workspaceLead":
		"Dieses Modul ist geplant und steht demnächst zur Verfügung.",
	"comingSoon.preview": "Vorschau",
	"comingSoon.hint":
		"Noch keine Aktionen möglich — die Funktionen folgen in Kürze.",
	"applications.eyebrow": "Abläufe",
	"applications.title": "Bewerbungen",
	"applications.lead":
		"Mitgliedsanträge sichten, entscheiden und Rückmeldungen nachverfolgen.",
	"applications.bulletReview": "Anträge in einer Warteschlange prüfen",
	"applications.bulletDecide": "Freigeben oder ablehnen mit Begründung",
	"applications.bulletNotify": "Bewerber:innen automatisch benachrichtigen",
	"applications.bulletHistory": "Entscheidungen nachvollziehbar speichern",
	"onboarding.eyebrow": "Abläufe",
	"onboarding.title": "Onboarding",
	"onboarding.lead":
		"Neue Mitglieder strukturiert einarbeiten — von Zugang bis Willkommen.",
	"onboarding.bulletChecklist": "Aufgabenlisten pro Rolle",
	"onboarding.bulletAccess": "Zugänge und Gruppen vorbereiten",
	"onboarding.bulletWelcome": "Willkommensschritte und Termine",
	"onboarding.bulletTrack": "Fortschritt für HR & Vorstand",
	"offboarding.eyebrow": "Abläufe",
	"offboarding.title": "Offboarding",
	"offboarding.lead":
		"Austritte sauber abwickeln — Zugänge, Übergaben und Dokumentation.",
	"offboarding.leadLive":
		"Aktive Konten ohne Mitgliedschaft erkennen. Weitere Schritte folgen.",
	"offboarding.candidatesTitle": "Konten ohne Mitgliedschaft",
	"offboarding.candidatesLead":
		"Aktive Nutzerkonten ohne Mitgliedschaft — mögliche Offboarding-Kandidaten.",
	"offboarding.candidatesCount": "{count} Kandidaten",
	"offboarding.candidatesShowing": "{filtered} von {total}",
	"offboarding.candidatesLoading": "Kandidaten werden geladen…",
	"offboarding.candidatesEmpty":
		"Keine aktiven Konten ohne Mitgliedschaft gefunden.",
	"offboarding.candidatesError":
		"Kandidaten konnten nicht geladen werden. Bitte versuche es erneut.",
	"offboarding.noGroups": "Keine Gruppen",
	"offboarding.bulletChecklist": "Austritts-Checkliste",
	"offboarding.bulletAccess": "Zugänge und Geräte zurücknehmen",
	"offboarding.bulletHandover": "Wissen und Aufgaben übergeben",
	"offboarding.bulletArchive": "Abschluss dokumentieren",
	"access.eyebrow": "Zugriff verweigert",
	"access.title": "Kein Zugang",
	"access.lead":
		"Hallo {name}, dein Neuland-Konto ist angemeldet, hat aber keine HR-, Vorstand- oder Admin-Berechtigung für dieses Portal.",
	"access.hint":
		"Wenn du Zugang brauchst, melde dich bei HR, dem Vorstand oder einem Admin.",
	"members.eyebrow": "Verzeichnis",
	"members.title": "Mitglieder",
	"members.lead": "Mitgliederverzeichnis mit Name und Gruppenzugehörigkeit.",
	"members.colName": "Name",
	"members.colGroups": "Gruppen",
	"members.searchPlaceholder": "Name suchen…",
	"members.filterTitle": "Filter",
	"members.filterGroups": "Gruppen",
	"members.filterMatchAny": "Beliebig",
	"members.filterMatchAll": "Alle",
	"members.filterMatchHint":
		"Treffer, wenn die Person die gewählten Gruppen erfüllt.",
	"members.clearFilters": "Zurücksetzen",
	"members.showing": "{filtered} von {total}",
	"members.count": "{count} Einträge",
	"members.loading": "Mitglieder werden geladen…",
	"members.empty": "Keine Mitglieder gefunden.",
	"members.emptyFiltered": "Keine Treffer für die aktuellen Filter.",
	"members.errorLoad":
		"Mitglieder konnten nicht geladen werden. Bitte versuche es erneut.",
	"members.errorApiMissing":
		"Mitgliederverzeichnis ist nicht konfiguriert. Bitte die Administration kontaktieren.",
	"members.retry": "Erneut versuchen",
	"members.mockHint":
		"Lokale Beispieldaten — in Produktion siehst du echte Mitglieder.",
	"error.oauth_session_missing":
		"Sitzung abgelaufen. Bitte melde dich erneut an.",
	"error.id_token_missing_sub":
		"Anmeldung unvollständig. Bitte erneut versuchen.",
	"error.login_failed": "Anmeldung fehlgeschlagen.",
	"error.generic": "Etwas ist schiefgelaufen.",
} as const;

export type MessageKey = keyof typeof de;

const en: Record<MessageKey, string> = {
	"app.name": "Neuland HR",
	"header.logout": "Sign out",
	"header.language": "Language",
	"header.language.de": "Deutsch",
	"header.language.en": "English",
	"nav.section": "Navigation",
	"nav.sectionOverview": "Overview",
	"nav.sectionWorkflows": "Workflows",
	"nav.home": "Home",
	"nav.members": "Members",
	"nav.applications": "Applications",
	"nav.onboarding": "Onboarding",
	"nav.offboarding": "Offboarding",
	"nav.openMenu": "Open menu",
	"nav.closeMenu": "Close menu",
	"footer.imprint": "Legal notice",
	"footer.privacy": "Privacy",
	"footer.build": "Build",
	"footer.copyright": "Copyright © 2026",
	"footer.by": "by",
	"footer.and": "and",
	"role.hr": "HR",
	"role.vorstand": "Board",
	"role.admin": "Admin",
	"login.eyebrow": "Sign in",
	"login.lead": "Sign in with your Neuland account to use the HR portal.",
	"login.cta": "Sign in with Neuland account",
	"login.mockHint":
		"Authentik is not configured locally yet. Use the mock sign-in below or set the AUTHENTIK_* variables.",
	"login.mockLabel": "Local mock sign-in",
	"login.mockHr": "Sign in as HR",
	"login.mockVorstand": "Sign in as Board",
	"login.mockAdmin": "Sign in as Admin",
	"login.mockGuest": "Sign in as guest (no access)",
	"home.eyebrow": "Dashboard",
	"home.hello": "Hello {name}",
	"home.lead":
		"Welcome to the Neuland HR portal. Members and workflows in one place.",
	"home.name": "Name",
	"home.email": "Email",
	"home.role": "Role",
	"home.empty": "-",
	"home.openMembers": "Open members",
	"home.signedInAs": "Signed in as {email}",
	"home.statMembers": "Members",
	"home.statGroups": "Groups",
	"home.statAccess": "Your access",
	"home.statMock": "Local sample data",
	"home.statUnavailable": "Could not be loaded right now",
	"home.statGroupsHint": "In the directory",
	"home.statAccessHint": "Your current role",
	"home.statMembersHint": "Active club members",
	"home.actionMembersTitle": "Members",
	"home.actionMembersDesc": "Search, filter, and sort the members directory.",
	"home.soon": "Soon",
	"home.moduleOnboardingTitle": "Onboarding",
	"home.moduleOnboardingDesc": "Checklists and flows for new members.",
	"home.moduleApplicationsTitle": "Applications",
	"home.moduleApplicationsDesc":
		"Review and approve incoming membership applications.",
	"home.moduleOffboardingTitle": "Offboarding",
	"home.moduleOffboardingDesc":
		"Structure departures, revoke access, and document handovers.",
	"home.moduleEasyVereinTitle": "EasyVerein",
	"home.moduleEasyVereinDesc":
		"Connect club data once the integration is ready.",
	"home.profileHint":
		"Profile and roles are managed centrally through your Neuland account.",
	"comingSoon.workspaceTitle": "Coming soon",
	"comingSoon.workspaceLead":
		"This module is planned and will be available soon.",
	"comingSoon.preview": "Preview",
	"comingSoon.hint": "No actions available yet — features will follow shortly.",
	"applications.eyebrow": "Workflows",
	"applications.title": "Applications",
	"applications.lead":
		"Review membership applications, decide, and track follow-ups.",
	"applications.bulletReview": "Review applications in a queue",
	"applications.bulletDecide": "Approve or decline with a reason",
	"applications.bulletNotify": "Notify applicants automatically",
	"applications.bulletHistory": "Keep decisions auditable",
	"onboarding.eyebrow": "Workflows",
	"onboarding.title": "Onboarding",
	"onboarding.lead":
		"Bring new members up to speed — from access to welcome steps.",
	"onboarding.bulletChecklist": "Role-based task lists",
	"onboarding.bulletAccess": "Prepare access and groups",
	"onboarding.bulletWelcome": "Welcome steps and appointments",
	"onboarding.bulletTrack": "Progress for HR & board",
	"offboarding.eyebrow": "Workflows",
	"offboarding.title": "Offboarding",
	"offboarding.lead":
		"Handle departures cleanly — access, handovers, and documentation.",
	"offboarding.leadLive":
		"Identify active accounts without membership. More steps will follow.",
	"offboarding.candidatesTitle": "Accounts without membership",
	"offboarding.candidatesLead":
		"Active user accounts without membership — possible offboarding candidates.",
	"offboarding.candidatesCount": "{count} candidates",
	"offboarding.candidatesShowing": "{filtered} of {total}",
	"offboarding.candidatesLoading": "Loading candidates…",
	"offboarding.candidatesEmpty": "No active accounts without membership found.",
	"offboarding.candidatesError":
		"Candidates could not be loaded. Please try again.",
	"offboarding.noGroups": "No groups",
	"offboarding.bulletChecklist": "Departure checklist",
	"offboarding.bulletAccess": "Revoke access and collect assets",
	"offboarding.bulletHandover": "Hand over knowledge and tasks",
	"offboarding.bulletArchive": "Document the close-out",
	"access.eyebrow": "Access denied",
	"access.title": "No access",
	"access.lead":
		"Hello {name}, your Neuland account is signed in but has no HR, Board, or Admin permission for this portal.",
	"access.hint": "If you need access, contact HR, the board, or an admin.",
	"members.eyebrow": "Directory",
	"members.title": "Members",
	"members.lead": "Members directory with name and group membership.",
	"members.colName": "Name",
	"members.colGroups": "Groups",
	"members.searchPlaceholder": "Search by name…",
	"members.filterTitle": "Filters",
	"members.filterGroups": "Groups",
	"members.filterMatchAny": "Any",
	"members.filterMatchAll": "All",
	"members.filterMatchHint": "Match people who satisfy the selected groups.",
	"members.clearFilters": "Reset",
	"members.showing": "{filtered} of {total}",
	"members.count": "{count} entries",
	"members.loading": "Loading members…",
	"members.empty": "No members found.",
	"members.emptyFiltered": "No matches for the current filters.",
	"members.errorLoad": "Members could not be loaded. Please try again.",
	"members.errorApiMissing":
		"Members directory is not configured. Please contact an administrator.",
	"members.retry": "Try again",
	"members.mockHint":
		"Local sample data — in production you will see real members.",
	"error.oauth_session_missing": "Session expired. Please sign in again.",
	"error.id_token_missing_sub": "Sign-in incomplete. Please try again.",
	"error.login_failed": "Sign-in failed.",
	"error.generic": "Something went wrong.",
};

export const messages: Record<Locale, Record<MessageKey, string>> = {
	de,
	en,
};

export function isLocale(value: unknown): value is Locale {
	return value === "de" || value === "en";
}

export function translate(
	locale: Locale,
	key: MessageKey,
	vars?: Record<string, string>,
): string {
	let text = messages[locale][key] ?? messages.de[key] ?? key;
	if (vars) {
		for (const [name, value] of Object.entries(vars)) {
			text = text.replaceAll(`{${name}}`, value);
		}
	}
	return text;
}

export function otherLocale(locale: Locale): Locale {
	return locale === "de" ? "en" : "de";
}
