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

**iteration v0.2.0 — erster lauffähiger stand.** es gibt jetzt echten code an zwei stellen (siehe `README.md`):

- [`app/`](./app/) — ein **web-prototyp** (HTML/CSS/JS, kein build-schritt), der schon heute im browser läuft (PC und handy) und die ziel-hierarchie mit **echter ableitung** (jahr → quartal → monat → woche, fortschritt läuft automatisch von unten nach oben zusammen) enthält — das war der teil, der im ersten mockup (iteration v0.1.x) noch fehlte.
- [`native/`](./native/) — ein **Swift/SwiftUI-startpunkt** (SwiftData-datenmodell + dieselbe ziel-ableitungs-logik in Swift) für die eigentlich geplante native macOS/iOS-app aus `architecture.md`. **wichtig**: diese cloud-umgebung hat kein Xcode/macOS und konnte den Swift-code nicht kompilieren — vor dem weiterbauen unbedingt in Xcode gegenprüfen (siehe `native/README.md`).

offene fragen aus `context.md` §7 sind weiterhin nicht final beantwortet (u. a. "claude vs. cloud"-speicherung, Wispr-Flow-api-zugang, ob langfristig nativ oder web/cross-platform der hauptweg wird) — die aktuelle umsetzung geht bewusst **beide wege parallel**, um sofort etwas nutzbares zu haben, ohne die native architektur-empfehlung aufzugeben.

## 5. versionierung der iterationen

- die app folgt **semver** (`v0.1.0`, `v0.2.0`, …) — solange kein stabiles v1 existiert, bleibt die major-version `0`.
- jede iteration wird in `CHANGELOG.md` protokolliert: was wurde gebaut, was bewusst weggelassen, offene punkte für die nächste iteration.
- diese planungsphase selbst ist **iteration v0.1.0** ("dokumentation & brainstorming") — siehe `CHANGELOG.md`.
- sobald implementiert wird: schema-migrationen werden separat nummeriert (`architecture.md` §8).

## 6. mvp-scope v0.2.0 (umgesetzt)

der ursprüngliche vorschlag wurde umgesetzt — und um die von markus explizit nachgefragte ziel-ableitung erweitert:

1. bereiche + todo-liste (tage-gruppiert) — **ohne echte ki**, aber mit einer echten, funktionierenden .ics-kalender-export
2. **ziel-hierarchie mit echter ableitung** (jahr → quartal → monat → woche; fortschritt eines ziels berechnet sich automatisch aus seinen unterzielen bzw. verlinkten todos) — ursprünglich für v0.2.0 noch ohne ableitung geplant, jetzt vorgezogen
3. lokale speicherung — im web-prototyp `localStorage` (stand-in für die geplante SwiftData-schicht), im Swift-startpunkt bereits echtes SwiftData; noch kein Auth0/Stripe/sync
4. das "liquid glass"-designsystem als echtes, wiederverwendbares css (`app/styles.css`), responsive für PC und handy

zusätzlich (über den ursprünglichen vorschlag hinaus, aus nutzer-feedback): notizen, tagebuch (mit auto-übernommenen erledigten todos, regelbasiertem statt ki-rückblick), habits mit echter streak-berechnung, ein übersicht-dashboard mit echten berechneten kennzahlen, einstellungen (bereiche, ziel-anzahl, planungs-defaults, daten-export/-import), ein funktionierender beta-feedback-button (mailto).

**weiterhin bewusst nicht enthalten**: echte ki (claude-api-anbindung), ki-assistent "frage überall", Wispr Flow, Auth0, Stripe, cloud-sync — jede stelle, an der das später andockt, ist im code markiert. siehe `CHANGELOG.md` für die vollständige liste.

## 7. arbeitsweise in diesem repo

- **branch**: entwicklung erfolgt auf dem jeweils zugewiesenen feature-branch, kleine, thematisch geschlossene commits.
- **commit-nachrichten**: kurz, beschreiben das *warum*, nicht nur das *was*.
- **keine großschreibung** in dokumentation/kommunikation (nutzerpräferenz) — technische bezeichner (Swift, Auth0, Stripe, API-namen etc.) behalten ihre korrekte schreibweise, da sie sonst falsch/unklar wären.
- vor jeder größeren architekturentscheidung: erst hier und in `architecture.md` dokumentieren, dann implementieren.

## 8. nächste schritte

1. `app/` in einem echten browser (nicht nur automatisiert) ausprobieren und feedback geben.
2. `native/` in Xcode öffnen und gegenprüfen/korrigieren — dieser code wurde nicht kompiliert.
3. offene fragen in `context.md` §7 mit markus klären (u. a. jetzt auch: bleibt der web-prototyp ein dauerhafter zweiter weg, oder ist er nur übergangslösung bis die native app steht?).
4. danach iteration `v0.3.0` planen: welche der noch offenen bausteine (ki-anbindung, Auth0, kalender-sync, …) zuerst?
