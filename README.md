# mein-praktikant

persönlicher struktur-assistent für adhs-alltag (macOS + iPhone, offline-first).

**status: iteration v0.5.0 — neuer mvp v2 "tages-assistent" (`mvp/`), parallel zur v0.4-beta (`app/`).** start bei [`claude.md`](./claude.md) für den vollständigen leitfaden; die weiteren planungsdokumente sind [`context.md`](./context.md), [`architecture.md`](./architecture.md), [`memory.md`](./memory.md) und [`ui_guidelines.md`](./ui_guidelines.md). iterations-historie in [`CHANGELOG.md`](./CHANGELOG.md).

## umsetzung

- [`mvp/`](./mvp/) — **neu: mvp v2 als tages-assistent**, abgeleitet aus den routines "jarvis – morning briefing" und "pepper – abend-check-in" ([`anforderungen-v2.md`](./anforderungen-v2.md)): aufgaben aus diktat/WhatsApp/WhatsApp Business/mail/Teams einsammeln, nach vorlieben einordnen, energie-gerecht in den kalender planen (fokus-/kreativ-/routine-/erholungszeiten, kernzeit, pausen, wetter), abends check-in mit einzahlung auf die jahresziele. online unter `…/Mein-Praktikant/mvp/`. siehe `mvp/README.md`.

- [`app/`](./app/) — **web-prototyp**, läuft im browser (PC & handy), als PWA installierbar (iphone: "zum home-bildschirm", mac: safari/chrome "app installieren"), inkl. der neu gedachten drei-bereiche-navigation (strom/kompass/verlauf), ziel-hierarchie mit echter ableitung (jetzt inkl. habits) und optionalem cloud-sync über mehrere geräte (siehe `app/CLOUD_SETUP.md` — **kein muss**, ein "lokal ausprobieren"-weg existiert explizit). siehe `app/README.md` zum starten/hosten.
- [`native/`](./native/) — **Swift/SwiftUI-startpunkt** für die geplante, langfristige native macOS/iOS-app aus `architecture.md` — noch nicht in Xcode geprüft, siehe `native/README.md`.
