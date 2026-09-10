# mein-praktikant

persönlicher struktur-assistent für adhs-alltag (macOS + iPhone, offline-first).

**status: iteration v0.3.0 — installierbare web-app mit optionalem cloud-sync.** start bei [`claude.md`](./claude.md) für den vollständigen leitfaden; die weiteren planungsdokumente sind [`context.md`](./context.md), [`architecture.md`](./architecture.md), [`memory.md`](./memory.md) und [`ui_guidelines.md`](./ui_guidelines.md). iterations-historie in [`CHANGELOG.md`](./CHANGELOG.md).

## umsetzung

- [`app/`](./app/) — **web-prototyp**, läuft im browser (PC & handy), als PWA aufs iphone installierbar, inkl. der ziel-hierarchie mit echter ableitung (jahr → quartal → monat → woche) und optionalem cloud-sync über mehrere geräte (siehe `app/CLOUD_SETUP.md`). siehe `app/README.md` zum starten/hosten.
- [`native/`](./native/) — **Swift/SwiftUI-startpunkt** für die geplante, langfristige native macOS/iOS-app aus `architecture.md` — noch nicht in Xcode geprüft, siehe `native/README.md`.
