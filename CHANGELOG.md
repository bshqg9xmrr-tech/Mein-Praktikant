# changelog

alle nennenswerten iterationen dieses projekts werden hier protokolliert. format angelehnt an [keep a changelog](https://keepachangelog.com/), versionierung nach [semver](https://semver.org/) (solange `0.x.y`: alles kann sich noch ändern).

## [unveröffentlicht] — 2026-09-10 — heute-ansicht: weniger reibung bei erfassen & löschen

nutzer-auftrag (über einen feedbackgeber-agenten geprüft und priorisiert): drei kleine reibungspunkte in der heute-ansicht (`app/js/today.js`) beheben.

### hinzugefügt — `app/`
- **rückgängig-toast beim löschen einer aufgabe**: der löschen-button entfernt eine aufgabe nicht mehr sofort endgültig, sondern blendet sie aus und zeigt einen toast mit "rückgängig"-button. erst wenn die 5-sekunden-frist abläuft oder der toast über das neue schließen-x geschlossen wird, verschwindet die aufgabe wirklich (`today.js#removeTaskWithUndo`). dafür kann `toast()` (`js/ui.js`) jetzt optional einen aktions-button und eine `onDismiss`-callback für die "jetzt endgültig"-aktion annehmen, bleibt aber für einfache text-toasts (weiterhin an allen anderen stellen im code genutzt) unverändert abwärtskompatibel.
- **mehrzeiliges einfügen im capture-feld**: wird text mit mehreren zeilen ins einzeilige eingabefeld eingefügt (z. b. eine kopierte liste), legt `today.js` für jede nicht-leere zeile ein eigenes todo an, statt den gesamten text als einen einzigen titel zu übernehmen.
- **"heute alles erledigt"-bestätigung**: sind aufgaben erfasst und alle als erledigt markiert (aber die liste nicht leer), erscheint eine kurze, warme bestätigung ("heute erledigt — gut gemacht") statt nur des leeren-zustand-hinweises — neuer `.done-banner`-stil in `styles.css`, passend zur bestehenden ki-banner-optik.

### getestet
- lokal per `python3 -m http.server` + playwright/chromium: aufgabe löschen → rückgängig-klick stellt sie wieder her; aufgabe löschen → frist ablaufen lassen entfernt sie endgültig (bleibt nach reload weg); schließen-x committet sofort; mehrzeiliger paste legt mehrere todos an; alle todos abhaken zeigt die bestätigung. keine konsolenfehler.

## [0.3.0] — 2026-09-09 — installierbare web-app mit optionalem cloud-sync

nutzer-auftrag: "wie komme ich jetzt zu einer funktionierenden app, die ich auf meinem handy testen kann, die daten... gespeichert werden und ich sowohl auf meinem handy als auch auf meinem mac oder als webversion darauf zugreifen kann?"

### hinzugefügt — `app/`
- **PWA**: `manifest.json`, `sw.js` (network-first mit offline-cache-fallback), eigene app-icons (`icons/`), meta-tags in `index.html` — auf dem iphone über "zum home-bildschirm hinzufügen" installierbar, danach auch offline nutzbar.
- **GitHub-Pages-deployment** (`.github/workflows/pages.yml`): `app/` wird bei jedem push automatisch als statische seite veröffentlicht, damit eine echte, vom handy erreichbare url existiert (einmalig **Settings → Pages → Source: GitHub Actions** aktivieren).
- **optionaler, echter cloud-sync** (`js/cloud.js`, neu): anbindung an ein kostenloses Supabase-projekt (magic-link-login, ein json-dokument pro person in `app_state`, last-write-wins über `updated_at`). ohne einrichtung läuft die app unverändert lokal-only weiter (`storage.js` bekam dafür `onSave()`/`onExternalChange()`-hooks, kennt supabase selbst aber nicht — offline-first bleibt der default). einrichtung + SQL-schema in neuem `app/CLOUD_SETUP.md`.
- neue "cloud-sync"-karte in den einstellungen (projekt-url/anon-key eintragen, login-link anfordern, sync-status, "jetzt synchronisieren", abmelden).

### geändert
- `README.md` (repo + `app/`) und `claude.md` §4 auf den neuen stand gebracht.

### bewusst nicht enthalten
- kein feld-genaues merge bei gleichzeitigen offline-änderungen auf zwei geräten (ganzer datensatz, last-write-wins) — dokumentiertes, akzeptiertes verhalten für einen einzelnen nutzer, der jeweils an einem gerät arbeitet.
- der magic-link-login ist ein zwischenstand für den sync, kein Auth0-ersatz (siehe `architecture.md` §4.8).
- `native/` unverändert (weiterhin nicht kompiliert/getestet).

## [0.2.1] — 2026-09-09 — klärungsrunde: alle offenen fragen beantwortet

nutzer-auftrag: alle offenen fragen aus `context.md` §7 beantwortet, plus eine neue frage ("kannst du eine kostenlose opensource ki einbauen?"). reine planungs-/dokumentations-iteration, kein neuer code.

### geändert — `context.md`, `architecture.md`, `claude.md`
- **speicherung**: "in der claude gespeichert" war "cloud" gemeint — bestätigt, keine änderung an der lokal-first-strategie nötig.
- **plattform**: nativ (swift/SwiftUI) ist der **bestätigte hauptweg** (kein cross-platform-ansatz) — `native/` ist damit nicht mehr nur ein paralleler versuch, sondern das ziel; `app/` bleibt als sofort nutzbarer web-prototyp bestehen, ist aber kein weiterer investitionsschwerpunkt.
- **ki-schicht neu geplant, hybrid & kostenlos** (`architecture.md` §2.1, neu): standardmäßig apple's on-device-ki (Foundation Models, mac + iphone, kostenlos & offline), optional ein stärkeres open-source-modell via Ollama (nur mac). claude-api ist **kein v1-bestandteil mehr**, sondern als späteres, bezahltes "pro"-upgrade vorgesehen — passt zur ohnehin geplanten Stripe-anbindung. neue abstraktion `AIProvider` mit austauschbaren backends (`OnDeviceAIClient`, `OllamaClient`, `ClaudeClient`).
- **mehrnutzer**: v1 bleibt strikt single-user (markus) — mehrnutzer erst nach geplanter app-store-/online-veröffentlichung relevant, architektur bleibt vorbereitet.
- **wochenstart**: montag als default, in den einstellungen änderbar.
- **beta-feedback**: soll an ein eigenes backend angebunden werden (nicht nur `mailto:`) — technologie noch offen.
- **"etwas smarter"**: bestätigt inkl. ausdrücklichem wunsch nach **proaktiven vorschlägen** (nicht nur reaktive ki-hinweise).
- Auth0/Stripe: noch keine bestehenden accounts, werden bei bedarf neu angelegt.

### noch offen (neu)
- konkrete Ollama-modellwahl (Llama 3.1 vs. Mistral vs. Qwen2.5 o. ä.)
- technologie für das feedback-backend

### nächste iteration
- `0.3.0` (vorschlag): ki-schicht (`AIProvider`, on-device zuerst) implementieren, feedback-backend anbinden.

## [0.2.0] — 2026-09-08 — erster lauffähiger stand (web-prototyp + native startpunkt)

nutzer-auftrag: "kannst du mir das jetzt einmal umsetzen" + explizit nachgefragt: die ableitung von kurzfristigen zielen aus langfristigen zielen fehlte noch. beides ist jetzt umgesetzt, parallel auf zwei wegen (nutzer-entscheidung: "beides parallel anlegen"), da diese cloud-umgebung kein Xcode/macOS hat und die geplante native app hier nicht gebaut/getestet werden kann.

### hinzugefügt — `app/` (web-prototyp, echt lauffähig, im browser getestet)
- **ziel-hierarchie mit echter ableitung**: jahr → quartal → monat → woche, fortschritt eines ziels läuft automatisch aus seinen unterzielen zusammen (bzw. bei wochenzielen aus dem anteil erledigter, verlinkter todos) — `app/js/goals.js#effectiveProgress()`, per browser-test verifiziert (live-neuberechnung beim anlegen eines unterziels)
- zweistufiger todo-flow: einfache erfassung (nur titel) → separate, einfache lokale planung (deterministisch, klar als "keine echte ki" beschriftet) → echter `.ics`-kalender-export
- tagebuch mit automatisch übernommenen erledigten todos des tages und einem regelbasierten "rückblick" (kein ki-coach vorgetäuscht)
- habits mit echter streak-berechnung, notizen, übersicht-dashboard (alle zahlen echt berechnet), einstellungen (bereiche, ziel-anzahl, planungs-defaults, daten-export/-import, beta-feedback via `mailto:`)
- responsives liquid-glass-css (`app/styles.css`), läuft auf PC- und handy-breite (mobile-first, sidebar-nav ab 900px)
- daten liegen lokal in `localStorage` (single-user, wie für v1 vorgesehen)

### hinzugefügt — `native/` (Swift/SwiftUI-startpunkt, **nicht kompiliert/getestet**)
- Swift-package mit SwiftData-datenmodell (`Models.swift`) und derselben ziel-ableitungs-logik wie im web-prototyp (`GoalDerivation.swift`)
- `GoalsView` + `CreateGoalSheet`: dieselbe ziel-hierarchie-funktion nativ, `TodayView` als einfache erfassung
- **wichtiger hinweis**: diese umgebung kann keinen Swift-code kompilieren (kein Xcode/macOS) — der code wurde sorgfältig von hand geprüft (u. a. ein echter fehler dabei gefunden und behoben: `GoalLevel` brauchte `Hashable` für die Picker-bindung), ist aber vor jeder weiteren nutzung in Xcode gegenzuprüfen

### gefundene und behobene fehler (aus dem browser-test)
- "+ neues ziel"-button lief auf ~250×250px auf (svg-icon ohne explizite größe in einem flexiblen button) — icons in `ui.js` bekommen jetzt feste width/height-attribute

### geändert
- mvp-scope aus `claude.md` §6 (v0.1.0-vorschlag) umgesetzt, dabei die "ziel-ableitung" bewusst vorgezogen (war ursprünglich erst für eine spätere iteration vorgesehen)

### vereinfachung ggü. architecture.md
- `architecture.md` §5 listet `day` als eigene goal-`level`. in beiden umsetzungen (web + native) übernehmen stattdessen die tasks/todos die tagesebene direkt (ein wochenziel verlinkt tasks) — spart ein zusätzliches, praktisch leeres modell, deckt aber inhaltlich dasselbe ab. siehe `app/README.md` bzw. `native/README.md`.

### noch nicht enthalten
- keine echte ki (Claude-API), kein ki-assistent "frage überall", keine Wispr-Flow-, Auth0-, Stripe- oder cloud-anbindung — alle stellen sind im code klar markiert
- `native/` wurde nicht in Xcode geöffnet/gebaut

## [0.1.1] — 2026-09-08 — erster visualisierungs-entwurf + nutzer-feedback eingearbeitet

### hinzugefügt
- erster klickbarer/visueller mockup-entwurf ("liquid glass") mit 8 bildschirmen, gleichrangig für **iPhone** und **macOS**: schnell-erfassen (todo-eingabe), heute (ki-geplante tages-timeline mit automatischem kalender-export), ziele (überarbeitete, einfachere ebenen-navigation statt dichter spalten-grafik), übersicht/fortschritts-dashboard (neu), abend-check-in (jetzt mit ganztägiger diktierfunktion + automatisch übernommenen erledigten todos), einstellungen (neu, inkl. beta-feedback-hinweis)
- neue funktionsanforderungen aus nutzer-feedback in `context.md` §3.7–§3.9 ergänzt: übersicht/fortschritts-dashboard, einstellungen, beta-feedback-button
- `architecture.md` um module 4.9–4.11 (übersicht, einstellungen, beta-feedback) sowie den entkoppelten "erfassen → ki plant → kalender-export"-flow für todos (§4.1) erweitert
- `ui_guidelines.md` um neue komponenten (ki-planungs-leiste, capture-eingabe, diktier-karte, ebenen-navigator, dashboard-kachel, toggle/stepper, beta-feedback-hinweis) ergänzt

### geändert
- todo-erfassung ist jetzt explizit **zweistufig**: einfache eingabe zuerst, ki-einordnung (bereich/dauer/reihenfolge/kalender-export) erst danach — statt beidem in einem schritt
- ziele-übersicht am desktop **neu gestaltet**: einfache ebenen-liste mit breadcrumb statt der ursprünglichen, zu dichten 5-spalten-"spine"-visualisierung aus v0.1.0 (nutzer-feedback: "übersicht bei den zielen find ich noch nicht optimal")
- primärakzent-farbe von `#5B6CFF` auf `#5260F2` angepasst (kontrast-fix, siehe unten)

### fehlerbehebt (aus automatisiertem review-durchlauf des mockups)
- kontrast tecis-filter-pill (weiß auf hellviolett) und gefühle-pills im tagebuch (weiß auf warmem orange) auf WCAG-AA gebracht
- farbton-abweichungen zwischen den einzelnen bildschirmen vereinheitlicht (glas-transparenz, akzentfarbe)

### noch nicht enthalten
- keine implementierung (weiterhin nur planung + visueller entwurf)
- technische umsetzung des beta-feedback-buttons (mail vs. formular/backend) noch offen — siehe `context.md` §7

## [0.1.0] — 2026-09-08 — planung & brainstorming

### hinzugefügt
- `claude.md` — projektleitfaden, dokumentenset-übersicht, versionierungs-strategie, mvp-vorschlag
- `context.md` — nutzerkontext, strukturierte funktionsanforderungen, annahmen, offene fragen an den nutzer
- `architecture.md` — technische architektur: plattformwahl (Swift/SwiftUI, macOS+iOS), schichtenmodell, kernmodule, datenmodell-skizze, sync-strategie
- `memory.md` — retrieval-/gedächtnisarchitektur für den ki-assistenten ("frage überall") und den abend-coach
- `ui_guidelines.md` — "liquid glass"-designsystem, adhs-gerechte ui-prinzipien, farbpalette, komponenten

### noch nicht enthalten (bewusst)
- keine implementierung (kein code, kein Xcode-projekt)
- keine finalen antworten auf die offenen fragen in `context.md` §7

### nächste iteration
- `0.2.0` (vorschlag): projektgerüst + lokaler mvp gemäß `claude.md` §6, nach klärung der offenen fragen
