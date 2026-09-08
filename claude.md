# claude.md — projektleitfaden "mein praktikant"

> haupteinstiegspunkt für die arbeit an diesem repo. beschreibt zweck, aktuellen stand, arbeitsweise und wie sich dieses dokument zu den anderen planungsdokumenten verhält.

## 1. was ist "mein praktikant"

eine offline-fähige, native app (macOS + iPhone) als persönlicher struktur-assistent für markus (adhs): ziel-hierarchie (jahr → quartal → monat → woche → tag), todo-liste nach bereichen, kalender-integration, diktat/transkript-verarbeitung, tagebuch mit abend-coach, notizen, habit-tracking und ein ki-assistent mit zugriff auf alle gespeicherten infos.

leitgedanke: **die app übernimmt die exekutive-funktions-arbeit** (planen, priorisieren, erinnern, zusammenfassen), damit markus sich auf das tun konzentrieren kann.

## 2. dokumentenset

| dokument | inhalt |
|---|---|
| `claude.md` (dieses dokument) | überblick, arbeitsweise, versionierung, roadmap |
| `context.md` | nutzerkontext, funktionsanforderungen, annahmen, offene fragen |
| `architecture.md` | technische architektur: plattform, module, datenmodell, integrationen |
| `memory.md` | wie der ki-assistent auf alle nutzerdaten zugreift (retrieval, datenschutz) |
| `ui_guidelines.md` | "liquid glass"-designsystem, adhs-gerechte ui-prinzipien |

reihenfolge zum einlesen bei neuen sessions: **context → architecture → memory → ui_guidelines**.

## 3. leitprinzipien für die entwicklung

1. **offline-first, lokal-first** — cloud/sync ist zusatz, nie voraussetzung (details `architecture.md` §6).
2. **klein & iterativ** — jede iteration liefert ein spürbares, nutzbares stück (kein monolithischer big-bang-release).
3. **reibung senken, nicht erhöhen** — bei jedem feature prüfen: hilft das markus, weniger nachzudenken/zu entscheiden, oder mehr?
4. **annahmen sichtbar machen** — unklare punkte werden explizit in `context.md` §6/§7 dokumentiert statt stillschweigend entschieden.
5. **daten- und rollentrennung von anfang an** — admin/user-scoping ist kein nachträgliches feature (`architecture.md` §4.8).

## 4. aktueller stand

**phase 0 — planung/brainstorming abgeschlossen.** dieses dokumentenset ist der output dieser phase. **es wurde noch kein code geschrieben.**

vor start der implementierung sollten die offenen fragen in `context.md` §7 beantwortet sein (insbesondere: interpretation "claude vs. cloud"-speicherung, Wispr-Flow-api-zugang, plattform-bestätigung).

## 5. versionierung der iterationen

- die app folgt **semver** (`v0.1.0`, `v0.2.0`, …) — solange kein stabiles v1 existiert, bleibt die major-version `0`.
- jede iteration wird in `CHANGELOG.md` protokolliert: was wurde gebaut, was bewusst weggelassen, offene punkte für die nächste iteration.
- diese planungsphase selbst ist **iteration v0.1.0** ("dokumentation & brainstorming") — siehe `CHANGELOG.md`.
- sobald implementiert wird: schema-migrationen werden separat nummeriert (`architecture.md` §8).

## 6. vorschlag: mvp-scope (iteration v0.2.0, zur freigabe)

um schnell etwas nutzbares zu haben statt alles auf einmal zu bauen, schlägt dieser leitfaden folgenden minimalen ersten baustein vor:

1. bereiche + todo-liste (tage-gruppiert) — **ohne** ki, **ohne** kalender-sync
2. ziel-hierarchie (anlegen/anzeigen, noch ohne automatische ableitung)
3. lokale speicherung (SwiftData), noch kein Auth0/Stripe/sync
4. grundgerüst des "liquid glass"-designsystems (2–3 kernkomponenten)

**bewusst nicht in v0.2.0**: ki-assistent, tagebuch-coach, Wispr Flow, kalender-schreibzugriff, Auth0/Stripe, cloud-sync. diese folgen in benannten, kleineren folge-iterationen, sobald die basis steht und die offenen fragen geklärt sind.

## 7. arbeitsweise in diesem repo

- **branch**: entwicklung erfolgt auf dem jeweils zugewiesenen feature-branch, kleine, thematisch geschlossene commits.
- **commit-nachrichten**: kurz, beschreiben das *warum*, nicht nur das *was*.
- **keine großschreibung** in dokumentation/kommunikation (nutzerpräferenz) — technische bezeichner (Swift, Auth0, Stripe, API-namen etc.) behalten ihre korrekte schreibweise, da sie sonst falsch/unklar wären.
- vor jeder größeren architekturentscheidung: erst hier und in `architecture.md` dokumentieren, dann implementieren.

## 8. nächste schritte

1. offene fragen in `context.md` §7 mit markus klären.
2. mvp-scope (§6) bestätigen oder anpassen.
3. iteration `v0.2.0` starten: Xcode-projektgerüst gemäß `architecture.md` §2 anlegen.
