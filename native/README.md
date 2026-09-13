# mein praktikant — native (Swift/SwiftUI) startpunkt

dies ist **kein vollständiger, getesteter build** — die cloud-umgebung, in der dieses repo bearbeitet wird, hat kein Xcode/macOS und kann Swift-code für Apple-plattformen weder kompilieren noch ausführen. der code hier ist nach bestem wissen syntaktisch korrekt geschrieben (SwiftUI + SwiftData, wie in `architecture.md` §2 empfohlen), aber **bitte in Xcode auf einem Mac gegenprüfen**, bevor darauf aufgebaut wird.

für eine sofort ausprobierbare version siehe stattdessen `../app/` (web-prototyp, läuft im browser).

## was enthalten ist

`MeinPraktikant/` ist ein Swift-Package (SPM) mit zwei targets:

- **`MeinPraktikantCore`** — datenmodell (`Models.swift`, SwiftData) und die ziel-ableitungs-logik (`GoalDerivation.swift`) — bewusst als reine, testbare funktionen gehalten, ohne SwiftUI-abhängigkeit.
- **`MeinPraktikantApp`** — die SwiftUI-app selbst: `ContentView` (tab-navigation), `TodayView` (einfache erfassung + abhaken), `GoalsView` + `CreateGoalSheet` (die **ziel-hierarchie mit echter ableitung** — der zentrale, explizit nachgefragte teil).

`GoalDerivation.swift` ist absichtlich die **gleiche logik** wie `../app/js/goals.js` — zweimal geschrieben (einmal JS, einmal Swift), nicht geteilt. bei änderungen an der ableitungs-regel müssen beide seiten aktualisiert werden.

## ausprobieren

auf einem **Mac mit Xcode 15+**:

```bash
cd native/MeinPraktikant
swift run
```

das öffnet (weil macOS SwiftUI-apps auch als reines kommandozeilen-executable laufen können) ein fenster mit den beiden tabs "heute" und "ziele". das ist der schnellste weg, das gerüst zu sehen — **aber kein vollwertiges macOS/iOS-app-target** (kein app-icon, keine entitlements, kein eigener bundle-identifier, kein iOS-target).

## was hier bewusst fehlt (nächste schritte für ein echtes app-target)

1. **umwandlung in ein Xcode-multiplatform-projekt**: `File → New → Project → Multiplatform App` in Xcode, die vorhandenen dateien aus `Sources/MeinPraktikantCore` und `Sources/MeinPraktikantApp` importieren bzw. als lokales Swift-package einbinden.
2. die übrigen screens aus dem mockup/web-prototyp (notizen, tagebuch, habits, übersicht, einstellungen) — hier nur `TodayView` und `GoalsView` als startpunkt.
3. EventKit-anbindung (kalender-export/-sync, siehe `architecture.md` §4.2) — im web-prototyp bereits als echter `.ics`-download umgesetzt, hier noch nicht.
4. Auth0, Stripe, Wispr Flow, Claude-API — wie in `context.md` §7 als offene punkte markiert, nirgends (web oder native) bereits angebunden.
5. richtige tests (dieses gerüst wurde **nicht** durch den Swift-compiler geprüft — vor der ersten "echten" iteration unbedingt in Xcode öffnen und die fehler/warnings durchgehen).
