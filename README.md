# mein-praktikant

persönlicher struktur-assistent für adhs-alltag (macOS + iPhone, offline-first).

**status: iteration v0.2.0 — erster lauffähiger stand.** start bei [`claude.md`](./claude.md) für den vollständigen leitfaden; die weiteren planungsdokumente sind [`context.md`](./context.md), [`architecture.md`](./architecture.md), [`memory.md`](./memory.md) und [`ui_guidelines.md`](./ui_guidelines.md). iterations-historie in [`CHANGELOG.md`](./CHANGELOG.md).

## umsetzung

- [`app/`](./app/) — **web-prototyp**, läuft jetzt schon im browser (PC & handy), inkl. der ziel-hierarchie mit echter ableitung (jahr → quartal → monat → woche). siehe `app/README.md` zum starten.
- [`native/`](./native/) — **Swift/SwiftUI-startpunkt** für die native macOS/iOS-app aus `architecture.md` — noch nicht in Xcode geprüft, siehe `native/README.md`.
