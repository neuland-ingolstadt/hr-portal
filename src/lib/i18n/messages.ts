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
	"nav.scanner": "Scanner",
	"nav.applications": "Bewerbungen",
	"nav.onboarding": "Onboarding",
	"nav.offboarding": "Offboarding",
	"nav.audit": "Audit",
	"nav.openMenu": "Menü öffnen",
	"nav.closeMenu": "Menü schließen",
	"nav.collapseSidebar": "Seitenleiste einklappen",
	"nav.expandSidebar": "Seitenleiste ausklappen",
	"audit.eyebrow": "Nachvollziehbarkeit",
	"audit.title": "Audit-Log",
	"audit.lead": "Wer hat welche Aktion im Portal ausgelöst.",
	"audit.loading": "Audit-Einträge werden geladen…",
	"audit.empty": "Noch keine Audit-Einträge.",
	"audit.count": "{count} Einträge",
	"audit.retry": "Erneut versuchen",
	"audit.status.ok": "Erfolgreich",
	"audit.status.failed": "Fehlgeschlagen",
	"audit.targetNone": "-",
	"audit.actorTarget": "von {actor} · {target}",
	"audit.searchPlaceholder": "Akteur, Ziel oder Fehler suchen…",
	"audit.filterAction": "Aktion",
	"audit.filterActionAll": "Alle Aktionen",
	"audit.filterStatus": "Ergebnis",
	"audit.filterStatusAll": "Alle Ergebnisse",
	"audit.showing": "{filtered} von {total}",
	"audit.emptyFiltered": "Keine Treffer für die aktuellen Filter.",
	"audit.action.application.accept": "Antrag angenommen",
	"audit.action.member.create": "Konto manuell angelegt",
	"audit.action.member.groups.update": "Gruppen geändert",
	"audit.action.member.onboarding_stage.update": "Onboarding-Stufe geändert",
	"audit.action.member.onboarding_contact.update":
		"Onboarding-Betreuung geändert",
	"audit.action.offboarding.revoke_mitglieder": "Mitglieder-Rolle entfernt",
	"audit.action.offboarding.delete_account": "Konto gelöscht",
	"shortcuts.title": "Tastenkürzel",
	"shortcuts.lead": "Häufige Aktionen ohne Maus.",
	"shortcuts.sectionGeneral": "Allgemein",
	"shortcuts.sectionGo": "Gehe zu",
	"shortcuts.focusSearch": "Suche fokussieren",
	"shortcuts.toggleSidebar": "Seitenleiste umschalten",
	"shortcuts.showHelp": "Hilfe öffnen",
	"help.open": "Hilfe öffnen",
	"help.sheetTitle": "Dokumentation",
	"help.shortcutsCta": "Tastenkürzel anzeigen",
	"help.home.title": "Portal-Überblick",
	"help.home.lead":
		"Kurzanleitung für das Neuland HR Portal: Rollen, Module und wo du was findest.",
	"help.home.intro":
		"Dieses Portal ist die Bedienoberfläche für Mitgliederverwaltung und HR-Abläufe. Authentik bleibt die einzige Quelle für Nutzer, Gruppen und Zugang: es gibt keine lokale Mitglieder-Datenbank. Was du siehst und tun darfst, hängt von deiner Authentik-Gruppenzugehörigkeit ab.",
	"help.home.s1.heading": "Zugang und Rollen",
	"help.home.s1.body":
		"Zugang haben die Rollen HR, Vorstand und Admin. Die Zuordnung kommt aus konfigurierbaren Authentik-Gruppen. Admin hat im Portal dieselben Rechte wie Vorstand (elevated). Ohne passende Gruppe landest du auf der Seite „Kein Zugang“.",
	"help.home.s2.heading": "Was HR nutzen kann",
	"help.home.s2.body":
		"HR sieht Home, Mitgliederverzeichnis, Scanner und Onboarding. Dort kannst du Profile öffnen, Onboarding-Stufen setzen und Ausweise scannen. Bewerbungen, Offboarding und Audit sind für HR nicht sichtbar und serverseitig gesperrt.",
	"help.home.s3.heading": "Was Vorstand und Admin zusätzlich können",
	"help.home.s3.body":
		"Elevated-Rollen sehen zusätzlich Bewerbungen (EasyVerein annehmen), Offboarding (Mitglieder-Rolle entziehen und Konten löschen), das Audit-Log sowie E-Mail-Adressen im Verzeichnis und Ressort-Gruppen im Profil.",
	"help.home.s4.heading": "Hilfe und Tastenkürzel",
	"help.home.s4.body":
		"Mit „?“ (Taste oder Knopf in der Kopfzeile) öffnest du diese Dokumentation zum aktuellen Modul. Die Tastenkürzel-Liste bleibt über das Tastatur-Symbol in der Seitenleiste erreichbar (z. B. „f“ für Suche und „g“ plus Buchstabe für Navigation).",
	"help.members.title": "Mitglieder",
	"help.members.lead":
		"Authentik-Nutzer:innen durchsuchen, Profile öffnen und Onboarding-Fortschritt pflegen.",
	"help.members.intro":
		"Das Verzeichnis listet Nutzer:innen direkt aus Authentik. Es ist kein CRM und speichert keine eigenen Stammdaten. Änderungen an Gruppen oder Onboarding-Stufe schreiben zurück nach Authentik (Attribute bzw. Gruppenmitgliedschaft).",
	"help.members.s1.heading": "Verzeichnis und Suche",
	"help.members.s1.body":
		"Filtere nach Name oder E-Mail. E-Mail-Adressen im Verzeichnis sieht nur Vorstand/Admin; HR arbeitet mit Namen und Gruppen. Ein Klick auf eine Zeile öffnet das Profil als Sheet von rechts.",
	"help.members.s2.heading": "Profilinhalt",
	"help.members.s2.body":
		"Im Profil findest du Stammdaten, Gruppen (inkl. Ressorts), Connect-Integrationen und die Onboarding-Stufe. Wo vorhanden, ist die EasyVerein-Mitglieds-ID als Attribut hinterlegt: sie verknüpft Authentik mit EasyVerein für Offboarding und Annahme.",
	"help.members.s3.heading": "Onboarding-Stufe",
	"help.members.s3.body":
		"Die Stufe (0–4) steuert die Gruppierung auf der Onboarding-Seite: Neu im Verein, Am Onboarding Call teilgenommen, Projekt zugewiesen, Beitrag geleistet, Onboarding abgeschlossen. Du kannst sie hier im Profil oder auf der Onboarding-Karte setzen. Das ist ein menschlicher Fortschrittsmarker, keine Checkliste und keine automatische Queue.",
	"help.members.s4.heading": "Gruppen bearbeiten",
	"help.members.s4.body":
		"Nur Vorstand/Admin können Ressort-Gruppen im Profil ändern. Geschützte Gruppen (u. a. HR, Vorstand, Admin, Ehrenmitglied, technical-users, mitglieder) dürfen über das Portal nicht verändert werden: das verhindert versehentliche Rechte- oder Mitgliedschaftsänderungen.",
	"help.scanner.title": "Scanner",
	"help.scanner.lead":
		"Mitgliedsausweis-QR prüfen und bei Treffer das Profil öffnen.",
	"help.scanner.intro":
		"Der Scanner verifiziert signierte Member-IDs mit dem öffentlichen Schlüssel der Ausweis-Infrastruktur. Er dient der Kontrolle vor Ort (Events, Zugang), nicht der Bewerberannahme.",
	"help.scanner.s1.heading": "Scannen",
	"help.scanner.s1.body":
		"Nutze die Kamera oder gib den Code manuell ein. Ohne ladbaren öffentlichen Schlüssel ist der Scanner nicht verfügbar: dann Schlüssel erneut laden bzw. die Konfiguration prüfen.",
	"help.scanner.s2.heading": "Ergebnis",
	"help.scanner.s2.body":
		"Bei gültiger Signatur siehst du Name und Status. Stimmt der Eintrag mit einem Authentik-Nutzer überein, kannst du das Mitgliederprofil direkt öffnen.",
	"help.scanner.s3.heading": "Lokale Historie",
	"help.scanner.s3.body":
		"Die Scan-Historie wird nur auf diesem Gerät im Browser gespeichert und nicht mit dem Server synchronisiert. Du kannst sie jederzeit leeren.",
	"help.applications.title": "Bewerbungen",
	"help.applications.lead":
		"Offene EasyVerein-Anträge annehmen: Authentik-Konto, Willkommensmail und Mitgliedschaftsabschluss.",
	"help.applications.intro":
		"Diese Seite ist nur für Vorstand und Admin. Sie listet EasyVerein-Mitglieder mit is_application=true. Ablehnen ist im Portal noch nicht vorgesehen: dafür EasyVerein direkt nutzen.",
	"help.applications.s1.heading": "Liste und Suche",
	"help.applications.s1.body":
		"Die Liste kommt live aus der EasyVerein-API. Suche nach Name oder E-Mail. Fehlt das API-Token, erscheint ein Konfigurationsfehler statt einer leeren Liste.",
	"help.applications.s2.heading": "Antrag annehmen",
	"help.applications.s2.body":
		"Beim Annehmen legt das Portal zuerst den Authentik-Nutzer an (inkl. easyVereinMemberId), sendet die Willkommensmail und aktualisiert danach EasyVerein (Antrag schließen, Beitrittsdatum setzen falls fehlend). Schlägt EasyVerein nach erfolgreichem Authentik-Schritt fehl, bleibt der Hinweis zur manuellen Nacharbeit.",
	"help.applications.s3.heading": "SEPA-Mandat",
	"help.applications.s3.body":
		"Ist eine IBAN vorhanden und noch kein SEPA-Mandat gesetzt, versucht das Portal nach der Annahme automatisch ein Mandat zu setzen (Datum = Antragsdatum oder heute, Referenz NL{memberId}-YYYYMMDD). Ein Fehler beim Mandat bricht die Annahme nicht ab: es erscheint nur ein Hinweis.",
	"help.applications.s4.heading": "Manuell anlegen",
	"help.applications.s4.body":
		"Über „Manuell anlegen“ im Kopf kannst du in Sonderfällen ein Authentik-Konto ohne offenen EasyVerein-Antrag erzeugen (z. B. Altbestand). Der normale Weg für neue Mitglieder bleibt die Annahme aus dieser Liste.",
	"help.onboarding.title": "Onboarding",
	"help.onboarding.lead":
		"Neue Authentik-Konten der letzten Wochen nach menschlichem Fortschritt gruppieren.",
	"help.onboarding.intro":
		"Onboarding ist kein Aufgaben-Queue und kein Checklisten-Workflow. Es zeigt Mitglieder mit Authentik-Konto der letzten 12 Wochen, gruppiert nach attributes.onboardingStage. Optional kannst du eine betreuende HR-/Staff-Person (attributes.onboardingContact) zuweisen. Neue Konten legst du bevorzugt über Bewerbungen an.",
	"help.onboarding.s1.heading": "Zeitfenster und Karten",
	"help.onboarding.s1.body":
		"Nur Konten aus den letzten zwölf Wochen erscheinen hier. Die Karten stehen unter ihrer Stufe - auf breiten Bildschirmen als Spalten nebeneinander, sonst untereinander. Klick öffnet dasselbe Profil-Sheet wie im Mitgliederverzeichnis. Filter: alle / meine / ohne Betreuung.",
	"help.onboarding.s2.heading": "Stufen 0–4",
	"help.onboarding.s2.body":
		"0 Neu im Verein · 1 Am Onboarding Call teilgenommen · 2 Projekt zugewiesen · 3 Beitrag geleistet · 4 Onboarding abgeschlossen. Die Bedeutungen sind teamseitig festgelegt; das Portal speichert nur die Zahl in Authentik. Karte per Drag & Drop in eine andere Stufe ziehen, oder die Stufe am Slider im Profil anpassen.",
	"help.onboarding.s3.heading": "Betreuung zuweisen",
	"help.onboarding.s3.body":
		"Im Profil kannst du eine Person aus HR, Vorstand oder Admin als Ansprechpartner setzen (oder dich selbst). Das ist nur ein Kontakt-Hinweis - keine Aufgabenliste und keine Fristen. Die Zuweisung landet in Authentik und im Audit-Log.",
	"help.onboarding.s4.heading": "Empfohlener Ablauf",
	"help.onboarding.s4.body":
		"Mitgliedsantrag in Bewerbungen annehmen → Person erscheint nach date_joined hier → Betreuung zuweisen → Stufe im Alltag fortschreiben. Manuelles Anlegen ist für Ausnahmen gedacht, nicht für den Standardprozess.",
	"help.offboarding.title": "Offboarding",
	"help.offboarding.lead":
		"Zwei-Stufen-Pipeline in Authentik: Mitglieder-Rolle widerrufen, danach Konto löschen.",
	"help.offboarding.intro":
		"Nur Vorstand/Admin. EasyVerein wird nur lesend geprüft: Schreibzugriffe laufen nicht über diese Seite. Ziel ist, ausgetretene oder unverbundene Mitglieder-Konten kontrolliert aus Authentik zu entfernen, ohne fremde Nicht-Mitglieder-Konten zu treffen.",
	"help.offboarding.s1.heading": "Stufe 1: Mitglieder widerrufen",
	"help.offboarding.s1.body":
		"Kandidaten sind Mitglieder-Konten ohne easyVereinMemberId oder mit verknüpfter EasyVerein-ID, die ausgetreten / gelöscht / nicht mehr auffindbar ist (inkl. Papierkorb-Snapshot, Cache ca. 5 Min.). Ein zukünftiges Austrittsdatum allein landet nur auf der Watchlist. Der Widerruf entfernt die Mitglieder-Gruppe und setzt attributes.membershipRevokedAt.",
	"help.offboarding.s2.heading": "Stufe 2: Konto löschen",
	"help.offboarding.s2.body":
		"Löschkandidaten sind nur Konten mit gesetztem membershipRevokedAt. „Kein Mitglieder mehr“ allein reicht nicht: so werden zufällige Nicht-Mitglieder-Konten nicht gelöscht. Die Löschung ist unwiderruflich (Authentik DELETE).",
	"help.offboarding.s3.heading": "Prozess starten",
	"help.offboarding.s3.body":
		"Der Button „Prozess starten“ läuft nicht automatisch beim Öffnen und nicht per Cron. Er widerruft fällige Stufe-1-Kandidaten und löscht Stufe-2-Konten nach Ablauf der Schonfrist (OFFBOARDING_DELETE_GRACE_DAYS, Standard 14 Tage). Pro Zeile bleiben Einzelaktionen verfügbar. Dich selbst kannst du nicht als Ziel wählen.",
	"help.offboarding.s4.heading": "Sicherheit der Aktionen",
	"help.offboarding.s4.body":
		"Jede Mutation prüft erneut, ob die ID noch in der aktuellen Kandidatenmenge liegt. Watchlist-Einträge und beliebige IDs werden abgelehnt. Bestätigungsdialoge erklären die Folgen vor dem Ausführen.",
	"help.audit.title": "Audit",
	"help.audit.lead":
		"Nachvollziehen, welche Person im Portal welche Aktion ausgelöst hat.",
	"help.audit.intro":
		"Technische Authentik-API-Aufrufe laufen mit dem Service-Token. Das Audit-Log speichert zusätzlich die OIDC-Session-Person als Akteur, damit du weißt, wer im Portal geklickt hat, nicht nur welches Systemkonto geschrieben hat.",
	"help.audit.s1.heading": "Wer darf das sehen",
	"help.audit.s1.body":
		"Nur Vorstand und Admin. HR hat keinen Menüpunkt und keinen API-Zugang. Das Log ist append-only (JSONL) und kein Identitäts- oder Mitglieder-Store.",
	"help.audit.s2.heading": "Welche Aktionen",
	"help.audit.s2.body":
		"Protokolliert werden u. a. Antrag annehmen, manuelles Konto anlegen, Gruppenänderungen, Onboarding-Stufe und -Betreuung sowie Offboarding-Widerruf und Kontolöschung. Filtere nach Aktionstyp oder suche nach Akteur und Ziel.",
	"help.audit.s3.heading": "Betrieb",
	"help.audit.s3.body":
		"Die Datei liegt unter AUDIT_LOG_PATH (Standard data/audit.jsonl). In Produktion sollte der Pfad persistent gemountet sein. Zusätzlich werden [audit]-Zeilen nach stdout geschrieben.",
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
	"home.openApplications": "Bewerbungen öffnen",
	"home.openOffboarding": "Offboarding öffnen",
	"home.openOnboarding": "Onboarding öffnen",
	"home.signedInAs": "Angemeldet als {email}",
	"home.statMembers": "Mitglieder",
	"home.statRessort": "Mit Ressort",
	"home.statOnboarding": "Im Onboarding",
	"home.statMock": "Lokale Beispieldaten",
	"home.statUnavailable": "Konnten gerade nicht geladen werden",
	"home.statMembersHint": "Aktive Vereinsmitglieder",
	"home.statRessortHint": "Mindestens ein Ressort zugewiesen",
	"home.statOnboardingHint":
		"Neue Konten (12 Wochen), noch nicht abgeschlossen",
	"home.actionMembersTitle": "Mitglieder",
	"home.actionMembersDesc":
		"Mitgliederverzeichnis durchsuchen, filtern und sortieren.",
	"home.moduleOnboardingTitle": "Onboarding",
	"home.moduleOnboardingDesc": "Neue Authentik-Konten der letzten Wochen.",
	"home.moduleApplicationsTitle": "Bewerbungen",
	"home.moduleApplicationsDesc":
		"Eingehende Mitgliedsanträge prüfen und freigeben.",
	"home.moduleOffboardingTitle": "Offboarding",
	"home.moduleOffboardingDesc":
		"Mitglieder-Rollen entziehen und Authentik-Konten nach Austritt löschen.",
	"home.profileHint":
		"Profil und Rollen werden zentral über dein Neuland-Konto gesteuert.",
	"home.pendingCount": "{count} offen",
	"home.pendingCountZero": "Keine offenen",
	"home.pendingCountUnavailable": "Anzahl unklar",
	"applications.eyebrow": "Abläufe",
	"applications.title": "Bewerbungen",
	"applications.lead":
		"Mitgliedsanträge sichten, entscheiden und Rückmeldungen nachverfolgen.",
	"applications.leadLive":
		"Offene EasyVerein-Anträge prüfen. Annehmen legt das Authentik-Konto an und sendet die Willkommensmail.",
	"applications.bulletReview": "Anträge in einer Warteschlange prüfen",
	"applications.bulletDecide": "Freigeben oder ablehnen mit Begründung",
	"applications.bulletNotify": "Bewerber:innen automatisch benachrichtigen",
	"applications.bulletHistory": "Entscheidungen nachvollziehbar speichern",
	"applications.colName": "Name",
	"applications.colEmail": "E-Mail",
	"applications.colDate": "Antrag vom",
	"applications.colActions": "Aktionen",
	"applications.searchPlaceholder": "Name oder E-Mail suchen…",
	"applications.count": "{count} Anträge",
	"applications.showing": "{filtered} von {total}",
	"applications.loading": "Anträge werden geladen…",
	"applications.empty": "Keine offenen Mitgliedsanträge.",
	"applications.emptyFiltered": "Keine Treffer für die aktuelle Suche.",
	"applications.retry": "Erneut versuchen",
	"applications.errorLoad":
		"Anträge konnten nicht geladen werden. Bitte versuche es erneut.",
	"applications.errorApiMissing":
		"EasyVerein-API ist nicht konfiguriert (EASYVEREIN_API_TOKEN).",
	"applications.errorNotFound": "Antrag wurde nicht gefunden.",
	"applications.errorNotPending":
		"Dieser Antrag ist nicht mehr offen - bitte Liste aktualisieren.",
	"applications.errorAcceptFailed": "Annahme ist fehlgeschlagen.",
	"applications.errorAcceptPartial":
		"Authentik-Konto „{username}“ wurde angelegt, aber EasyVerein konnte nicht aktualisiert werden. Bitte manuell nachziehen.",
	"applications.accept": "Annehmen",
	"applications.acceptTitle": "Antrag annehmen?",
	"applications.acceptLead":
		"EasyVerein-Antrag annehmen, Authentik-Konto anlegen und Willkommensmail senden.",
	"applications.acceptConfirm": "Ja, annehmen",
	"applications.acceptCancel": "Abbrechen",
	"applications.acceptDone": "Schließen",
	"applications.acceptSubmitting": "Wird angenommen…",
	"applications.acceptSubmittingHint": "Das kann ein paar Sekunden dauern.",
	"applications.acceptStepAccount": "Authentik-Konto wird angelegt…",
	"applications.acceptStepEmail": "Willkommensmail wird gesendet…",
	"applications.acceptStepEasyVerein": "EasyVerein wird aktualisiert…",
	"applications.acceptStepSepa": "SEPA-Mandat wird gesetzt…",
	"applications.acceptSuccess":
		"Antrag angenommen. Konto „{username}“ wurde angelegt.",
	"applications.acceptSepaNoIban":
		"Kein IBAN: SEPA-Mandat wurde nicht gesetzt. Bitte in EasyVerein nachziehen.",
	"applications.acceptSepaNoContact":
		"Kein EasyVerein-Kontakt: SEPA-Mandat wurde nicht gesetzt.",
	"applications.acceptSepaFailed":
		"SEPA-Mandat konnte nicht gesetzt werden: bitte in EasyVerein nachziehen.",
	"applications.manualCreate": "Konto manuell anlegen",
	"applications.manualCreateTitle": "Konto manuell anlegen",
	"applications.manualCreateLead":
		"Nur für Sonderfälle ohne EasyVerein-Antrag. Legt ein Authentik-Konto an und sendet die Willkommensmail.",
	"applications.manualCreateDone": "Schließen",
	"onboarding.eyebrow": "Abläufe",
	"onboarding.title": "Onboarding",
	"onboarding.lead":
		"Neue Mitglieder strukturiert einarbeiten - von Zugang bis Willkommen.",
	"onboarding.leadLive": "Mitglieder der letzten 12 Wochen.",
	"onboarding.bulletChecklist": "Aufgabenlisten pro Rolle",
	"onboarding.bulletAccess": "Zugänge und Gruppen vorbereiten",
	"onboarding.bulletWelcome": "Willkommensschritte und Termine",
	"onboarding.bulletTrack": "Fortschritt für HR & Vorstand",
	"onboarding.recent.contact": "Betreuung: {name}",
	"onboarding.recent.contactAssigned": "Betreut",
	"onboarding.recent.contactNone": "Keine Betreuung",
	"onboarding.recent.empty":
		"Keine neuen Mitgliederkonten in den letzten {weeks} Wochen.",
	"onboarding.recent.loading": "Neue Mitglieder werden geladen…",
	"onboarding.loadingHint":
		"Neue Authentik-Konten der letzten Wochen - gruppiert nach Einstiegsfortschritt und Betreuung.",
	"onboarding.loadingStepAccounts": "Neue Authentik-Konten werden geladen…",
	"onboarding.loadingStepMitglieder": "Mitglieder-Gruppe wird abgeglichen…",
	"onboarding.loadingStepStages": "Onboarding-Stufen werden aufgebaut…",
	"onboarding.recent.mockHint":
		"Lokale Mock-Daten - Authentik-API ist nicht konfiguriert.",
	"onboarding.recent.errorApiMissing":
		"Authentik-API ist nicht konfiguriert. Neue Mitglieder können nicht geladen werden.",
	"onboarding.recent.errorLoad":
		"Neue Mitglieder konnten nicht geladen werden.",
	"onboarding.recent.retry": "Erneut versuchen",
	"onboarding.filter.label": "Nach Betreuung filtern",
	"onboarding.filter.all": "Alle",
	"onboarding.filter.mine": "Mir zugewiesen",
	"onboarding.filter.unassigned": "Ohne Betreuung",
	"onboarding.filter.empty": "Keine Einträge für diesen Filter.",
	"onboarding.stage.empty": "Kein Mitglied in dieser Stufe.",
	"onboarding.stage.new": "Neu im Verein",
	"onboarding.stage.conversation": "Am Onboarding Call teilgenommen",
	"onboarding.stage.project": "Projekt zugewiesen",
	"onboarding.stage.contributing": "Beitrag geleistet",
	"onboarding.stage.done": "Onboarding abgeschlossen",
	"onboarding.stage.progress": "Onboarding-Fortschritt",
	"onboarding.create.title": "Konto anlegen",
	"onboarding.create.lead":
		"Erstellt einen Authentik-Benutzer (Vorname.Nachname), setzt ein Passwort und sendet die Willkommensmail.",
	"onboarding.create.firstName": "Vorname",
	"onboarding.create.lastName": "Nachname",
	"onboarding.create.email": "E-Mail",
	"onboarding.create.firstNamePlaceholder": "Max",
	"onboarding.create.lastNamePlaceholder": "Mustermann",
	"onboarding.create.emailPlaceholder": "mam1234@thi.de",
	"onboarding.create.submit": "Anlegen",
	"onboarding.create.reset": "Zurücksetzen",
	"onboarding.create.submitting": "Wird angelegt…",
	"onboarding.create.success": "Konto „{username}“ wurde angelegt.",
	"onboarding.create.successNoEmail":
		"Die Willkommensmail konnte nicht gesendet werden - Zugangsdaten bitte manuell weitergeben.",
	"onboarding.create.errorUnauthorized": "Nicht autorisiert.",
	"onboarding.create.errorInvalid":
		"Bitte Vorname, Nachname und gültige E-Mail angeben.",
	"onboarding.create.errorApiMissing":
		"Authentik-API ist nicht konfiguriert. Kontoanlage nicht möglich.",
	"onboarding.create.errorUsernameExists":
		"Ein Benutzer mit diesem Benutzernamen existiert bereits.",
	"onboarding.create.errorFailed": "Konto konnte nicht angelegt werden.",
	"onboarding.preview.open": "Mail-Vorschau",
	"onboarding.preview.title": "Willkommensmail",
	"onboarding.preview.lead":
		"Vorschau mit Beispieldaten (Max Mustermann). So sieht die Mail nach dem Anlegen aus.",
	"onboarding.preview.loading": "Vorschau wird gerendert…",
	"onboarding.preview.error": "Vorschau konnte nicht geladen werden.",
	"offboarding.eyebrow": "Abläufe",
	"offboarding.title": "Offboarding",
	"offboarding.lead":
		"Austritte sauber abwickeln: Zugänge, Übergaben und Dokumentation.",
	"offboarding.leadLive":
		"Zwei Authentik-Schritte: Mitglieder-Gruppe entfernen, danach Konto nach Schonfrist löschen.",
	"offboarding.process.title": "Fällige Aktionen ausführen",
	"offboarding.process.lead":
		"Entfernt die Mitglieder-Gruppe bei Konten mit wirksamem Austritt oder fehlender EasyVerein-ID. Löscht Konten, deren Zugang seit mindestens {days} Tagen entzogen ist. Zukünftige Austrittsdaten werden übersprungen.",
	"offboarding.process.button": "Prozess starten",
	"offboarding.process.running": "Prozess läuft…",
	"offboarding.process.confirm":
		"Mitglieder-Rollen bei fälligen Konten entfernen und Konten nach abgelaufener Schonfrist löschen?",
	"offboarding.process.result":
		"{revoked} Rollen entfernt, {deleted} Konten gelöscht. Übersprungen (zukünftiger Austritt): {skipped}. Fehler: {errors}.",
	"offboarding.process.error":
		"Prozess fehlgeschlagen. Bitte erneut versuchen.",
	"offboarding.process.nothingDue.empty":
		"Keine Offboarding-Kandidaten - derzeit nichts zu tun.",
	"offboarding.process.nothingDue.leaving":
		"{count} mit zukünftigem Austritt - Prozess greift erst am Austrittstag.",
	"offboarding.process.nothingDue.grace":
		"{count} warten noch auf die {days}-Tage-Schonfrist nach Entzug des Zugangs.",
	"offboarding.process.nothingDue.both":
		"{leaving} mit zukünftigem Austritt, {grace} noch in der {days}-Tage-Schonfrist - derzeit nichts fällig.",
	"offboarding.process.phaseRevoke": "Mitglieder-Rolle entfernen",
	"offboarding.process.phaseDelete": "Konto löschen",
	"offboarding.process.progressCount": "{done} von {total}",
	"offboarding.process.current": "Aktuell: {name}",
	"offboarding.process.counts":
		"Entzogen {revoked}/{revokeTotal} · Gelöscht {deleted}/{deleteTotal} · Fehler {errors}",
	"offboarding.candidatesTitle": "Offboarding-Kandidaten",
	"offboarding.candidatesLead":
		"Mitglieder ohne aktives EasyVerein, sowie Konten mit entzogenem Zugang.",
	"offboarding.candidatesCount": "{count} Kandidaten",
	"offboarding.candidatesShowing": "{filtered} von {total}",
	"offboarding.candidatesPage": "{from}–{to} von {total}",
	"offboarding.candidatesPrev": "Vorherige Seite",
	"offboarding.candidatesNext": "Nächste Seite",
	"offboarding.candidatesLoading": "Kandidaten werden geladen…",
	"offboarding.loadingHint":
		"Das kann etwas dauern: EasyVerein und Authentik werden abgeglichen.",
	"offboarding.loadingStepAuthentik": "Authentik-Konten werden geladen…",
	"offboarding.loadingStepEasyVerein":
		"EasyVerein-Mitgliedschaften werden abgeglichen…",
	"offboarding.loadingStepCandidates": "Offboarding-Listen werden aufgebaut…",
	"offboarding.candidatesEmpty": "Keine Offboarding-Kandidaten gefunden.",
	"offboarding.candidatesError":
		"Kandidaten konnten nicht geladen werden. Bitte versuche es erneut.",
	"offboarding.noGroups": "Keine Gruppen",
	"offboarding.colReason": "Grund",
	"offboarding.colRevoked": "Zugang entzogen",
	"offboarding.colLeaveDate": "Austritt",
	"offboarding.colAction": "Aktion",
	"offboarding.filterReasons": "Grund filtern",
	"offboarding.reason.membership_revoked": "Zugang entzogen",
	"offboarding.reason.not_in_easyverein": "Nicht im EasyVerein",
	"offboarding.reason.left_easyverein": "EasyVerein-Austritt",
	"offboarding.leaveOn": "Austritt am {date}",
	"offboarding.leftOn": "Ausgetreten am {date}",
	"offboarding.leaveMissing": "Nicht mehr in EasyVerein",
	"offboarding.revokedToday": "heute",
	"offboarding.revokedOneDayAgo": "vor 1 Tag",
	"offboarding.revokedDaysAgo": "vor {days} Tagen",
	"offboarding.pipeline.then": "Danach",
	"offboarding.stageLabel": "Schritt {n}",
	"offboarding.stage1.badge": "Zugang einschränken",
	"offboarding.stage1.title": "Mitglieder-Rolle entfernen",
	"offboarding.stage1.lead":
		"Noch in der Mitglieder-Gruppe: fehlende EV-ID, Austritt, oder künftiger Austritt (Watchlist).",
	"offboarding.stage1.listTitle": "Zugänge entziehen",
	"offboarding.stage1.listLead":
		"Fällige Austritte und fehlende EV-IDs werden per Prozess entzogen. Künftige Austrittsdaten bleiben Watchlist.",
	"offboarding.stage1.empty": "Keine Einträge.",
	"offboarding.stage2.badge": "Konto löschen",
	"offboarding.stage2.title": "Authentik-Konto löschen",
	"offboarding.stage2.lead":
		"Nur Konten mit entzogenem Zugang. Löschung nach Schonfrist oder manuell.",
	"offboarding.stage2.irreversible": "Unwiderruflich: Konto wird gelöscht.",
	"offboarding.stage2.listTitle": "Authentik-Konto löschen",
	"offboarding.stage2.listLead":
		"Nach Schritt 1. Prozess löscht erst nach Schonfrist; Einzelaktion jederzeit möglich.",
	"offboarding.stage2.empty": "Keine Einträge.",
	"offboarding.action.revoke": "Rolle entfernen",
	"offboarding.action.revokeWatchlist": "Erst nach Austrittsdatum möglich",
	"offboarding.action.delete": "Konto löschen",
	"offboarding.dialogCancel": "Abbrechen",
	"offboarding.dialogDone": "Fertig",
	"offboarding.revoke.title": "Mitglieder-Rolle entfernen",
	"offboarding.revoke.lead":
		"Entfernt die Mitglieder-Gruppe in Authentik. EasyVerein bleibt unverändert.",
	"offboarding.revoke.bulletRemove": "Mitglieder-Gruppe in Authentik entfernen",
	"offboarding.revoke.bulletKeepAccount":
		"Merkt den Entzug; Konto erscheint danach unter Schritt 2",
	"offboarding.revoke.confirm": "Mitglieder-Rolle entfernen",
	"offboarding.revoke.submitting": "Wird entfernt…",
	"offboarding.revoke.success":
		"Mitglieder-Rolle für {name} entfernt. Das Konto liegt jetzt in Schritt 2.",
	"offboarding.delete.title": "Authentik-Konto löschen",
	"offboarding.delete.lead":
		"Benutzer in Authentik endgültig entfernen. Das kann nicht rückgängig gemacht werden.",
	"offboarding.delete.calloutTitle": "Dauerhaft löschen",
	"offboarding.delete.calloutBody":
		"Der Authentik-Benutzer wird gelöscht, inkl. Gruppen und Login.",
	"offboarding.delete.bulletPermanent": "Löschung ist unwiderruflich",
	"offboarding.delete.bulletLogin": "Keine Anmeldung mehr über dieses Konto",
	"offboarding.delete.confirm": "Konto endgültig löschen",
	"offboarding.delete.submitting": "Wird gelöscht…",
	"offboarding.delete.success": "{name} wurde aus Authentik gelöscht.",
	"offboarding.errorUnauthorized": "Keine Berechtigung für diese Aktion.",
	"offboarding.errorInvalid": "Ungültige Anfrage.",
	"offboarding.errorNotEligible":
		"Dieses Konto ist für diese Offboarding-Aktion nicht freigegeben.",
	"offboarding.errorApiMissing":
		"Authentik-API ist nicht konfiguriert. Aktion nicht möglich.",
	"offboarding.errorUserNotFound": "Benutzer in Authentik nicht gefunden.",
	"offboarding.errorGroupMissing":
		"Mitglieder-Gruppe in Authentik wurde nicht gefunden.",
	"offboarding.errorRevokeFailed":
		"Mitglieder-Rolle konnte nicht entfernt werden.",
	"offboarding.errorDeleteFailed": "Konto konnte nicht gelöscht werden.",
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
	"members.filterMatchAny": "Oder",
	"members.filterMatchAll": "Und",
	"members.filterMatchHint":
		"Oder: mindestens eine Gruppe · Und: alle gewählten Gruppen",
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
		"Lokale Beispieldaten - in Produktion siehst du echte Mitglieder.",
	"members.openProfile": "Profil öffnen",
	"profile.title": "Mitgliedsprofil",
	"profile.lead": "Stammdaten und Connect-Integrationen.",
	"profile.loading": "Profil wird geladen…",
	"profile.notFound": "Kein Profil für diese Person gefunden.",
	"profile.error": "Profil konnte nicht geladen werden.",
	"profile.errorApi":
		"Authentik-API ist nicht konfiguriert. Profilabfrage nicht möglich.",
	"profile.fieldName": "Name",
	"profile.fieldUsername": "Benutzername",
	"profile.fieldEmail": "E-Mail",
	"profile.openInAuthentik": "Authentik",
	"profile.openGroupsInAuthentik": "Gruppen in Authentik bearbeiten",
	"profile.empty": "-",
	"profile.ressorts": "Ressorts",
	"profile.noRessorts": "Kein Ressort zugewiesen.",
	"profile.groups": "Gruppen",
	"profile.integrations": "Integrationen",
	"profile.github": "GitHub",
	"profile.discord": "Discord",
	"profile.connected": "Einrichtung abgeschlossen",
	"profile.notConnected": "Nicht eingerichtet",
	"profile.editRoles": "Ressorts",
	"profile.editRolesHint": "Ressorts zuweisen.",
	"profile.saveGroups": "Speichern",
	"profile.savingGroups": "Wird gespeichert…",
	"profile.groupsSaved": "Gruppen aktualisiert.",
	"profile.errorGroupsUnauthorized": "Keine Berechtigung zum Bearbeiten.",
	"profile.errorGroupsInvalid": "Ungültige Gruppenauswahl.",
	"profile.errorGroupsProtected":
		"Geschützte Gruppen können hier nicht geändert werden.",
	"profile.errorGroupsNotFound": "Benutzer oder Gruppe nicht gefunden.",
	"profile.errorGroupsApi": "Authentik-API ist nicht konfiguriert.",
	"profile.errorGroupsFailed": "Gruppen konnten nicht gespeichert werden.",
	"profile.onboarding": "Onboarding",
	"profile.onboardingHint":
		"Neu im Verein → Am Onboarding Call teilgenommen → Projekt zugewiesen → Beitrag geleistet → Onboarding abgeschlossen.",
	"profile.onboardingSave": "Stufe speichern",
	"profile.onboardingSaving": "Wird gespeichert…",
	"profile.onboardingSaved": "Onboarding-Stufe aktualisiert.",
	"profile.onboardingContact": "Betreuung",
	"profile.onboardingContactHint":
		"Ansprechpartner aus HR, Vorstand oder Admin.",
	"profile.onboardingContactNone": "Keine Betreuung",
	"profile.onboardingContactAssignMe": "Mir zuweisen",
	"profile.onboardingContactSaving": "Betreuung wird gespeichert…",
	"profile.onboardingContactSaved": "Betreuung aktualisiert.",
	"profile.onboardingContactNotified":
		"Betreuung aktualisiert. Benachrichtigung gesendet.",
	"profile.onboardingContactNotifyFailed":
		"Betreuung aktualisiert. Benachrichtigung konnte nicht gesendet werden.",
	"profile.errorOnboardingInvalid": "Ungültige Onboarding-Stufe.",
	"profile.errorOnboardingNotFound": "Benutzer nicht gefunden.",
	"profile.errorOnboardingApi": "Authentik-API ist nicht konfiguriert.",
	"profile.errorOnboardingFailed":
		"Onboarding-Stufe konnte nicht gespeichert werden.",
	"profile.errorContactInvalid": "Ungültige Betreuungsperson.",
	"profile.errorContactNotFound": "Benutzer nicht gefunden.",
	"profile.errorContactApi": "Authentik-API ist nicht konfiguriert.",
	"profile.errorContactFailed": "Betreuung konnte nicht gespeichert werden.",
	"ressort.management": "Management",
	"ressort.designMarketing": "Design & Marketing",
	"ressort.engineering": "Engineering",
	"ressort.events": "Events",
	"scanner.eyebrow": "Verifizierung",
	"scanner.title": "Member-ID Scanner",
	"scanner.lead":
		"Neuland Member-ID scannen, Signatur prüfen und Mitglied im Verzeichnis nachschlagen.",
	"scanner.cameraHint": "Halte die Member-ID vor die Kamera.",
	"scanner.cameraHintFrame":
		"Positioniere den QR-Code im Rahmen zur automatischen Erkennung.",
	"scanner.cameraStarting": "Kamera wird gestartet…",
	"scanner.cameraRetry": "Erneut versuchen",
	"scanner.cameraErrorGeneric":
		"Kamerazugriff verweigert oder nicht verfügbar.",
	"scanner.cameraErrorUnsupported":
		"Kamera-API wird nicht unterstützt. Bitte HTTPS und einen modernen Browser verwenden.",
	"scanner.cameraErrorDenied":
		"Kamerazugriff verweigert. Bitte Berechtigung erteilen und erneut versuchen.",
	"scanner.cameraErrorNotFound": "Keine Kamera auf diesem Gerät gefunden.",
	"scanner.cameraErrorBusy":
		"Die Kamera wird bereits von einer anderen Anwendung verwendet.",
	"scanner.awaitingTitle": "Warte auf Scan",
	"scanner.awaitingLead":
		"Scanne die digitale Member-ID eines Mitglieds zur Verifizierung.",
	"scanner.awaitingHint":
		"In Neuland Next den QR-Code antippen, um ihn im Vollbild anzuzeigen.",
	"scanner.resultValid": "Verifizierung erfolgreich",
	"scanner.resultInvalid": "Verifizierung fehlgeschlagen",
	"scanner.resultDuplicate": "Bereits verifiziert",
	"scanner.resultValidLead": "Signatur der Member-ID ist gültig.",
	"scanner.badgeValid": "Gültig",
	"scanner.badgeInvalid": "Ungültig",
	"scanner.errorInvalidSignature": "Ungültige Signatur",
	"scanner.errorExpired": "Member-ID ist abgelaufen",
	"scanner.fieldName": "Name",
	"scanner.fieldSub": "User-ID",
	"scanner.fieldIssued": "Ausgestellt",
	"scanner.fieldExpires": "Gültig bis",
	"scanner.fieldType": "QR-Typ",
	"scanner.typeApp": "App Member-ID",
	"scanner.typeApple": "Apple Wallet",
	"scanner.typeAndroid": "Google Wallet",
	"scanner.enrichTitle": "Verzeichnis",
	"scanner.enrichLoading": "Mitglied wird nachgeschlagen…",
	"scanner.enrichMissing":
		"Kein Eintrag im Authentik-Verzeichnis für diese User-ID.",
	"scanner.enrichError":
		"Verzeichnisabfrage fehlgeschlagen. Die kryptografische Prüfung bleibt gültig.",
	"scanner.enrichErrorApi":
		"Authentik-API ist nicht konfiguriert. Verzeichnisabfrage nicht möglich.",
	"scanner.enrichInactive": "Inaktiv",
	"scanner.enrichNotMember": "Kein Mitglied",
	"scanner.openProfile": "Profil anzeigen",
	"scanner.publicKeyLoading": "Öffentlicher Schlüssel wird geladen…",
	"scanner.publicKeyUnavailable":
		"Scanner nicht verfügbar - öffentlicher Schlüssel konnte nicht geladen werden.",
	"scanner.publicKeyRetry": "Schlüssel erneut laden",
	"scanner.historyTitle": "Lokale Historie",
	"scanner.historyHint": "Nur auf diesem Gerät gespeichert.",
	"scanner.historyDownloadJson": "JSON",
	"scanner.historyDownloadMd": "Markdown",
	"scanner.historyClear": "Leeren",
	"error.oauth_session_missing":
		"Sitzung abgelaufen. Bitte melde dich erneut an.",
	"error.id_token_missing_sub":
		"Anmeldung unvollständig. Bitte erneut versuchen.",
	"error.login_failed": "Anmeldung fehlgeschlagen.",
	"error.generic": "Etwas ist schiefgelaufen.",
	"spinner.fun.1": "Geduld…",
	"spinner.fun.2": "Noch einen Moment.",
	"spinner.fun.3": "Die Daten sind unterwegs.",
	"spinner.fun.4": "Gleich soweit.",
	"spinner.fun.5": "Bitte kurz warten.",
	"spinner.fun.6": "Noch nicht weg.",
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
	"nav.scanner": "Scanner",
	"nav.applications": "Applications",
	"nav.onboarding": "Onboarding",
	"nav.offboarding": "Offboarding",
	"nav.audit": "Audit log",
	"nav.openMenu": "Open menu",
	"nav.closeMenu": "Close menu",
	"nav.collapseSidebar": "Collapse sidebar",
	"nav.expandSidebar": "Expand sidebar",
	"audit.eyebrow": "Accountability",
	"audit.title": "Audit log",
	"audit.lead": "Who triggered which portal action.",
	"audit.loading": "Loading audit entries…",
	"audit.empty": "No audit entries yet.",
	"audit.count": "{count} entries",
	"audit.retry": "Try again",
	"audit.status.ok": "Succeeded",
	"audit.status.failed": "Failed",
	"audit.targetNone": "-",
	"audit.actorTarget": "by {actor} · {target}",
	"audit.searchPlaceholder": "Search actor, target, or error…",
	"audit.filterAction": "Action",
	"audit.filterActionAll": "All actions",
	"audit.filterStatus": "Result",
	"audit.filterStatusAll": "All results",
	"audit.showing": "{filtered} of {total}",
	"audit.emptyFiltered": "No matches for the current filters.",
	"audit.action.application.accept": "Application accepted",
	"audit.action.member.create": "Account created manually",
	"audit.action.member.groups.update": "Groups updated",
	"audit.action.member.onboarding_stage.update": "Onboarding stage updated",
	"audit.action.member.onboarding_contact.update": "Onboarding contact updated",
	"audit.action.offboarding.revoke_mitglieder": "Mitglieder role removed",
	"audit.action.offboarding.delete_account": "Account deleted",
	"shortcuts.title": "Keyboard shortcuts",
	"shortcuts.lead": "Common actions without reaching for the mouse.",
	"shortcuts.sectionGeneral": "General",
	"shortcuts.sectionGo": "Go to",
	"shortcuts.focusSearch": "Focus search",
	"shortcuts.toggleSidebar": "Toggle sidebar",
	"shortcuts.showHelp": "Open help",
	"help.open": "Open help",
	"help.sheetTitle": "Documentation",
	"help.shortcutsCta": "Show keyboard shortcuts",
	"help.home.title": "Portal overview",
	"help.home.lead":
		"Quick guide to the Neuland HR portal: roles, modules, and where to find what.",
	"help.home.intro":
		"This portal is the UI for membership admin and HR workflows. Authentik remains the only source of truth for users, groups, and access: there is no local member database. What you see and can do depends on your Authentik group membership.",
	"help.home.s1.heading": "Access and roles",
	"help.home.s1.body":
		"Access is granted to HR, board (Vorstand), and admin. Mapping comes from configurable Authentik groups. Admin has the same in-app permissions as board (elevated). Without a matching group you land on the no-access page.",
	"help.home.s2.heading": "What HR can use",
	"help.home.s2.body":
		"HR sees home, the member directory, scanner, and onboarding. There you can open profiles, set onboarding stages, and scan IDs. Applications, offboarding, and audit are hidden from HR and blocked on the server.",
	"help.home.s3.heading": "What board and admin get extra",
	"help.home.s3.body":
		"Elevated roles also see applications (accept EasyVerein), offboarding (revoke Mitglieder and delete accounts), the audit log, email addresses in the directory, and ressort group editing on profiles.",
	"help.home.s4.heading": "Help and shortcuts",
	"help.home.s4.body":
		"Press “?” (key or the header button) to open this documentation for the current module. The keyboard-shortcut list stays available via the keyboard icon in the sidebar (e.g. “f” for search and “g” plus a letter for navigation).",
	"help.members.title": "Members",
	"help.members.lead":
		"Browse Authentik users, open profiles, and keep onboarding progress up to date.",
	"help.members.intro":
		"The directory lists users directly from Authentik. It is not a CRM and does not store its own master data. Group or onboarding-stage changes write back to Authentik (attributes or group membership).",
	"help.members.s1.heading": "Directory and search",
	"help.members.s1.body":
		"Filter by name or email. Email addresses in the directory are visible to board/admin only; HR works with names and groups. Click a row to open the profile as a sheet from the right.",
	"help.members.s2.heading": "Profile contents",
	"help.members.s2.body":
		"The profile shows core data, groups (including ressorts), Connect integrations, and onboarding stage. When present, the EasyVerein member id is stored as an attribute: it links Authentik to EasyVerein for offboarding and accept.",
	"help.members.s3.heading": "Onboarding stage",
	"help.members.s3.body":
		"The stage (0–4) controls grouping on the onboarding page: New to the club, Onboarding call, Project assigned, Contribution made, Onboarding complete. Set it here on the profile or on the onboarding card. It is a human progress marker, not a checklist and not an automated queue.",
	"help.members.s4.heading": "Editing groups",
	"help.members.s4.body":
		"Only board/admin can change ressort groups on the profile. Protected groups (including HR, Vorstand, Admin, Ehrenmitglied, technical-users, mitglieder) cannot be changed through the portal: that prevents accidental privilege or membership changes.",
	"help.scanner.title": "Scanner",
	"help.scanner.lead":
		"Verify membership-card QR codes and open the matching profile on a hit.",
	"help.scanner.intro":
		"The scanner verifies signed member IDs with the public key from the card infrastructure. It is for on-site checks (events, access), not for accepting applicants.",
	"help.scanner.s1.heading": "Scanning",
	"help.scanner.s1.body":
		"Use the camera or enter the code manually. Without a loadable public key the scanner is unavailable: reload the key or check configuration.",
	"help.scanner.s2.heading": "Result",
	"help.scanner.s2.body":
		"On a valid signature you see name and status. If the entry matches an Authentik user, you can open the member profile directly.",
	"help.scanner.s3.heading": "Local history",
	"help.scanner.s3.body":
		"Scan history is stored only in this browser on this device and is not synced to the server. You can clear it at any time.",
	"help.applications.title": "Applications",
	"help.applications.lead":
		"Accept open EasyVerein applications: Authentik account, welcome mail, and membership close-out.",
	"help.applications.intro":
		"This page is board/admin only. It lists EasyVerein members with is_application=true. Declining is not in the portal yet: use EasyVerein directly for that.",
	"help.applications.s1.heading": "List and search",
	"help.applications.s1.body":
		"The list comes live from the EasyVerein API. Search by name or email. If the API token is missing, you get a configuration error instead of an empty list.",
	"help.applications.s2.heading": "Accepting an application",
	"help.applications.s2.body":
		"On accept the portal first creates the Authentik user (including easyVereinMemberId), sends the welcome mail, then updates EasyVerein (close application, set join date if missing). If EasyVerein fails after a successful Authentik create, you get a hint to finish manually.",
	"help.applications.s3.heading": "SEPA mandate",
	"help.applications.s3.body":
		"When an IBAN is present and no SEPA mandate is set yet, the portal tries to set a mandate after accept (date = application date or today, reference NL{memberId}-YYYYMMDD). A mandate failure does not roll back accept: you only see an alert.",
	"help.applications.s4.heading": "Manual create",
	"help.applications.s4.body":
		"“Manual create” in the header lets you create an Authentik account without an open EasyVerein application (e.g. legacy cases). The normal path for new members remains accepting from this list.",
	"help.onboarding.title": "Onboarding",
	"help.onboarding.lead":
		"Group recent Authentik accounts by human progress over the last weeks.",
	"help.onboarding.intro":
		"Onboarding is not a task queue and not a checklist workflow. It shows members whose Authentik account was created in the last 12 weeks, grouped by attributes.onboardingStage. Optionally assign a staff contact (attributes.onboardingContact). Prefer creating new accounts via Applications.",
	"help.onboarding.s1.heading": "Time window and cards",
	"help.onboarding.s1.body":
		"Only accounts from the last twelve weeks appear here. Cards sit under their stage - side by side as columns on wide screens, stacked otherwise. Click opens the same profile sheet as in the member directory. Filters: all / mine / unassigned.",
	"help.onboarding.s2.heading": "Stages 0–4",
	"help.onboarding.s2.body":
		"0 New to the club · 1 Onboarding call · 2 Project assigned · 3 Contribution made · 4 Onboarding complete. Meanings are defined by the team; the portal only stores the number in Authentik. Drag a card into another stage, or adjust it via the slider on the profile.",
	"help.onboarding.s3.heading": "Assign a contact",
	"help.onboarding.s3.body":
		"On the profile you can set someone from HR, board, or admin as the point of contact (or assign yourself). This is contact metadata only - not a task list and not due dates. The assignment is stored in Authentik and written to the audit log.",
	"help.onboarding.s4.heading": "Recommended flow",
	"help.onboarding.s4.body":
		"Accept the application under Applications → the person appears here after date_joined → assign a contact → advance the stage in day-to-day work. Manual create is for exceptions, not the default process.",
	"help.offboarding.title": "Offboarding",
	"help.offboarding.lead":
		"Two-step Authentik pipeline: revoke the Mitglieder role, then delete the account.",
	"help.offboarding.intro":
		"Board/admin only. EasyVerein is checked read-only: this page does not write to EasyVerein. The goal is to remove left or unlinked member accounts from Authentik in a controlled way without touching unrelated non-member accounts.",
	"help.offboarding.s1.heading": "Stage 1: revoke Mitglieder",
	"help.offboarding.s1.body":
		"Candidates are member accounts without easyVereinMemberId, or with a linked EasyVerein id that has left / been deleted / is missing (including wastebasket snapshot, ~5 min cache). A future resignation date alone stays on the watchlist. Revoke removes the Mitglieder group and sets attributes.membershipRevokedAt.",
	"help.offboarding.s2.heading": "Stage 2: delete account",
	"help.offboarding.s2.body":
		"Delete candidates are only accounts with membershipRevokedAt set. “No longer Mitglieder” alone is not enough: that keeps random non-member accounts safe. Deletion is permanent (Authentik DELETE).",
	"help.offboarding.s3.heading": "Start process",
	"help.offboarding.s3.body":
		"“Start process” does not run on page load and is not a cron job. It revokes due stage-1 candidates and deletes stage-2 accounts after the grace period (OFFBOARDING_DELETE_GRACE_DAYS, default 14). Per-row actions remain available. You cannot target yourself.",
	"help.offboarding.s4.heading": "Action safety",
	"help.offboarding.s4.body":
		"Every mutation re-checks that the id is still in the current candidate set. Watchlist rows and arbitrary ids are rejected. Confirmation dialogs explain the consequences before running.",
	"help.audit.title": "Audit",
	"help.audit.lead": "See which person in the portal triggered which action.",
	"help.audit.intro":
		"Technical Authentik API calls use the service token. The audit log also records the OIDC session user as actor, so you know who clicked in the portal, not only which system account wrote the change.",
	"help.audit.s1.heading": "Who can see it",
	"help.audit.s1.body":
		"Board and admin only. HR has no nav entry and no API access. The log is append-only (JSONL) and is not an identity or member store.",
	"help.audit.s2.heading": "Which actions",
	"help.audit.s2.body":
		"Logged items include accepting applications, manual account create, group changes, onboarding-stage and contact updates, and offboarding revoke/delete. Filter by action type or search actor and target.",
	"help.audit.s3.heading": "Operations",
	"help.audit.s3.body":
		"The file lives at AUDIT_LOG_PATH (default data/audit.jsonl). In production the path should be on a persistent volume. The app also emits [audit] lines to stdout.",
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
	"home.openApplications": "Open applications",
	"home.openOffboarding": "Open offboarding",
	"home.openOnboarding": "Open onboarding",
	"home.signedInAs": "Signed in as {email}",
	"home.statMembers": "Members",
	"home.statRessort": "With ressort",
	"home.statOnboarding": "In onboarding",
	"home.statMock": "Local sample data",
	"home.statUnavailable": "Could not be loaded right now",
	"home.statMembersHint": "Active club members",
	"home.statRessortHint": "Assigned to at least one ressort",
	"home.statOnboardingHint": "New accounts (12 weeks), not yet done",
	"home.actionMembersTitle": "Members",
	"home.actionMembersDesc": "Search, filter, and sort the members directory.",
	"home.moduleOnboardingTitle": "Onboarding",
	"home.moduleOnboardingDesc": "New Authentik accounts from the last weeks.",
	"home.moduleApplicationsTitle": "Applications",
	"home.moduleApplicationsDesc":
		"Review and approve incoming membership applications.",
	"home.moduleOffboardingTitle": "Offboarding",
	"home.moduleOffboardingDesc":
		"Revoke Mitglieder roles and delete Authentik accounts after departure.",
	"home.profileHint":
		"Profile and roles are managed centrally through your Neuland account.",
	"home.pendingCount": "{count} open",
	"home.pendingCountZero": "None open",
	"home.pendingCountUnavailable": "Count unavailable",
	"applications.eyebrow": "Workflows",
	"applications.title": "Applications",
	"applications.lead":
		"Review membership applications, decide, and track follow-ups.",
	"applications.leadLive":
		"Review open EasyVerein applications. Accepting creates the Authentik account and sends the welcome email.",
	"applications.bulletReview": "Review applications in a queue",
	"applications.bulletDecide": "Approve or decline with a reason",
	"applications.bulletNotify": "Notify applicants automatically",
	"applications.bulletHistory": "Keep decisions auditable",
	"applications.colName": "Name",
	"applications.colEmail": "Email",
	"applications.colDate": "Applied",
	"applications.colActions": "Actions",
	"applications.searchPlaceholder": "Search name or email…",
	"applications.count": "{count} applications",
	"applications.showing": "{filtered} of {total}",
	"applications.loading": "Loading applications…",
	"applications.empty": "No open membership applications.",
	"applications.emptyFiltered": "No matches for the current search.",
	"applications.retry": "Try again",
	"applications.errorLoad":
		"Applications could not be loaded. Please try again.",
	"applications.errorApiMissing":
		"EasyVerein API is not configured (EASYVEREIN_API_TOKEN).",
	"applications.errorNotFound": "Application was not found.",
	"applications.errorNotPending":
		"This application is no longer pending - please refresh the list.",
	"applications.errorAcceptFailed": "Accept failed.",
	"applications.errorAcceptPartial":
		"Authentik account “{username}” was created, but EasyVerein could not be updated. Please finish that step manually.",
	"applications.accept": "Accept",
	"applications.acceptTitle": "Accept application?",
	"applications.acceptLead":
		"Accept the EasyVerein application, create the Authentik account, and send the welcome email.",
	"applications.acceptConfirm": "Yes, accept",
	"applications.acceptCancel": "Cancel",
	"applications.acceptDone": "Close",
	"applications.acceptSubmitting": "Accepting…",
	"applications.acceptSubmittingHint": "This can take a few seconds.",
	"applications.acceptStepAccount": "Creating Authentik account…",
	"applications.acceptStepEmail": "Sending welcome email…",
	"applications.acceptStepEasyVerein": "Updating EasyVerein…",
	"applications.acceptStepSepa": "Setting SEPA mandate…",
	"applications.acceptSuccess":
		"Application accepted. Account “{username}” was created.",
	"applications.acceptSepaNoIban":
		"No IBAN: SEPA mandate was not set. Please finish that step in EasyVerein.",
	"applications.acceptSepaNoContact":
		"No EasyVerein contact: SEPA mandate was not set.",
	"applications.acceptSepaFailed":
		"SEPA mandate could not be set: please finish that step in EasyVerein.",
	"applications.manualCreate": "Create account manually",
	"applications.manualCreateTitle": "Create account manually",
	"applications.manualCreateLead":
		"Only for edge cases without an EasyVerein application. Creates an Authentik account and sends the welcome email.",
	"applications.manualCreateDone": "Close",
	"onboarding.eyebrow": "Workflows",
	"onboarding.title": "Onboarding",
	"onboarding.lead":
		"Bring new members up to speed - from access to welcome steps.",
	"onboarding.leadLive": "Members from the last 12 weeks.",
	"onboarding.bulletChecklist": "Role-based task lists",
	"onboarding.bulletAccess": "Prepare access and groups",
	"onboarding.bulletWelcome": "Welcome steps and appointments",
	"onboarding.bulletTrack": "Progress for HR & board",
	"onboarding.recent.contact": "Contact: {name}",
	"onboarding.recent.contactAssigned": "Has contact",
	"onboarding.recent.contactNone": "No contact",
	"onboarding.recent.empty":
		"No new member accounts in the last {weeks} weeks.",
	"onboarding.recent.loading": "Loading new members…",
	"onboarding.loadingHint":
		"Recent Authentik accounts from the last weeks - grouped by onboarding progress and contact.",
	"onboarding.loadingStepAccounts": "Loading recent Authentik accounts…",
	"onboarding.loadingStepMitglieder": "Matching the Mitglieder group…",
	"onboarding.loadingStepStages": "Building the onboarding stages…",
	"onboarding.recent.mockHint":
		"Local mock data - Authentik API is not configured.",
	"onboarding.recent.errorApiMissing":
		"Authentik API is not configured. Cannot load new members.",
	"onboarding.recent.errorLoad": "Could not load new members.",
	"onboarding.recent.retry": "Try again",
	"onboarding.filter.label": "Filter by contact",
	"onboarding.filter.all": "All",
	"onboarding.filter.mine": "Mine",
	"onboarding.filter.unassigned": "Unassigned",
	"onboarding.filter.empty": "No entries for this filter.",
	"onboarding.stage.empty": "No member in this stage.",
	"onboarding.stage.new": "New to the club",
	"onboarding.stage.conversation": "Onboarding call",
	"onboarding.stage.project": "Project assigned",
	"onboarding.stage.contributing": "Contribution made",
	"onboarding.stage.done": "Onboarding complete",
	"onboarding.stage.progress": "Onboarding progress",
	"onboarding.create.title": "Create account",
	"onboarding.create.lead":
		"Creates an Authentik user (firstname.lastname), sets a password, and sends the welcome email.",
	"onboarding.create.firstName": "First name",
	"onboarding.create.lastName": "Last name",
	"onboarding.create.email": "Email",
	"onboarding.create.firstNamePlaceholder": "Max",
	"onboarding.create.lastNamePlaceholder": "Mustermann",
	"onboarding.create.emailPlaceholder": "mam1234@thi.de",
	"onboarding.create.submit": "Create",
	"onboarding.create.reset": "Reset",
	"onboarding.create.submitting": "Creating…",
	"onboarding.create.success": "Account “{username}” was created.",
	"onboarding.create.successNoEmail":
		"The welcome email could not be sent - please share credentials manually.",
	"onboarding.create.errorUnauthorized": "Not authorized.",
	"onboarding.create.errorInvalid":
		"Please provide first name, last name, and a valid email.",
	"onboarding.create.errorApiMissing":
		"Authentik API is not configured. Account creation unavailable.",
	"onboarding.create.errorUsernameExists":
		"A user with this username already exists.",
	"onboarding.create.errorFailed": "Could not create the account.",
	"onboarding.preview.open": "Email preview",
	"onboarding.preview.title": "Welcome email",
	"onboarding.preview.lead":
		"Preview with sample data (Max Mustermann). This is what the mail looks like after account creation.",
	"onboarding.preview.loading": "Rendering preview…",
	"onboarding.preview.error": "Could not load the preview.",
	"offboarding.eyebrow": "Workflows",
	"offboarding.title": "Offboarding",
	"offboarding.lead":
		"Handle departures cleanly: access, handovers, and documentation.",
	"offboarding.leadLive":
		"Two Authentik steps: remove the Mitglieder group, then delete the account after a grace period.",
	"offboarding.process.title": "Run due actions",
	"offboarding.process.lead":
		"Removes the Mitglieder group from accounts that have already left or have no EasyVerein ID. Deletes accounts whose access was revoked at least {days} days ago. Future resignation dates are skipped.",
	"offboarding.process.button": "Run process",
	"offboarding.process.running": "Running…",
	"offboarding.process.confirm":
		"Remove Mitglieder roles for due accounts and delete accounts past the grace period?",
	"offboarding.process.result":
		"{revoked} roles removed, {deleted} accounts deleted. Skipped (future resignation): {skipped}. Errors: {errors}.",
	"offboarding.process.error": "Process failed. Please try again.",
	"offboarding.process.nothingDue.empty":
		"No offboarding candidates - nothing to run.",
	"offboarding.process.nothingDue.leaving":
		"{count} with a future resignation date - process runs on that day.",
	"offboarding.process.nothingDue.grace":
		"{count} still in the {days}-day grace period after access was revoked.",
	"offboarding.process.nothingDue.both":
		"{leaving} with a future resignation, {grace} still in the {days}-day grace period - nothing due yet.",
	"offboarding.process.phaseRevoke": "Removing Mitglieder role",
	"offboarding.process.phaseDelete": "Deleting account",
	"offboarding.process.progressCount": "{done} of {total}",
	"offboarding.process.current": "Current: {name}",
	"offboarding.process.counts":
		"Revoked {revoked}/{revokeTotal} · Deleted {deleted}/{deleteTotal} · Errors {errors}",
	"offboarding.candidatesTitle": "Offboarding candidates",
	"offboarding.candidatesLead":
		"Mitglieder without active EasyVerein membership, plus accounts with revoked access.",
	"offboarding.candidatesCount": "{count} candidates",
	"offboarding.candidatesShowing": "{filtered} of {total}",
	"offboarding.candidatesPage": "{from}–{to} of {total}",
	"offboarding.candidatesPrev": "Previous page",
	"offboarding.candidatesNext": "Next page",
	"offboarding.candidatesLoading": "Loading candidates…",
	"offboarding.loadingHint":
		"This can take a while: we cross-check EasyVerein with Authentik.",
	"offboarding.loadingStepAuthentik": "Loading Authentik accounts…",
	"offboarding.loadingStepEasyVerein": "Reconciling EasyVerein memberships…",
	"offboarding.loadingStepCandidates": "Building offboarding lists…",
	"offboarding.candidatesEmpty": "No offboarding candidates found.",
	"offboarding.candidatesError":
		"Candidates could not be loaded. Please try again.",
	"offboarding.noGroups": "No groups",
	"offboarding.colReason": "Reason",
	"offboarding.colRevoked": "Access revoked",
	"offboarding.colLeaveDate": "Departure",
	"offboarding.colAction": "Action",
	"offboarding.filterReasons": "Filter by reason",
	"offboarding.reason.membership_revoked": "Access revoked",
	"offboarding.reason.not_in_easyverein": "Not in EasyVerein",
	"offboarding.reason.left_easyverein": "EasyVerein departure",
	"offboarding.leaveOn": "Leaving on {date}",
	"offboarding.leftOn": "Left on {date}",
	"offboarding.leaveMissing": "No longer in EasyVerein",
	"offboarding.revokedToday": "today",
	"offboarding.revokedOneDayAgo": "1 day ago",
	"offboarding.revokedDaysAgo": "{days} days ago",
	"offboarding.pipeline.then": "Then",
	"offboarding.stageLabel": "Step {n}",
	"offboarding.stage1.badge": "Restrict access",
	"offboarding.stage1.title": "Remove Mitglieder role",
	"offboarding.stage1.lead":
		"Still in Mitglieder: missing EV ID, departed, or future departure (watchlist).",
	"offboarding.stage1.listTitle": "Revoke access",
	"offboarding.stage1.listLead":
		"Due departures and missing EV IDs are revoked by the process. Future resignation dates stay on the watchlist.",
	"offboarding.stage1.empty": "No entries.",
	"offboarding.stage2.badge": "Delete account",
	"offboarding.stage2.title": "Delete Authentik account",
	"offboarding.stage2.lead":
		"Only accounts with revoked access. Deleted after grace or manually.",
	"offboarding.stage2.irreversible":
		"Irreversible: the account will be deleted.",
	"offboarding.stage2.listTitle": "Delete Authentik account",
	"offboarding.stage2.listLead":
		"After step 1. Process deletes only after grace; per-row delete anytime.",
	"offboarding.stage2.empty": "No entries.",
	"offboarding.action.revoke": "Remove role",
	"offboarding.action.revokeWatchlist": "Available after leave date",
	"offboarding.action.delete": "Delete account",
	"offboarding.dialogCancel": "Cancel",
	"offboarding.dialogDone": "Done",
	"offboarding.revoke.title": "Remove Mitglieder role",
	"offboarding.revoke.lead":
		"Removes the Mitglieder group in Authentik. EasyVerein stays unchanged.",
	"offboarding.revoke.bulletRemove": "Remove Mitglieder group in Authentik",
	"offboarding.revoke.bulletKeepAccount":
		"Records the revoke; account then appears under step 2",
	"offboarding.revoke.confirm": "Remove Mitglieder role",
	"offboarding.revoke.submitting": "Removing…",
	"offboarding.revoke.success":
		"Mitglieder role removed for {name}. The account is now in step 2.",
	"offboarding.delete.title": "Delete Authentik account",
	"offboarding.delete.lead":
		"Permanently remove the user from Authentik. This cannot be undone.",
	"offboarding.delete.calloutTitle": "Permanent delete",
	"offboarding.delete.calloutBody":
		"The Authentik user is deleted, including groups and login.",
	"offboarding.delete.bulletPermanent": "Deletion is irreversible",
	"offboarding.delete.bulletLogin": "No further sign-in with this account",
	"offboarding.delete.confirm": "Delete account permanently",
	"offboarding.delete.submitting": "Deleting…",
	"offboarding.delete.success": "{name} was deleted from Authentik.",
	"offboarding.errorUnauthorized":
		"You are not allowed to perform this action.",
	"offboarding.errorInvalid": "Invalid request.",
	"offboarding.errorNotEligible":
		"This account is not eligible for this offboarding action.",
	"offboarding.errorApiMissing":
		"Authentik API is not configured. Action unavailable.",
	"offboarding.errorUserNotFound": "User not found in Authentik.",
	"offboarding.errorGroupMissing": "Mitglieder group not found in Authentik.",
	"offboarding.errorRevokeFailed": "Could not remove the Mitglieder role.",
	"offboarding.errorDeleteFailed": "Could not delete the account.",
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
	"members.filterMatchAny": "Or",
	"members.filterMatchAll": "And",
	"members.filterMatchHint":
		"Or: at least one group · And: all selected groups",
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
		"Local sample data - in production you will see real members.",
	"members.openProfile": "Open profile",
	"profile.title": "Member profile",
	"profile.lead": "Identity fields and Connect integrations.",
	"profile.loading": "Loading profile…",
	"profile.notFound": "No profile found for this person.",
	"profile.error": "Profile could not be loaded.",
	"profile.errorApi":
		"Authentik API is not configured. Profile lookup unavailable.",
	"profile.fieldName": "Name",
	"profile.fieldUsername": "Username",
	"profile.fieldEmail": "Email",
	"profile.openInAuthentik": "Authentik",
	"profile.openGroupsInAuthentik": "Edit groups in Authentik",
	"profile.empty": "-",
	"profile.ressorts": "Ressorts",
	"profile.noRessorts": "No ressort assigned.",
	"profile.groups": "Groups",
	"profile.integrations": "Integrations",
	"profile.github": "GitHub",
	"profile.discord": "Discord",
	"profile.connected": "Set up",
	"profile.notConnected": "Not set up",
	"profile.editRoles": "Ressorts",
	"profile.editRolesHint": "Assign ressorts.",
	"profile.saveGroups": "Save",
	"profile.savingGroups": "Saving…",
	"profile.groupsSaved": "Groups updated.",
	"profile.errorGroupsUnauthorized": "You do not have permission to edit.",
	"profile.errorGroupsInvalid": "Invalid group selection.",
	"profile.errorGroupsProtected": "Protected groups cannot be changed here.",
	"profile.errorGroupsNotFound": "User or group not found.",
	"profile.errorGroupsApi": "Authentik API is not configured.",
	"profile.errorGroupsFailed": "Groups could not be saved.",
	"profile.onboarding": "Onboarding",
	"profile.onboardingHint":
		"New to the club → Onboarding call → Project assigned → Contribution made → Onboarding complete.",
	"profile.onboardingSave": "Save stage",
	"profile.onboardingSaving": "Saving…",
	"profile.onboardingSaved": "Onboarding stage updated.",
	"profile.onboardingContact": "Contact",
	"profile.onboardingContactHint": "Point of contact from HR, board, or admin.",
	"profile.onboardingContactNone": "No contact",
	"profile.onboardingContactAssignMe": "Assign to me",
	"profile.onboardingContactSaving": "Saving contact…",
	"profile.onboardingContactSaved": "Contact updated.",
	"profile.onboardingContactNotified": "Contact updated. Notification sent.",
	"profile.onboardingContactNotifyFailed":
		"Contact updated. Notification could not be sent.",
	"profile.errorOnboardingInvalid": "Invalid onboarding stage.",
	"profile.errorOnboardingNotFound": "User not found.",
	"profile.errorOnboardingApi": "Authentik API is not configured.",
	"profile.errorOnboardingFailed": "Onboarding stage could not be saved.",
	"profile.errorContactInvalid": "Invalid onboarding contact.",
	"profile.errorContactNotFound": "User not found.",
	"profile.errorContactApi": "Authentik API is not configured.",
	"profile.errorContactFailed": "Onboarding contact could not be saved.",
	"ressort.management": "Management",
	"ressort.designMarketing": "Design & Marketing",
	"ressort.engineering": "Engineering",
	"ressort.events": "Events",
	"scanner.eyebrow": "Verification",
	"scanner.title": "Member ID Scanner",
	"scanner.lead":
		"Scan a Neuland Member ID, verify the signature, and look up the member in the directory.",
	"scanner.cameraHint": "Hold the Member ID up to the camera.",
	"scanner.cameraHintFrame":
		"Position the QR code within the frame for automatic detection.",
	"scanner.cameraStarting": "Starting camera…",
	"scanner.cameraRetry": "Try again",
	"scanner.cameraErrorGeneric": "Camera access denied or not available.",
	"scanner.cameraErrorUnsupported":
		"Camera API not supported. Please use HTTPS and a modern browser.",
	"scanner.cameraErrorDenied":
		"Camera access denied. Please allow camera permissions and try again.",
	"scanner.cameraErrorNotFound": "No camera found on this device.",
	"scanner.cameraErrorBusy": "Camera is already in use by another application.",
	"scanner.awaitingTitle": "Awaiting scan",
	"scanner.awaitingLead": "Scan a member’s digital Member ID to verify it.",
	"scanner.awaitingHint":
		"In Neuland Next, tap the QR code to view it full-screen.",
	"scanner.resultValid": "Verification successful",
	"scanner.resultInvalid": "Verification failed",
	"scanner.resultDuplicate": "Already verified",
	"scanner.resultValidLead": "Member ID signature is valid.",
	"scanner.badgeValid": "Valid",
	"scanner.badgeInvalid": "Invalid",
	"scanner.errorInvalidSignature": "Invalid signature",
	"scanner.errorExpired": "Member ID has expired",
	"scanner.fieldName": "Name",
	"scanner.fieldSub": "User ID",
	"scanner.fieldIssued": "Issued",
	"scanner.fieldExpires": "Expires",
	"scanner.fieldType": "QR type",
	"scanner.typeApp": "App Member ID",
	"scanner.typeApple": "Apple Wallet",
	"scanner.typeAndroid": "Google Wallet",
	"scanner.enrichTitle": "Directory",
	"scanner.enrichLoading": "Looking up member…",
	"scanner.enrichMissing": "No Authentik directory entry for this user ID.",
	"scanner.enrichError":
		"Directory lookup failed. Cryptographic verification still stands.",
	"scanner.enrichErrorApi":
		"Authentik API is not configured. Directory lookup unavailable.",
	"scanner.enrichInactive": "Inactive",
	"scanner.enrichNotMember": "Not a member",
	"scanner.openProfile": "View profile",
	"scanner.publicKeyLoading": "Loading public key…",
	"scanner.publicKeyUnavailable":
		"Scanner unavailable - could not load the public key.",
	"scanner.publicKeyRetry": "Reload key",
	"scanner.historyTitle": "Local history",
	"scanner.historyHint": "Stored only on this device.",
	"scanner.historyDownloadJson": "JSON",
	"scanner.historyDownloadMd": "Markdown",
	"scanner.historyClear": "Clear",
	"error.oauth_session_missing": "Session expired. Please sign in again.",
	"error.id_token_missing_sub": "Sign-in incomplete. Please try again.",
	"error.login_failed": "Sign-in failed.",
	"error.generic": "Something went wrong.",
	"spinner.fun.1": "Patience…",
	"spinner.fun.2": "One moment.",
	"spinner.fun.3": "Data's on its way.",
	"spinner.fun.4": "Almost ready.",
	"spinner.fun.5": "Just a sec.",
	"spinner.fun.6": "Still here.",
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
