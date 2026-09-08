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

alternative (verworfen, aber dokumentiert): react native/Expo für gemeinsamen code über mehr plattformen hinweg. nachteil: schwächere offline-kalender-/notification-integration, zusätzliche abstraktionsschicht. nur relevant, falls android/windows-unterstützung mittelfristig gefordert wird (aktuell nicht der fall, siehe offene frage in `context.md`).

```
mein-praktikant/
├── App/                  # SwiftUI-app-targets (macOS, iOS) — nur composition/entry points
├── Features/             # feature-module (Goals, Tasks, Journal, Notes, Habits, Assistant)
├── Domain/                # use cases, geschäftslogik, planner-engine (plattformunabhängig)
├── Data/                  # local store (SwiftData/SQLite), repositories, sync-engine
├── Integrations/          # Auth0Client, StripeClient, WisprFlowClient, ClaudeClient, CalendarBridge
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
- **PlanDayUseCase**: morgens generiert — sortiert offene tasks des tages nach (a) deadline/kalenderfixierung, (b) ziel-priorität, (c) geschätzter dauer vs. verfügbarer zeit, (d) energie-heuristik (schwere aufgaben nicht direkt nacheinander).
- **effort estimation**: heuristik aus (1) nutzer-history ähnlicher tasks (lernend), (2) fallback-schätzung per Claude API anhand aufgabentext, (3) manuelles override immer möglich.
- **pausen**: PlanDayUseCase plant nach ~50–90 min fokusblöcken automatisch pausen-slots ein (konfigurierbar), die ebenfalls als kalender-blocker erscheinen.

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
- `JournalReviewUseCase` strukturiert eintrag in feste sektionen: `gratitude[3]`, `events`, `thoughts`, `feelings` (per Claude API, nutzer kann vor speichern korrigieren).
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

## 5. datenmodell (kernentitäten, skizze)

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
```

alle entitäten: `user_id`-scoped (außer admin-abfragen), `updated_at` für sync-konfliktauflösung.

## 6. sync- & speicherstrategie

- **v1 (jetzt)**: rein lokal, SwiftData/SQLite pro gerät, iCloud-Key-Value/CloudKit **optional** als einfachster erster sync-schritt zwischen eigenem mac + iphone (keine eigene backend-infrastruktur nötig).
- **v2 (später, nach freigabe)**: supabase (Postgres) als zentrale quelle, sync-engine mit lokaler änderungs-queue + `updated_at`-basiertem last-write-wins, konfliktfälle im journal (freitext) werden nutzer zur entscheidung vorgelegt statt automatisch gemergt.
- migration lokal→cloud ist von anfang an im datenmodell vorgesehen (stabile UUIDs, keine autoincrement-ids), damit v2 kein rewrite braucht.

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
3. Claude-API-zugriff: direkt vom client (api-key im gerät, risiko) oder über einen schlanken eigenen backend-proxy (empfohlen, sobald mehrnutzer/abo relevant wird, u. a. für Stripe-abgleich + key-schutz)?
