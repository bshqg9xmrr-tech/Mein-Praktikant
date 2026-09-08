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
- **zweistufiger todo-flow** (nutzer-feedback, iteration 2): (1) tagestodos werden zunächst über eine **ganz einfache eingabefunktion** erfasst (nur text, kein pflicht-feld für bereich/dauer/uhrzeit — schwelle für adhs-typisches "sofort festhalten" so niedrig wie möglich), (2) **erst danach** übernimmt die ki die einordnung (bereich, geschätzte dauer, reihenfolge, pausen) und erstellt daraus den tagesablauf — **automatischer export in den kalender** ist teil dieses zweiten schritts, kein separater manueller vorgang
- morgen-erinnerung + priorisierter, ki-geplanter tagesablauf (reihenfolge der todos)
- ki schätzt aufwand/dauer je aufgabe (und lernt aus der historie)
- pausen werden aktiv mitgeplant (kein durchgetakteter tag)

### 3.2 notizen
- freie notizfunktion für "spannende dinge"

### 3.3 tagebuch
- tägliches freitext-/diktat-tagebuch
- abends: pop-up/erinnerung zum schreiben
- **diktierfunktion für den gesamten tag** (nutzer-feedback, iteration 2): markus kann abends frei drauflos sprechen/diktieren — die ki übernimmt die aufteilung in die festen sektionen selbst, statt jede sektion einzeln antippen/diktieren zu müssen
- strukturierte auswertung nach festem schema: 3× dankbarkeit, erlebnisse, gedanken/erkenntnisse, gefühle
- **erledigte todos des tages werden automatisch ins tagebuch übernommen** (nutzer-feedback, iteration 2) — eigener abschnitt "heute erledigt", ohne dass markus das nochmal eintippen muss
- abend-coach: benennt, was gut gelaufen ist / was markus schon gut macht

### 3.4 ki-assistent ("frage überall")
- globale frage-funktion mit zugriff auf **alle** je gespeicherten infos (todos, ziele, notizen, tagebuch, transkripte) — siehe `memory.md`

### 3.5 habits
- eigener bereich für tägliche routinen (kalt duschen, meditieren, stretching, sport, kaffee, …) mit tracking/streaks

### 3.6 weitere effizienz-hilfen (offen für vorschläge)
- siehe `architecture.md` §7 für konkrete vorschläge (z. b. inbox/capture, wochenreview-automatik, admin-kram-batching)

### 3.7 übersicht / fortschritts-dashboard (nutzer-feedback, iteration 2)
- **eigene "übersichtsfolie"**, getrennt von der ziele-hierarchie-ansicht — zweck: transparenz über den eigenen fortschritt auf einen blick, nicht die bearbeitung/navigation der ziele selbst (dafür ist §3.1/die ziele-ansicht da)
- inhalt: wochenziel-/monatsziel-status, jahresziel-fortschritt je bereich, erledigte todos über zeit (verlauf), habit-streaks, ein kurzer "trend"-hinweis (z. b. realistischere zeitschätzung über die zeit — siehe `memory.md` §5/§6 für die datengrundlage)

### 3.8 einstellungen
- eigener einstellungsbereich (nutzer-feedback, iteration 2: "überleg dir sinnvolle einstellungsmöglichkeiten"), grob gegliedert in: bereiche verwalten, ziel-einstellungen (anzahl wochen-/monatsziele, wochenstart), erinnerungszeiten (morgen/abend, an/aus), kalender & planung (verknüpfter kalender, automatischer export an/aus, standard-pausenlänge), diktat & ki (wispr-flow-verbindung, ob tagebuch-inhalte für ki-fragen nutzbar sind, aufbewahrung von rohtranskripten), darstellung (hell/dunkel, textgröße), konto & abo (Auth0-konto, Stripe-abo, datenexport, konto löschen)
- diese liste ist ein **vorschlag** — siehe `ui_guidelines.md` für die visuelle umsetzung, feinschliff nach nutzer-rückmeldung

### 3.9 beta-feedback
- **feedback-möglichkeit direkt in der app**, mindestens für die beta-phase (nutzer-feedback, iteration 2) — sichtbar u. a. in den einstellungen (prominent) und als kleiner "beta"-hinweis auf den kernbildschirmen
- technische umsetzung (e-mail-versand, formular an ein backend, oder ein einfaches ticket-system) ist noch offen — siehe offene fragen (`context.md` §7)

## 4. plattform- & betriebsanforderungen

- läuft **offline** als eigenständige app auf **macOS** und **iPhone** — **ausdrücklich bestätigt** (nutzer-feedback, iteration 2: "bitte sowohl für PC app, als auch Smartphone app umsetzen"), beide plattformen sind gleichrangig, keine ist "nebenbei" mitgedacht
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
3. soll die app **wirklich nativ** (swift/SwiftUI, bestes offline- und kalender-erlebnis) sein, oder ist ein cross-platform-ansatz (z. b. react native/Expo) wegen geschwindigkeit/wartung wichtiger? — dass **beide** plattformen (mac + iphone) gebraucht werden, ist jetzt bestätigt (§4); offen ist nur noch **wie** (nativ vs. cross-platform). (empfehlung siehe `architecture.md`)
4. gibt es schon ein Auth0-tenant / Stripe-account, oder werden diese im rahmen des projekts neu angelegt?
5. sollen andere personen (team plenum/tecis?) je eigene accounts bekommen, oder bleibt es v1 strikt single-user mit vorbereiteter mehrnutzer-architektur?
6. wochenstart: montag oder sonntag? (für wochenziele/kalenderansicht relevant)
7. **beta-feedback-button** (§3.9): wohin soll das feedback gehen — direkt an eine e-mail-adresse, ein einfaches formular/backend, oder ein bestehendes tool (z. b. ein ticket-system)? beeinflusst den technischen aufwand für die beta.
8. "und gerne etwas smarter" (nutzer-feedback, iteration 2) ist bewusst offen formuliert — im mockup (v2) wurde das als sichtbare ki-hinweise umgesetzt (banner "dein tag ist automatisch geplant", "ki-vorschlag"-badges bei pausen, "ki-geschätzt" bei dauer-schätzungen, trend-insights im übersichts-dashboard). passt diese richtung, oder schwebt dir etwas anderes vor (z. b. proaktive vorschläge, tiefere automatisierung an anderer stelle)?

## 8. aktueller stand

- **phase 0 — planung/brainstorming** (dieses dokument + `claude.md`, `architecture.md`, `memory.md`, `ui_guidelines.md`)
- **noch keine implementierung.** nächster schritt nach freigabe der annahmen/offenen fragen: mvp-scope fixieren (siehe `claude.md` §6) und iteration `v0.1.0` starten.
