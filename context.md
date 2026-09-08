# context.md — projekt- und nutzerkontext

> dieses dokument hält fest, wofür "mein praktikant" gebaut wird, welche annahmen getroffen wurden und welche fragen noch mit dem nutzer geklärt werden müssen, bevor implementiert wird.

## 1. ausgangssituation

markus hat adhs und kämpft mit selbststrukturierung im alltag (privat + arbeit, u. a. bei "plenum" und "tecis" als bereiche). er möchte einen digitalen "praktikanten" — einen persönlichen assistenten, der ihm die organisatorische last abnimmt: ziele runterbrechen, tagesplanung vorschlagen, erinnern, reflektieren, und auf abruf alles wissen, was er dem system je erzählt hat.

kernproblem, das die app löst: **von der absicht zur tat** — adhs-typische schwächen bei planung, zeitschätzung, priorisierung und konsistenz werden durch externe struktur + sanfte, aber verlässliche nudges kompensiert.

## 2. zielgruppe (v1)

- primär: markus selbst (single-user-nutzung zum start)
- architektur soll aber von anfang an mehrere nutzer + rollen (admin/user) sauber unterstützen, damit die app später für andere geöffnet werden kann (stripe-abo deutet auf ein mehrnutzer-produkt hin)

## 3. funktionsanforderungen (aus dem briefing, strukturiert)

### 3.1 ziele & todos
- todo-liste, gruppiert nach **bereichen** (privat, plenum, tecis, sonstige — erweiterbar)
- todos sind einem **tag** zugeordnet
- ziel-hierarchie: jahresziel → quartalsziel → monatsziel → wochenziel → tagesziel
  - jede woche: **2 wochenziele**
  - jeder monat: **3 hauptziele**
  - alle unteren ebenen wirken auf projekte/jahresziele der bereiche ein
- transkript-upload oder direkte anbindung an wispr flow (diktate → strukturierte notizen/todos)
- fortschritts-tracker: abstand zum ziel sichtbar machen
- morgen-erinnerung + priorisierter tages-vorschlag (reihenfolge der todos)
- todos spiegeln sich im kalender
- ki schätzt aufwand/dauer je aufgabe
- pausen werden aktiv mitgeplant (kein durchgetakteter tag)

### 3.2 notizen
- freie notizfunktion für "spannende dinge"

### 3.3 tagebuch
- tägliches freitext-/diktat-tagebuch
- abends: pop-up/erinnerung zum schreiben
- strukturierte auswertung nach festem schema: 3× dankbarkeit, erlebnisse, gedanken/erkenntnisse, gefühle
- abend-coach: benennt, was gut gelaufen ist / was markus schon gut macht

### 3.4 ki-assistent ("frage überall")
- globale frage-funktion mit zugriff auf **alle** je gespeicherten infos (todos, ziele, notizen, tagebuch, transkripte) — siehe `memory.md`

### 3.5 habits
- eigener bereich für tägliche routinen (kalt duschen, meditieren, stretching, sport, kaffee, …) mit tracking/streaks

### 3.6 weitere effizienz-hilfen (offen für vorschläge)
- siehe `architecture.md` §7 für konkrete vorschläge (z. b. inbox/capture, wochenreview-automatik, admin-kram-batching)

## 4. plattform- & betriebsanforderungen

- läuft **offline** als eigenständige app auf **macOS** und **iPhone**
- daten sollen (auch) "in der cloud" gespeichert werden — **annahme, siehe §6**
- rollen: **admin** sieht/darf alles, **user** sieht ausschließlich eigene daten
- iterationen sollen **versioniert** werden (siehe `claude.md` §5 / `changelog.md`)

## 5. externe dienste (vom nutzer vorgegeben)

| dienst | einsatzzweck | zeitpunkt |
|---|---|---|
| Auth0 | login/authentifizierung | v1 |
| Stripe | zahlungen/abo | v1 (technisch vorbereitet, aktivierung ggf. später) |
| Wispr Flow | diktat/transkription | v1 |
| Claude (Anthropic API) | "ki des vertrauens" — verarbeitung von diktaten, ziel-planung, coach, frage-überall | v1 |
| Supabase (oder ähnlich) | zentrale datenbank/sync | **später**, v1 startet lokal-first |

## 6. getroffene annahmen (bitte gegenprüfen)

1. **"daten sollen in der claude gespeichert werden"** wird interpretiert als: *(a)* die ki-intelligenz der app basiert auf claude/Anthropic-API, und *(b)* gemeint ist vermutlich **"cloud"** statt "claude" für die reine datenspeicherung — die app ist lokal-first (offline nutzbar), synchronisiert aber optional in eine cloud-datenbank (später supabase) für backup + abgleich zwischen mac und iphone. → **bitte bestätigen oder korrigieren.**
2. plattform-ansatz: **eine gemeinsame codebasis für macOS + iOS/iPadOS** (swift/SwiftUI), kein web-wrapper — begründung in `architecture.md` §2.
3. "jede woche zwei wochenziele" / "jeder monat drei hauptziele" gelten **pro bereich oder global** — angenommen: **konfigurierbar pro bereich**, mit globaler gesamtsicht.
4. wispr-flow-anbindung: es wird von einer **api/integration** ausgegangen (die in dieser claude-code-umgebung als MCP-tool sichtbare wispr-flow-anbindung dient als referenz, ist aber nicht automatisch identisch mit einer öffentlichen app-integration) — muss technisch verifiziert werden (siehe offene fragen).
5. stripe wird **vorbereitet, aber nicht zwingend sofort scharf geschaltet**, da v1 zunächst single-user (markus) ist.
6. admin/user-trennung wird von anfang an im datenmodell angelegt, auch wenn v1 nur einen aktiven nutzer hat.

## 7. offene fragen an den nutzer

1. ist mit "in der claude gespeichert" tatsächlich die anthropic/claude-api als ki-schicht gemeint, oder soll es heißen "in der **cloud**" (reine datenspeicherung)? oder beides?
2. hast du einen **Wispr-Flow-API-Zugang** (developer-api-key) oder soll die anbindung erstmal über manuellen transkript-import laufen und Wispr Flow später ergänzt werden?
3. soll die app **wirklich nativ** (swift/SwiftUI, bestes offline- und kalender-erlebnis) sein, oder ist ein cross-platform-ansatz (z. b. react native/Expo) wegen geschwindigkeit/wartung wichtiger? (empfehlung siehe `architecture.md`)
4. gibt es schon ein Auth0-tenant / Stripe-account, oder werden diese im rahmen des projekts neu angelegt?
5. sollen andere personen (team plenum/tecis?) je eigene accounts bekommen, oder bleibt es v1 strikt single-user mit vorbereiteter mehrnutzer-architektur?
6. wochenstart: montag oder sonntag? (für wochenziele/kalenderansicht relevant)

## 8. aktueller stand

- **phase 0 — planung/brainstorming** (dieses dokument + `claude.md`, `architecture.md`, `memory.md`, `ui_guidelines.md`)
- **noch keine implementierung.** nächster schritt nach freigabe der annahmen/offenen fragen: mvp-scope fixieren (siehe `claude.md` §6) und iteration `v0.1.0` starten.
