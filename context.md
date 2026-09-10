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
| apple on-device-ki (Foundation Models) | ki-basis v1, kostenlos, offline, auf mac + iphone | v1 |
| Ollama (open-source-modell) | stärkere ki, optional, nur mac, kostenlos & offline | v1 (optional) |
| Claude (Anthropic API) | optionales, bezahltes "pro"-upgrade für anspruchsvollere ki-aufgaben | **später**, kein v1-bestandteil |
| Supabase (oder ähnlich) | zentrale datenbank/sync | **später**, v1 startet lokal-first |

## 6. getroffene annahmen (bitte gegenprüfen)

1. ~~"daten sollen in der claude gespeichert werden"~~ — **geklärt (§7.1): gemeint war "cloud".** die app ist lokal-first (offline nutzbar), synchronisiert optional in eine cloud-datenbank (später supabase) für backup + abgleich zwischen mac und iphone. die ki-schicht ist davon unabhängig geregelt (§7.9, hybrid-ansatz).
2. plattform-ansatz: **eine gemeinsame codebasis für macOS + iOS/iPadOS** (swift/SwiftUI), kein web-wrapper — **bestätigt (§7.3)**, begründung in `architecture.md` §2.
3. "jede woche zwei wochenziele" / "jeder monat drei hauptziele" gelten **pro bereich oder global** — angenommen: **konfigurierbar pro bereich**, mit globaler gesamtsicht.
4. wispr-flow-anbindung: es wird von einer **api/integration** ausgegangen (die in dieser claude-code-umgebung als MCP-tool sichtbare wispr-flow-anbindung dient als referenz, ist aber nicht automatisch identisch mit einer öffentlichen app-integration) — muss technisch verifiziert werden.
5. stripe wird **vorbereitet, aber nicht zwingend sofort scharf geschaltet**, da v1 zunächst single-user (markus) ist — **bestätigt (§7.4/§7.5)**.
6. admin/user-trennung wird von anfang an im datenmodell angelegt, auch wenn v1 nur einen aktiven nutzer hat — **bestätigt (§7.5): v1 bleibt strikt single-user, mehrnutzer erst bei geplanter app-store/online-veröffentlichung relevant.**
7. **ki-schicht ist hybrid** (§7.9): standardmäßig kostenlos & offline (apple on-device-modell auf beiden geräten, optional ein stärkeres, selbst gehostetes open-source-modell via Ollama auf dem mac), claude-api optional als späteres bezahltes "pro"-upgrade — siehe `architecture.md` §2.1.

## 7. offene fragen an den nutzer — beantwortet

1. **"in der claude gespeichert"**: gemeint war **"cloud"** (reine datenspeicherung), nicht die claude/anthropic-api. → siehe annahme §6.1.
2. **Wispr-Flow-API-Zugang**: kein eigener developer-api-key vorhanden → start über manuellen transkript-import, Wispr Flow-anbindung wird später ergänzt, sobald zugang besteht.
3. **nativ vs. cross-platform**: **nativ (swift/SwiftUI)** — begründung an markus erläutert (ein Xcode-projekt für mac+iphone gemeinsam, tiefste kalender-/benachrichtigungs-integration, kein android/web geplant) und von ihm akzeptiert.
4. **Auth0/Stripe-accounts**: noch keine vorhanden → werden im rahmen des projekts neu angelegt, sobald relevant (noch nicht für v1 nötig).
5. **mehrnutzer**: v1 bleibt **strikt single-user** (nur markus). später (nach app-store-/online-veröffentlichung) sollen weitere nutzer eingeladen werden können — architektur bleibt dafür vorbereitet (rollenmodell, `user_id`-scoping), aber ungenutzt bis dahin.
6. **wochenstart**: **montag** als default, **aber in den einstellungen änderbar** (`UserSettings.week_start`, bereits im datenmodell vorgesehen, siehe `architecture.md` §5).
7. **beta-feedback-button**: soll **an ein eigenes backend angebunden** sein (nicht nur `mailto:`) — siehe `architecture.md` §4.11 (aktualisiert) für die technische umsetzung.
8. **"etwas smarter"**: bestätigt — die im mockup gezeigte richtung (ki-hinweise/banner/badges/trend-insights) passt, **zusätzlich ausdrücklich gewünscht: proaktive vorschläge** (die app schlägt von sich aus dinge vor, statt nur auf anfrage zu reagieren — z. b. quick-win-vorschläge, wochenreview-entwürfe, siehe `architecture.md` §7).
9. **opensource-ki statt/neben claude-api?** (neue frage, aus dem gespräch): markus wünscht eine **kostenlose ki-lösung**. entschieden: **hybrid-ansatz** — standardmäßig kostenlos & offline (apple on-device-ki auf mac + iphone, optional ein stärkeres open-source-modell via Ollama auf dem mac für aufgaben, die mehr leistung brauchen), claude-api bleibt als **optionales, späteres bezahl-upgrade** vorgesehen (passt zur ohnehin geplanten Stripe-anbindung). siehe `architecture.md` §2.1 für die technische ausgestaltung.

### noch offen (neu entstanden aus diesem klärungsrunde)
- welches konkrete open-source-modell für den Ollama-pfad (z. b. Llama 3.1 8B vs. Mistral 7B vs. Qwen2.5) — kann bei bedarf getestet/verglichen werden, sobald der ki-layer implementiert wird.
- welches backend für den feedback-button (§7.7) — eigenes schlankes backend (z. b. kleine serverless-funktion + datenbank) ist geplant, konkrete technologie noch offen für `architecture.md`.

## 8. aktueller stand

- **iteration v0.2.0 — erster lauffähiger stand.** siehe `README.md`/`CHANGELOG.md`: ein web-prototyp (`app/`, im browser getestet) und ein Swift/SwiftUI-startpunkt (`native/`, nicht kompiliert — kein Xcode in dieser umgebung) existieren parallel.
- **alle offenen fragen aus §7 sind jetzt beantwortet** (klärungsrunde nach v0.2.0). nativ (swift/SwiftUI) ist damit der bestätigte hauptweg — der web-prototyp bleibt als sofort nutzbarer zwischenstand bestehen, ist aber nicht mehr der langfristige zielpfad.
- nächste iteration (`v0.3.0`) plant u. a. die ki-schicht (hybrid, §7.9) und den feedback-backend-anschluss (§7.7) — siehe `claude.md` §8.
