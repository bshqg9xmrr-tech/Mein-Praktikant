# changelog

alle nennenswerten iterationen dieses projekts werden hier protokolliert. format angelehnt an [keep a changelog](https://keepachangelog.com/), versionierung nach [semver](https://semver.org/) (solange `0.x.y`: alles kann sich noch ändern).

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
