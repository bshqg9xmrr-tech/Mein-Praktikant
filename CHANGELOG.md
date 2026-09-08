# changelog

alle nennenswerten iterationen dieses projekts werden hier protokolliert. format angelehnt an [keep a changelog](https://keepachangelog.com/), versionierung nach [semver](https://semver.org/) (solange `0.x.y`: alles kann sich noch ändern).

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
