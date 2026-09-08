# changelog

alle nennenswerten iterationen dieses projekts werden hier protokolliert. format angelehnt an [keep a changelog](https://keepachangelog.com/), versionierung nach [semver](https://semver.org/) (solange `0.x.y`: alles kann sich noch ändern).

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
