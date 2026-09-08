# memory.md — gedächtnis- & retrieval-architektur der ki

> beantwortet: wie kommt der globale ki-assistent ("frage überall") an "alle infos, die ich gegeben habe" — und wie speist sich der abend-coach aus der historie.

## 1. zweck

markus soll jederzeit fragen stellen können ("wann war noch mal das gespräch mit …", "wie oft habe ich diese woche schon meditiert", "was war mein wochenziel im bereich tecis") und eine antwort bekommen, die **alle** je erfassten daten berücksichtigt — nicht nur den aktuellen bildschirm-kontext.

## 2. gedächtnis-ebenen

| ebene | inhalt | speicherform | zugriff |
|---|---|---|---|
| **1. strukturiert** | goals, tasks, habits, habit_logs, areas | lokale datenbank (SwiftData/SQLite) | direkte, exakte abfragen (SQL-artig) — kein "raten" der ki nötig |
| **2. semi-strukturiert** | journal-einträge (feste sektionen), notizen mit tags | lokale datenbank + volltextindex | filterbar (datum, bereich, tag) + volltext |
| **3. unstrukturiert** | rohe transkripte, freitext-notizen ohne struktur | lokale datenbank + **embedding-index** (on-device oder via Claude API) | semantische suche (retrieval) |
| **4. konversation** | laufender chat mit dem assistenten | flüchtig/sessionbasiert, optional protokolliert | direkter kontext |

## 3. wie eine frage beantwortet wird (retrieval-pipeline)

```
nutzerfrage
   │
   ▼
1. intent/entity-erkennung (zeitraum? bereich? ziel-ebene? freitext-suche?)
   │
   ▼
2. strukturierte abfrage (ebene 1+2) direkt aus lokaler db
   +
   semantische suche (ebene 3) über embedding-index → top-k relevante snippets
   │
   ▼
3. zusammengestellter kontext (nur relevante ausschnitte, nicht "alles")
   │
   ▼
4. Claude API erhält: frage + kontext-ausschnitt + kurze systeminstruktion
   │
   ▼
5. antwort an nutzer (mit verweis/quelle, z. b. "laut tagebuch vom 3.9.")
```

wichtig: **nicht** bei jeder frage die komplette datenbank an die api schicken — retrieval wählt gezielt relevante ausschnitte aus (kosten, geschwindigkeit, datenschutz).

## 4. speicherort & datenschutz

- **lokal zuerst**: strukturierte + semi-strukturierte daten bleiben primär auf dem gerät (macOS/iPhone).
- **an die Claude-API gehen ausschließlich**: die für die jeweilige anfrage relevanten, retrievten ausschnitte + die frage selbst — nicht der gesamte datenbestand, nicht dauerhaft im klartext beim anbieter gespeichert über das nötige maß hinaus.
- **transparenz**: in der app sichtbar, welche daten für eine antwort herangezogen wurden ("basierend auf: 2 tagebucheinträge, 1 notiz").
- **opt-out**: einzelne einträge lassen sich als "nicht für ki-abfragen verwenden" markieren (z. b. besonders sensible tagebuch-passagen).
- **admin/user-trennung gilt auch hier**: der retrieval-index ist strikt user-scoped, ein admin-zugriff auf fremde daten ist ein bewusster, separat protokollierter vorgang — kein automatischer nebeneffekt der ki-funktion.
- sobald cloud-sync (supabase) existiert: embeddings können optional serverseitig (pgvector) gespiegelt werden, weiterhin user-scoped per row-level-security.

## 5. gedächtnis für den abend-coach

der `CoachFeedbackUseCase` braucht **mehr als den heutigen tag**, um ehrliches, spezifisches feedback zu geben ("das machst du schon **routiniert** gut" setzt historie voraus):

- **erfolgs-historie**: erledigte tasks/ziele der letzten tage/wochen
- **habit-streaks**: aktuelle und bisherige bestwerte
- **journal-trend**: wiederkehrende positive muster aus vorherigen `thoughts`/`feelings`-einträgen (z. b. "du erwähnst seit 3 wochen, dass frühes aufstehen dir hilft — das hast du diese woche 4x geschafft")
- **stärken-tracking**: einfache, wachsende liste erkannter stärken/muster (kein schweres profiling — ein leicht nachvollziehbares, editierbares "das läuft bei dir gut"-log, das der nutzer auch selbst einsehen/korrigieren kann)

## 6. update-zyklen (wann gedächtnis "verdichtet" wird)

| zyklus | trigger | output |
|---|---|---|
| täglich | abend-tagebuch gespeichert | strukturierter journal-eintrag + coach-feedback |
| wöchentlich | wochenende | wochenreview-entwurf (bezug zu den 2 wochenzielen), einfluss auf nächste wochenziele |
| monatlich | monatsende | abgleich der 3 monats-hauptziele, fortschritt Richtung quartalsziel |
| quartalsweise/jährlich | quartals-/jahresende | review Richtung jahresziel, projekt-fortschritt je bereich |

diese verdichtungen sind selbst wieder ebene-2-daten (semi-strukturiert) und fließen ins retrieval mit ein — der assistent kann also auch auf "wie lief mein letztes quartal im bereich tecis" antworten, ohne jeden einzeleintrag neu durchsuchen zu müssen.

## 7. offene punkte

- embeddings on-device (schneller, privater, aber begrenzter) vs. serverseitig — vorschlag: on-device solange v1 lokal-only ist, re-evaluieren bei supabase-einführung.
- aufbewahrungsfrist für rohtranskripte nach verarbeitung (löschen nach x tagen vs. dauerhaft behalten) — nutzerentscheidung nötig.
