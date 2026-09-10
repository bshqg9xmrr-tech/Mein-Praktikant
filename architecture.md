# architecture.md — technische architektur

> voraussetzung: `context.md` gelesen. dieses dokument beschreibt den technischen zuschnitt von "mein praktikant" — plattformwahl, module, datenmodell, integrationen, sync- und sicherheitsstrategie.

## 1. leitprinzipien

1. **offline-first**: alle kernfunktionen (todos, ziele, notizen, tagebuch, habits) funktionieren vollständig ohne internet. cloud-sync ist ein zusatz, kein voraussetzung.
2. **adhs-freundlich statt feature-reich**: jede funktion muss reibung senken, nicht erhöhen. lieber ein guter default als zehn einstellungen.
3. **ein datenmodell, zwei clients**: macOS und iPhone teilen sich code und datenmodell — keine parallel gepflegten apps.
4. **privacy by design**: nutzerdaten (v. a. tagebuch) sind sensibel. lokal verschlüsselt, cloud-versand nur transparent und zweckgebunden (siehe `memory.md` §4).
5. **klein starten, klar versionieren**: v1 = single-user, lokal, mit sauber vorbereiteten seams für multi-user + cloud-sync + zahlungen.

## 2. plattformstrategie

**empfehlung: natives Swift/SwiftUI-multiplatform-projekt** (ein Xcode-projekt, targets für macOS und iOS/iPadOS, gemeinsames domain-/datenmodul).

begründung:
- "offline als programm auf mac und iphone" passt exakt zu Apples App-Sandbox-modell (lokale datenbank, hintergrund-tasks, keychain).
- **EventKit** erlaubt echte, native kalender-integration (statt kalender-api-umwege) — wichtig für "todos spiegeln sich im kalender".
- lokale **notifications** (morgen-erinnerung, abend-tagebuch-popup) sind auf apple-plattformen ohne server am zuverlässigsten.
- **App Intents/Siri, Diktierfunktion, Handoff/iCloud** stehen "kostenlos" zur verfügung.
- ein team, eine sprache (Swift), ein datenmodell — geringere wartungslast als zwei separate stacks oder ein web-wrapper (Electron läuft nicht sinnvoll auf iPhone).

alternative (verworfen, aber dokumentiert): react native/Expo für gemeinsamen code über mehr plattformen hinweg. nachteil: schwächere offline-kalender-/notification-integration, zusätzliche abstraktionsschicht. nur relevant, falls android/windows-unterstützung mittelfristig gefordert wird (aktuell nicht der fall — **entschieden, siehe `context.md` §7.3**).

### 2.1 ki-schicht (hybrid, kostenlos & offline-first)

**entscheidung** (siehe `context.md` §7.9): markus möchte eine kostenlose, möglichst offline-fähige ki-lösung statt von anfang an auf die bezahlpflichtige claude-api zu setzen. dafür wird die ki-anbindung hinter einem gemeinsamen protokoll `AIProvider` abstrahiert (im `Integrations/`-modul), mit austauschbaren implementierungen:

1. **`OnDeviceAIClient`** (default, beide plattformen) — nutzt apples **Foundation Models framework** (ab macOS 15 / iOS 18), läuft komplett lokal auf dem gerät, kostenlos, kein setup, funktioniert vollständig offline. deckt einfachere ki-aufgaben ab: kategorisierung (bereich-erkennung), grobe dauer-schätzung, einfache formulierungsvorschläge.
2. **`OllamaClient`** (optional, nur macOS) — spricht mit einer lokal laufenden [Ollama](https://ollama.com)-instanz (z. b. Llama 3.1 8B oder Mistral 7B, konkrete modellwahl noch offen — siehe `context.md` §7 "noch offen"). deutlich leistungsfähiger als (1), weiterhin kostenlos & offline, aber nur auf dem mac praktikabel (rechenleistung). das iphone kann entweder direkt mit dem mac synchronisieren (sobald ein sync-kanal existiert, siehe §6) oder fällt automatisch auf (1) zurück.
3. **`ClaudeClient`** (optional, späteres bezahl-upgrade) — bleibt als hochwertigste option vorgesehen für aufgaben, die (1)/(2) überfordern (z. b. sehr differenzierte diktat-strukturierung, feinfühliger abend-coach-text). wird über die ohnehin geplante Stripe-anbindung als "pro"-feature freigeschaltet — **kein v1-bestandteil**.

**auswahllogik** (`AIProviderResolver`, domain-schicht): pro aufgabe wird das leistungsfähigste **verfügbare & vom nutzer erlaubte** backend gewählt (einstellbar in `UserSettings`, siehe §4.10) — standardmäßig (1), automatisch (2) falls auf dem mac konfiguriert & erreichbar, (3) nur wenn nutzer aktiv ein pro-abo hat. jede ki-gestützte ausgabe bleibt in der ui als solche gekennzeichnet ("ki-geschätzt", "ki-vorschlag") und dem nutzer wird nicht verborgen, welches backend gerade geantwortet hat (transparenz, passt zu leitprinzip §1.2).

domain-use-cases (`PlanDayUseCase`, `TranscriptProcessorUseCase`, `JournalReviewUseCase`, `CoachFeedbackUseCase`, ki-assistent aus §4.7) rufen ausschließlich gegen das `AIProvider`-protokoll auf, nie gegen ein konkretes backend direkt — austausch/erweiterung um weitere modelle bleibt so ohne umbau der domain-schicht möglich.

```
mein-praktikant/
├── App/                  # SwiftUI-app-targets (macOS, iOS) — nur composition/entry points
├── Features/             # feature-module (Goals, Tasks, Journal, Notes, Habits, Assistant)
├── Domain/                # use cases, geschäftslogik, planner-engine (plattformunabhängig)
├── Data/                  # local store (SwiftData/SQLite), repositories, sync-engine
├── Integrations/          # Auth0Client, StripeClient, WisprFlowClient, AIProvider (OnDeviceAIClient, OllamaClient, ClaudeClient), CalendarBridge, FeedbackClient
├── DesignSystem/          # liquid-glass komponenten (siehe ui_guidelines.md)
└── docs/                  # dieses dokumentenset
```

## 3. schichtenarchitektur

```
┌─────────────────────────────────────────────┐
│  presentation (SwiftUI views, DesignSystem)  │
├─────────────────────────────────────────────┤
│  domain (use cases: PlanDayUseCase,          │
│  BreakdownGoalUseCase, JournalReviewUseCase…) │
├─────────────────────────────────────────────┤
│  data (repositories, local store, sync queue)│
├─────────────────────────────────────────────┤
│  integrations (Auth0, Stripe, Wispr Flow,    │
│  Claude API, EventKit, UserNotifications)     │
└─────────────────────────────────────────────┘
```

domain-schicht kennt keine SwiftUI- oder integrations-details → gut testbar, austauschbar (z. b. supabase später ohne umbau der oberen schichten).

## 4. kernmodule

### 4.1 ziele & aufgaben (Goals & Tasks)
- ziel-hierarchie als **eine entität `goal`** mit `level` (year/quarter/month/week/day) und `parent_id` (rekursiv) statt fünf separater tabellen — reduziert komplexität, erlaubt beliebige zwischenebenen später.
- wochenziel-limit (2) und monatsziel-limit (3) sind **weiche validierung** in der domain-schicht (warnung, kein hard-block — adhs-realität: manchmal braucht es ausnahmen).
- `task` referenziert optional ein `goal` (wirkt darauf ein) und einen `area` (bereich).
- **zweistufiger flow** (nutzer-feedback, mockup-iteration 2 — siehe entwürfe "Capture" / "TodayDesktop"): task-erfassung und ki-planung sind bewusst **entkoppelt**:
  1. **CaptureUseCase**: legt einen `task` mit nur `title` an — `area`, `estimated_minutes`, `scheduled_at` bleiben zunächst leer/`null`. keine pflichtfelder, kein modal, keine kategorisierung nötig (niedrigste mögliche erfassungsschwelle).
  2. **PlanDayUseCase**: läuft explizit (nutzer tippt "ki plant meinen tag") oder automatisch zur morgen-erinnerung — reichert alle noch nicht eingeplanten tasks des tages an (bereich-erkennung, effort estimation, reihenfolge, pausen) und schreibt `scheduled_at` + `estimated_minutes`.
  3. **CalendarExportUseCase**: läuft **automatisch im anschluss** an schritt 2 (kein manueller extra-schritt) und schreibt die geplanten tasks als events über `CalendarBridge` in den systemkalender; ein "neu planen" verwirft die bisherige zuordnung und wiederholt schritte 2–3.
- **effort estimation**: heuristik aus (1) nutzer-history ähnlicher tasks (lernend), (2) fallback-schätzung per Claude API anhand aufgabentext, (3) manuelles override immer möglich. geschätzte werte werden in der ui als solche gekennzeichnet ("ki-geschätzt"), damit markus sieht, was automatisch kam vs. was er selbst gesetzt hat.
- **pausen**: PlanDayUseCase plant nach ~50–90 min fokusblöcken automatisch pausen-slots ein (konfigurierbar), die ebenfalls als kalender-blocker erscheinen und in der ui als ki-vorschlag markiert sind.

### 4.2 kalender-integration
- `CalendarBridge` (EventKit) spiegelt tasks mit start/dauer als events; änderungen im systemkalender (verschieben) fließen zurück in `task.scheduled_at`.
- kein zweiter, eigener kalender in der app — ein wahrheitsort (das systemkalender), um adhs-nutzer nicht zwei kalender pflegen zu lassen.

### 4.3 diktat/transkripte
- `WisprFlowClient`: holt/empfängt transkripte (push via api-webhook oder pull) → `TranscriptProcessorUseCase` extrahiert via Claude API strukturierte vorschläge (todos, notizen, tagebuch-kandidat) → nutzer bestätigt vor übernahme (kein silent-auto-import).
- fallback: manueller datei-upload (audio-transkript-text) über denselben verarbeitungs-pfad.

### 4.4 notizen
- einfache liste, tags optional, volltextsuche, teil des globalen retrieval-index (siehe `memory.md`).

### 4.5 tagebuch
- abend-notification (lokal, Uhrzeit einstellbar) → freitext oder diktat.
- **diktat für den gesamten tag** (nutzer-feedback, mockup-iteration 2): eine einzelne, ununterbrochene aufnahme (nicht sektion für sektion einzeln) läuft über denselben verarbeitungs-pfad wie `TranscriptProcessorUseCase` (§4.3), das ergebnis fließt direkt in `JournalReviewUseCase`.
- `JournalReviewUseCase` strukturiert eintrag in feste sektionen: `gratitude[3]`, `events`, `thoughts`, `feelings` (per Claude API, nutzer kann vor speichern korrigieren).
- **erledigte todos automatisch übernehmen** (nutzer-feedback, mockup-iteration 2): `JournalReviewUseCase` liest beim öffnen des abend-eintrags die heute als `done` markierten `task`-einträge und zeigt sie als eigenen abschnitt "heute erledigt" — kein manuelles abtippen nötig, referenziert die `task`-ids statt den text zu duplizieren.
- `CoachFeedbackUseCase` erzeugt abends kurzes feedback ("das hast du heute gut gemacht" / "das machst du inzwischen routiniert gut") — greift auf journal-historie + habit-streaks + erledigte ziele zurück, siehe `memory.md` §5.

### 4.6 habits
- `habit` (name, ziel-frequenz, bereich optional) + `habit_log` (datum, erledigt/wert).
- streak-berechnung rein lokal, kein server nötig.

### 4.7 ki-assistent ("frage überall")
- global erreichbar (z. b. persistenter such-/frage-button).
- siehe `memory.md` für retrieval-architektur.

### 4.8 auth & billing
- **Auth0**: login (macOS: system-browser-flow via ASWebAuthenticationSession; iOS: gleiches sdk). liefert `user_id` (`sub`) als stabilen fremdschlüssel für alle daten.
- **rollenmodell**: `role` enum (`admin` | `user`) im user-profil, serverseitig geprüft sobald ein server existiert (supabase RLS), lokal clientseitig durch scoping aller queries auf `current_user_id` (admin-modus hebt das scoping für admin-uis explizit auf).
- **Stripe**: abo-status am user-profil (`subscription_status`), zahlungsfluss läuft über Stripe Checkout/Billing Portal (webview/system-browser) — keine kartendaten im client.

### 4.9 übersicht / fortschritts-dashboard
- eigener screen, getrennt von der ziele-navigation (§4.1) — reine **lese-/aggregations-sicht**, keine bearbeitung.
- `ProgressAggregationService` berechnet aus vorhandenen daten (keine eigene datenquelle nötig): wochen-/monatsziel-status, jahresziel-fortschritt je `area`, erledigte-todos-verlauf (letzte 7/28 tage), habit-streaks, sowie einen kurzen, von der ki formulierten "trend"-hinweis (datengrundlage: geschätzte vs. tatsächliche dauer über zeit, siehe `memory.md` §6).
- rein lokal berechenbar (v1), da alle zugrundeliegenden entitäten bereits lokal vorliegen.

### 4.10 einstellungen
- `UserSettings`-entität (1:1 zu `User`), clientseitig cached, änderungen synchron in domain-schicht wirksam (z. b. `weekly_goal_count` beeinflusst die weiche validierung in §4.1).
- kategorien (siehe `context.md` §3.8 für die vollständige liste): bereiche, ziel-parameter, erinnerungszeiten, kalender & planung, diktat & ki-datenschutz (inkl. opt-out einzelner tagebuch-einträge aus dem retrieval-index, siehe `memory.md` §4), darstellung, konto & abo.

### 4.11 beta-feedback
- einfacher feedback-mechanismus, **mindestens für die beta-phase** (nutzer-feedback, mockup-iteration 2) — sichtbar als kleiner hinweis auf den kernbildschirmen und prominent in den einstellungen.
- **entschieden** (`context.md` §7.7): anbindung an ein **eigenes backend**, kein reiner `mailto:`-flow. `FeedbackClient` sendet `FeedbackReport` (siehe datenmodell §5) an einen schlanken eigenen endpoint (z. b. eine kleine serverless-funktion + tabelle — konkrete technologie noch offen, siehe `context.md` §7 "noch offen"). der web-prototyp (`app/`) behält vorerst den einfacheren `mailto:`-fallback, bis das backend existiert.

## 5. datenmodell (kernentitäten, skizze)

> **umsetzungshinweis (v0.2.0)**: in der ersten lauffähigen umsetzung (`app/`, `native/`) wurde die goal-`level` `day` bewusst weggelassen — tasks übernehmen die tagesebene direkt über `goal_id` (meist auf ein wochenziel). deckt "tagesebene wirkt auf wochenziel ein" ab, ohne ein zusätzliches, praktisch leeres modell zu brauchen. siehe `app/README.md`/`native/README.md`.

```
User          { id, auth0_sub, email, role, subscription_status, created_at }
Area          { id, user_id, name, color, sort_order }
Goal          { id, user_id, area_id, level(year|quarter|month|week|day),
                parent_goal_id?, title, target_date, status, progress }
Task          { id, user_id, area_id, goal_id?, title, notes,
                due_date, scheduled_at?, estimated_minutes, actual_minutes?,
                status(open|done|skipped), calendar_event_id? }
Note          { id, user_id, title, body, tags[], created_at }
JournalEntry  { id, user_id, date, gratitude[3], events, thoughts, feelings,
                raw_text?, coach_feedback? }
Habit         { id, user_id, area_id?, name, frequency, target_value? }
HabitLog      { id, habit_id, date, value, done }
Transcript    { id, user_id, source(manual|wispr_flow), raw_text,
                processed_at?, linked_task_ids[], linked_note_id? }
UserSettings  { user_id, weekly_goal_count, monthly_goal_count, week_start(mon|sun),
                morning_reminder_time?, evening_reminder_time?,
                calendar_auto_export, default_break_minutes,
                journal_usable_for_ai, retain_raw_transcripts, theme }
FeedbackReport{ id, user_id, message, context?, created_at }
```

alle entitäten: `user_id`-scoped (außer admin-abfragen), `updated_at` für sync-konfliktauflösung.

## 6. sync- & speicherstrategie

- **v1 (jetzt)**: rein lokal, SwiftData/SQLite pro gerät, iCloud-Key-Value/CloudKit **optional** als einfachster erster sync-schritt zwischen eigenem mac + iphone (keine eigene backend-infrastruktur nötig).
- **v2 (später, nach freigabe)**: supabase (Postgres) als zentrale quelle, sync-engine mit lokaler änderungs-queue + `updated_at`-basiertem last-write-wins, konfliktfälle im journal (freitext) werden nutzer zur entscheidung vorgelegt statt automatisch gemergt.
- migration lokal→cloud ist von anfang an im datenmodell vorgesehen (stabile UUIDs, keine autoincrement-ids), damit v2 kein rewrite braucht.
- **vorgezogen in `app/` (v0.3.0)**: eine vereinfachte version der v2-strategie läuft bereits im web-prototyp — ein supabase-projekt (nutzer selbst eingerichtet) speichert die gesamte lokale datenbank als **ein** json-dokument pro person, last-write-wins über `updated_at` (kein feld-genaues merging). siehe `app/js/cloud.js` und `app/CLOUD_SETUP.md`. dient als sofort nutzbarer zwischenstand, nicht als endgültige v2-architektur (die bekommt echtes per-entität-syncing + konfliktauflösung im journal).

## 7. weitere alltags-effizienz-funktionen (vorschläge, zur auswahl)

- **capture-inbox**: ein schneller "wirf-es-rein"-eingang (text/diktat) für gedanken unterwegs, die erst später einsortiert werden — reduziert die schwelle, adhs-typisch "vergessene" ideen sofort festzuhalten.
- **wochenreview-automatik**: sonntags/freitags generiert die app automatisch einen entwurf für die 2 wochenziele auf basis der monatsziele + offener punkte.
- **verwaltungs-batching**: erkennt wiederkehrende "administrative" tasks (rechnungen, mails beantworten) und bündelt sie zu einem festen zeitfenster/tag, statt sie zu verstreuen.
- **energie-log**: optionales 1-klick-tagesenergie-tracking, das in die aufwandsschätzung/tagesplanung einfließt.
- **quick-win-vorschlag**: bei "leerem kopf"-momenten schlägt die app bewusst eine kleine, schnell erledigbare aufgabe vor (dopamin-anker), keine große.

## 8. versionierung & iterationen

- **semver** für die app (`v0.x.y` während planungs-/mvp-phase).
- jede iteration wird in `CHANGELOG.md` mit datum, umfang und offenen punkten dokumentiert.
- schema-migrationen (lokale db) werden nummeriert und in `Data/Migrations/` versioniert, sobald implementierung startet.

## 9. offene technische fragen

1. SwiftData (neuer, einfacher) vs. Core Data + SQLite direkt (mehr kontrolle, mehr boilerplate) — vorschlag: SwiftData, bei bedarf später migrierbar.
2. Wispr-Flow-integration: webhook/push oder polling? abhängig von deren api (siehe offene frage in `context.md`).
3. konkrete modellwahl für `OllamaClient` (§2.1) — Llama 3.1 8B vs. Mistral 7B vs. Qwen2.5 o. ä. — braucht einen kurzen praxisvergleich (qualität vs. laufzeit auf einem mac), sobald die ki-schicht implementiert wird.
4. technologie für das feedback-backend (§4.11) — z. b. eine kleine serverless-funktion (Cloudflare Workers/Vercel) + leichte datenbank, oder teil des späteren supabase-backends vorziehen? noch nicht entschieden.
5. **falls später doch claude-api (pro-tier, §2.1) aktiviert wird**: zugriff direkt vom client (api-key im gerät, risiko) oder über einen schlanken eigenen backend-proxy (empfohlen, u. a. für Stripe-abgleich + key-schutz)? — nicht dringend, da v1 ohne claude-api auskommt.
