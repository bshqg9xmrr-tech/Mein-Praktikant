# changelog

alle nennenswerten iterationen dieses projekts werden hier protokolliert. format angelehnt an [keep a changelog](https://keepachangelog.com/), versionierung nach [semver](https://semver.org/) (solange `0.x.y`: alles kann sich noch ändern).

## [unveröffentlicht] — 2026-09-13 — "verlauf" gefüllt: zeitstrahl + abend-tagebuch + habits als modal (`app/`) — klärungsrunde damit vollständig umgesetzt

nutzer-auftrag: teil 5 (letzter view) der klärungsrunde — `verlauf.js` (bisher nur ein platzhalter) zeigt jetzt einen echten, vertikalen zeitstrahl aus todos/habits/tagebuch, inkl. wiedererreichbarem tagebuch-eintrag und habit-abhaken (beide bisher nur über keinen tab mehr erreichbar) über modals (`architecture.md` §2.2, `context.md` §3.3/§3.7/§3.11). **damit ist das komplette, in der klärungsrunde neu gedachte konzept (strom/kompass/verlauf, login-gate, onboarding) jetzt vollständig in `app/` umgesetzt** — siehe die vorherigen drei einträge unten ("login-pflicht + onboarding-wizard", "neue navigation + 'strom'", "'kompass' gefüllt") für die anderen teile.

### hinzugefügt/geändert — `app/js/verlauf.js`
- **vertikaler zeitstrahl** der letzten 21 tage (praktikabler zeitraum, nicht zu lang, wie in der aufgabenstellung gefordert): pro tag mit irgendeiner aktivität (erledigte todos, abgehakte habits, ein tagebuch-eintrag) ein kompakter eintrag — anzahl erledigter todos, welche habits abgehakt wurden (nutzt `habits.js#currentStreak`/`isDoneToday` unverändert wieder), ein auf ~60 zeichen gekürzter tagebuch-auszug. tage ganz ohne jegliche aktivität werden übersprungen; der heutige tag bleibt als einziger immer sichtbar (fester einstiegspunkt für die reflexions-aktion, siehe unten), auch wenn er noch leer ist.
- **filter-pills** (alle/ziele/habits/stimmung): rein clientseitig (kein neu-laden), blenden pro tages-eintrag die jeweils nicht relevanten teile aus und lassen tage ohne für den filter relevante aktivität ganz weg (der heutige tag bleibt filterunabhängig als anker sichtbar).
- **mood-punkt = zeitstrahl-punkt**: der farbige punkt auf der zeitstrahl-linie ist zugleich der im mockup geforderte "mood-punkt pro tag" — eine stelle im markup für beide anforderungen. **wichtig, wie überall im projekt klar gekennzeichnet (keine echte stimmungserkennung)**: existiert ein `JournalEntry` für den tag, wird die farbe aus dessen bereits selbst gewählten `feelings` abgeleitet (feste, grobe zuordnung "zufrieden/ruhig/motiviert/dankbar" → positiv, "erschöpft/unruhig/überfordert/gereizt" → angespannt), ersatzweise aus einer ganz einfachen wortlisten-suche im freitext (dieselbe ehrlichkeits-konvention wie `strom.js#classify()`) — ohne eindeutigen ausschlag neutral-grau ("gemischt/unklar"). gibt es gar keinen tagebuch-eintrag, aber sonst aktivität an dem tag, ist der punkt ebenfalls neutral-grau, aber mit dem klaren label "keine angabe" statt eine stimmung zu erfinden.
- **"aufgefallen"-karte** (im bestehenden `.ai-banner`-stil, akzent-getönt): zeigt höchstens **eine** einzelne, lokal berechnete auffälligkeit — zuerst versucht, ein habit zu finden, das deutlich länger nicht abgehakt wurde als sein bisheriger durchschnittlicher abstand zwischen erledigungen (braucht mind. 3 bisherige logs, sonst ist "sonst üblich" nicht aussagekräftig); sonst ein klarer wochenvergleich bei erledigten todos (>= 25 prozentpunkte relative veränderung, nur bei ausreichender basis in der vorwoche). reicht die datenlage für keinen der beiden nicht aus, erscheint **gar keine karte** — lieber nichts zeigen als etwas erfinden. im UI als "lokale statistik, keine ki" beschriftet.
- **"heute reflektieren" / "heutigen eintrag bearbeiten"**: button am heutigen zeitstrahl-eintrag, öffnet `journal.js`s **komplett unverändertes** `render()` in einem modal (siehe unten).
- **"habits heute abhaken"**: klickbare karte oben im view (mit live-zusammenfassung "N von M heute erledigt"), öffnet `habits.js`s **komplett unverändertes** `render()` ebenfalls in einem modal.

### geändert — `app/js/ui.js`
- `openModal()` akzeptiert jetzt einen optionalen dritten parameter `onClose` — feuert, egal ob das modal per backdrop-klick oder per `closeModal()` (z. b. ein eigener schließen-button) geschlossen wird. rein additiv, bestehende aufrufer (`strom.js`, `kompass.js`) unverändert kompatibel. `verlauf.js` nutzt das, um nach dem schließen von journal-/habits-modal neu zu rendern (frischer eintrag/abgehaktes habit sofort im zeitstrahl sichtbar).

### wiederverwendet, nicht neu gebaut
- `journal.js` und `habits.js` mussten **nicht angepasst werden** — beide suchen ihren render-container schon immer per `document.getElementById("view-journal"/"view-habits")`; `verlauf.js` stellt diesen container einfach innerhalb eines modals bereit (`<div id="view-journal">`/`<div id="view-habits">`) und ruft die bestehenden `render()`-funktionen unverändert auf. echte streak-berechnung, strukturierte tagebuch-felder inkl. automatisch übernommener erledigter todos — alles 1:1 aus den bestehenden modulen.

### geändert — `app/styles.css`
- neue, kleine klassen für den zeitstrahl (`.timeline`, `.timeline-item`, `.mood-dot`, `.timeline-date`, `.timeline-line-item`) — vertikale linie + punkte pro tag, wie im abgestimmten mockup. bestehende bausteine (`.card`, `.ai-banner`, `.pill`, `.chip-row`, `.btn-ghost`, `.empty-hint`) wiederverwendet, keine neue design-sprache erfunden.

### getestet
- lokal per `python3 -m http.server` + playwright/chromium (login-gate via `window.__mpDebugSession`-test-hook + vorkonfiguriertem, fiktivem cloud-projekt übersprungen, onboarding per "später" übersprungen — kein echtes postfach in dieser umgebung verfügbar, wie in den vorherigen iterationen):
  - initialer zustand (seed-daten, ein heute erledigtes todo): zeitstrahl zeigt korrekt nur den heutigen eintrag ("1 todo erledigt", mood-punkt grau "keine angabe"), keine "aufgefallen"-karte (datenlage zu dünn) — wie erwartet.
  - "habits heute abhaken" → modal öffnet mit `habits.js`s echter liste, ein habit abgehakt → streak-pill wechselt korrekt von "0 tage streak" auf "1 tag streak" (per DOM-check innerhalb des modals verifiziert), zusammenfassungs-karte im hintergrund aktualisiert sich nach dem schließen auf "1 von 4 heute erledigt", zeitstrahl-eintrag zeigt "1 habit abgehakt: kalt duschen".
  - "heute reflektieren" → modal öffnet mit `journal.js`s echtem formular, freitext + ein gefühl ("zufrieden") gesetzt, gespeichert, modal geschlossen → button-label wechselt korrekt zu "heutigen eintrag bearbeiten", zeitstrahl-eintrag zeigt den gekürzten auszug + mood-punkt jetzt grün ("eher positiv").
  - filter-pills "stimmung"/"habits"/"ziele" blenden jeweils korrekt nur die relevanten zeilen des heutigen eintrags ein, andere teile werden ausgeblendet — verifiziert per textinhalt-vergleich.
  - `computeInsight()` gezielt mit synthetischen `localStorage`-daten getestet (ein habit mit 10 logs im 1-tages-rhythmus, dann 6 tage lücke) → "aufgefallen"-karte erscheint korrekt mit "seit 6 tagen kein „meditieren“ abgehakt — länger als bei dir sonst üblich." im `.ai-banner`-stil.
  - mobile viewport (iPhone-13-emulation) und desktop-sidebar-layout beide geprüft, sehen wie erwartet aus (screenshots geprüft).
  - navigation zu strom/kompass/einstellungen bleibt unbeeinträchtigt.
  - **keine js-konsolenfehler** (einzige beobachtete meldung: der bereits aus allen vorherigen iterationen bekannte, blockierte netzwerkzugriff auf `esm.sh`, reine sandbox-einschränkung dieser testumgebung, kein code-fehler).

### noch offen / bewusst nicht enthalten
- die mood-heuristik und die "aufgefallen"-logik sind, wie oben ausführlich beschrieben, bewusst einfache, lokal nachvollziehbare berechnungen — kein sprachmodell, kein sentiment-verständnis. echte ki-gestützte muster-erkennung (`architecture.md` §2.1) folgt erst mit der ki-schicht.
- `overview.js`s wochen-balkendiagramm (erledigte todos letzte 7 tage) ist inhaltlich in den neuen zeitstrahl übergegangen, aber nicht 1:1 als diagramm — bewusste vereinfachung, ein zweites, redundantes diagramm neben dem zeitstrahl hätte keinen zusätzlichen nutzen gebracht.
- kein diktat-button im journal-modal (unverändert aus `journal.js`, folgt weiterhin erst mit der ki-anbindung).
- `native/` unverändert.

## [unveröffentlicht] — 2026-09-13 — "kompass" gefüllt: ziel-pfad + lokaler ki-entwurf + habit-verknüpfung (`app/`)

nutzer-auftrag: teil 4 der klärungsrunde (siehe einträge weiter unten) — `kompass.js` (bisher nur ein platzhalter) zeigt jetzt die tatsächliche ziel-hierarchie als verjüngenden pfad, inkl. eines einfachen, lokalen "ki-entwurf"-mechanismus für die ebenen unter dem jahresziel und einer oberfläche zum habit-ziel-verknüpfen (`architecture.md` §2.2/§4.1, `context.md` §3.1).

### hinzugefügt/geändert — `app/js/kompass.js`
- **pfad-darstellung pro bereich**: bereichs-pills oben (default: der erste bereich mit einem jahresziel, sonst der erste bereich überhaupt) zeigen eine karten-kette jahresziel → seine kinder (je nachdem, was tatsächlich existiert, über `goals.js#childrenOf`/`goalsForLevel`) → wochenziel(e) — jede karte etwas kleiner als die darüber ("verjüngender pfad", wie im abgestimmten mockup), mit bereichsfarbigem, ebenfalls verjüngendem verbindungs-strich links. jede karte zeigt ihren fortschrittsbalken über `goals.js#effectiveProgress()` (bereits erweitert um habit-konsistenz, siehe eintrag "datenmodell: habits zählen jetzt auf ziele ein" weiter unten).
- **badges nach `goal.origin`**: "von dir" (`user_defined`), gestrichelte karte + "ki-vorschlag · offen" mit "ändern"/"bestätigen"-buttons (`ai_proposed`), "ki-entwurf · bestätigt" (`user_confirmed`) — vollständig implementiert, greift automatisch, sobald `ai_proposed`-ziele existieren.
- **leerer zustand**: kein jahresziel im gewählten bereich → ein "jahresziel für {bereich} festlegen"-cta öffnet ein einfaches formular (titel), nutzt `goals.js#createGoal()` wieder (wie schon in `goals-view.js`).
- **einfacher, rein lokaler "ki-entwurf"-mechanismus** (ausdrücklich **keine echte ki**, dieselbe ehrlichkeits-konvention wie `strom.js#classify()`): hat ein blatt-ziel (jahr/quartal/monat ohne unterziele) eine vorschlagbare nächste ebene, erscheint ein button "monats-/wochenziel vorschlagen lassen". der vorschlag ist ein simpler, deterministischer textbaustein (übernimmt den titel des übergeordneten ziels leicht umformuliert, z. b. „…“ — schritt für diesen monat/diese woche) und wird mit `origin: "ai_proposed"` als kind angelegt. "bestätigen" setzt `origin` direkt auf `user_confirmed`; "ändern" öffnet ein formular zum anpassen des titels, setzt `origin` beim speichern ebenfalls auf `user_confirmed`.
- **pragmatische vereinfachung** (dokumentiert im code-kommentar, dieselbe art von entscheidung wie das weglassen der `day`-ebene, architecture.md §5): der entwurfs-mechanismus bildet nur "jahr → monat → woche" nach und überspringt die quartalsebene automatisch (ein jahresziel ohne unterziele bekommt direkt einen monatsziel-vorschlag, kein automatischer quartalsziel-zwischenschritt). eine quartalsebene lässt sich weiterhin ganz normal manuell anlegen — `goals.js` unterstützt und zeigt sie unverändert korrekt an (siehe die bestehende, vollständige tecis-kette in den seed-daten, die von diesem schritt nicht angefasst wurde).
- **habit-verknüpfung über die oberfläche** (bisher nur direkt in den daten möglich, siehe "noch offen" im eintrag "datenmodell: habits zählen jetzt auf ziele ein" weiter unten): jede blatt-ziel-karte zeigt ihre direkt verlinkten todos und habits als kurze zusammenfassung + pill-liste ("3 todos · 1 habit verlinkt"), plus einen "+ habit verknüpfen"-button — öffnet ein auswahl-modal mit allen `Habits.all()`, setzt `habit.goalId` (reassignment möglich, mit hinweis, falls ein habit schon an ein anderes ziel verknüpft ist). ein klick auf ein verlinktes habit-pill löst die verknüpfung wieder (mit bestätigung).

### geändert — `app/styles.css`
- drei neue, kleine klassen für die ki-entwurf-optik (`.card-ai-draft`, `.pill-badge-ai`, `.pill-badge-confirmed`) — bestehende liquid-glass-bausteine (`.card`, `.pill`, `.progress-track`, `.chip-row`, `.btn-ghost`, `.ai-note`) wiederverwendet, keine neue design-sprache erfunden.

### getestet
- lokal per `python3 -m http.server` + playwright/chromium (login-gate via `window.__mpDebugSession`-test-hook übersprungen, onboarding per "später" auf beiden schritten übersprungen — kein echtes postfach in dieser umgebung verfügbar, wie in den vorherigen iterationen):
  - bereichswechsel funktioniert; default-auswahl ist korrekt "tecis" (einziger bereich mit jahresziel in den seed-daten) und zeigt den vollen pfad jahr → quartal → monat → 2× woche mit den erwarteten, unveränderten fortschrittswerten (60/60/60/100/20%) und durchweg "von dir"-badges.
  - "privat" (in den seed-daten nur ein verwaistes wochenziel ohne jahresziel) zeigt korrekt den leeren zustand; testweise ein jahresziel angelegt → "monatsziel vorschlagen lassen" erzeugt einen `ai_proposed`-eintrag mit gestricheltem rahmen + korrektem badge.
  - "ändern" (titel anpassen + speichern) und "bestätigen" (unverändert übernehmen) setzen `origin` beide korrekt auf `user_confirmed`, per direkter `localStorage`-prüfung verifiziert.
  - ein zuvor unverlinktes habit ("meditieren") an ein wochenziel mit `manualProgress: 100` gehängt → fortschrittsbalken reagiert sofort (fällt auf die habit-konsistenz zurück, 0% ohne log, korrekt anteilig nach einem simulierten `HabitLog`-eintrag für heute, zurück auf 100% nach dem lösen der verknüpfung) — bestätigt, dass `effectiveProgress()` aus teil 1 korrekt einfließt.
  - navigation zu strom/verlauf/einstellungen bleibt unbeeinträchtigt.
  - **keine js-konsolenfehler** (einzige beobachtete meldung: der bereits aus früheren iterationen bekannte, blockierte netzwerkzugriff auf `esm.sh`, reine sandbox-einschränkung dieser testumgebung, kein code-fehler).

### noch offen / bewusst nicht enthalten
- **echter ki-vorschlags-flow bleibt aus** — der entwurfs-mechanismus ist, wie oben beschrieben, ein einfacher textbaustein, kein sprachmodell. `BreakdownGoalUseCase` (architecture.md §4.1) folgt erst mit der ki-schicht aus §2.1.
- die quartals-ebene wird vom entwurfs-mechanismus bewusst nicht automatisch vorgeschlagen (siehe oben) — manuelles anlegen bleibt möglich.
- `verlauf.js` bleibt weiterhin nur ein platzhalter (nächster schritt).

## [unveröffentlicht] — 2026-09-13 — neue navigation + "strom" (`app/`)

nutzer-auftrag: teil 3 der klärungsrunde (siehe eintrag weiter unten) — die neue 3-bereiche-navigation (strom/kompass/verlauf) ist jetzt tatsächlich in `app/` umgesetzt, und "strom" (ersetzt today.js + notes.js) ist der erste der drei bereiche, der wirklich fertig gebaut ist (`architecture.md` §2.2, `context.md` §3.1).

### geändert — `app/index.html`, `app/styles.css`, `app/js/main.js`
- die bottom-/sidebar-navigation hat jetzt **drei statt sieben tabs**: strom, kompass, verlauf. neue icons (pfeil-aus-klammer für strom, kompass-nadel für kompass, trend-linie für verlauf statt der bisherigen uhr).
- **einstellungen ist kein eigener tab mehr** — erreichbar über ein neues zahnrad-icon oben rechts in der topbar, direkt neben dem bestehenden beta-pill (neue `.topbar-actions`-gruppe in `styles.css`). technisch bleibt es dasselbe `showView("settings")` wie vorher, nur der einstiegspunkt hat sich geändert.
- `main.js`: `views` ist jetzt `{ strom, kompass, verlauf, settings }` statt der bisherigen sieben module. alte view-container (`#view-today`, `#view-goals`, `#view-notes`, `#view-journal`, `#view-habits`, `#view-overview`) sind durch `#view-strom`, `#view-kompass`, `#view-verlauf` ersetzt (`#view-settings` bleibt).

### hinzugefügt — `app/js/strom.js` (neu, ersetzt inhaltlich `today.js` + `notes.js`)
- **ein einziges erfassungsfeld**, danach läuft eine **lokale, deterministische einordnungs-heuristik** (ausdrücklich **keine echte ki** — architecture.md §2.1 beschreibt die geplante ki-schicht, die es hier noch nicht gibt) über den text und schlägt eine kategorie vor: enthält der text ein "?" oder wörter wie "vielleicht"/"idee"/"überlegen" → "gedanke"; enthält er gefühlsbezogene wörter ("genervt", "müde", "gestresst", "dankbar" u. ä.) → "gefühl"; alles andere → "todo" (default, wie bisher). die einordnung ist im UI klar als "lokale einordnung · keine echte ki" beschriftet (kleingedrucktes unter der liste + hinweistext im korrektur-dialog).
- **"gerade einsortiert"-liste**: die letzten (bis zu 5) heute erfassten einträge mit einem klickbaren pill-badge ("→ todo"/"→ gedanke"/"→ gefühl"). klick öffnet einen kleinen auswahl-dialog, um die kategorie nachträglich zu korrigieren — inkl. echter **migration zwischen den collections** (todo ↔ notiz), nicht nur ein umbenanntes label.
- **pragmatische entscheidung** (dokumentiert im code-kommentar): "gefühl"-einträge landen technisch als ganz normale `Note` mit dem zusätzlichen tag `"gefühl"` — ein eigenes append-log wäre hier unnötige komplexität, da `JournalEntry` auf einen strukturierten eintrag pro tag ausgelegt ist, kein lose collection von einzelnen gefühls-schnipseln.
- **"jetzt wichtig"**: zeigt standardmäßig nur die obersten 2–3 offenen todos des tages (dieselbe sortierung wie bisher: geplante uhrzeit, sonst erfassungsreihenfolge), mit einem "N weitere anzeigen"-ghost-link, der die restliche liste (inkl. bereits erledigter todos) inline einblendet — kein separater screen.
- alle bereits bestehenden, guten mechanismen aus `today.js` **1:1 übernommen**: rückgängig-toast beim löschen, mehrzeiliges paste (jede zeile wird jetzt zusätzlich einzeln klassifiziert statt immer ein todo zu werden), "alles erledigt"-banner, lokale tages-planung + echter `.ics`-kalender-export.
- `notes.js` bleibt unverändert im repo bestehen (nicht gelöscht) — als notiz/gefühl eingeordnete strom-einträge landen weiterhin in derselben `Notes`-collection, bleiben also für spätere teile der app (z. b. volltextsuche) nutzbar, auch wenn `notes.js` selbst aktuell von keinem tab mehr aus erreichbar ist.

### hinzugefügt — `app/js/kompass.js`, `app/js/verlauf.js` (neu, **bewusst nur minimale platzhalter**)
- beide module exportieren nur ein `render()`, das eine kurze "kommt als nächstes"-karte im liquid-glass-stil zeigt, damit die neue 3-tab-navigation vollständig funktioniert, ohne `main.js` zu brechen.
- **ausdrücklich noch keine inhaltliche umsetzung** — die bisherige, voll funktionierende logik dafür ist unverändert vorhanden und wird in den nächsten beiden schritten weiterverwendet: `goals.js`/`goals-view.js` (ziel-hierarchie, wird zu kompass), `overview.js`/`habits.js`/`journal.js` (dashboard/streaks/tagebuch, wird zu verlauf).

### getestet
- lokal per `python3 -m http.server` + playwright/chromium (login-gate via dokumentierten `window.__mpDebugSession`-test-hook übersprungen, cloud-projekt mit fiktiven, aber syntaktisch gültigen werten vorkonfiguriert, onboarding per "später" übersprungen — kein echtes postfach in dieser umgebung verfügbar, wie schon in den vorherigen iterationen):
  - capture eines normalen satzes → landet korrekt als todo in "jetzt wichtig".
  - capture von "vielleicht sollte ich mal … ausprobieren" → korrekt als "gedanke" eingeordnet; capture von "ich bin heute ziemlich gestresst" → korrekt als "gefühl" eingeordnet.
  - klick auf ein badge → auswahl-dialog öffnet, kategorie lässt sich ändern, migration zwischen Tasks/Notes funktioniert (verifiziert: todo → gedanke, alter eintrag verschwindet aus Tasks, taucht als Note wieder auf).
  - "jetzt wichtig" zeigt reduziert (3 von 4+ offenen todos), "N weitere anzeigen" blendet den rest (inkl. erledigter todos) ein, "weniger anzeigen" klappt wieder ein.
  - mehrzeiliger paste (3 zeilen, gemischte kategorien) → alle drei zeilen einzeln erfasst und korrekt unterschiedlich eingeordnet, sammel-toast erscheint.
  - rückgängig-toast beim löschen funktioniert unverändert (löschen → toast mit "rückgängig" → klick stellt die aufgabe wieder her).
  - alle todos abhaken → "heute erledigt"-banner erscheint, expandierte liste zeigt alle (durchgestrichen).
  - navigation zwischen allen drei neuen tabs + zahnrad → einstellungen funktioniert, sowohl mobile (bottom-tabbar) als auch desktop (sidebar, ≥900px) layout geprüft.
  - **keine js-konsolenfehler** in allen obigen durchläufen (einzige beobachtete meldung: der bereits aus früheren iterationen bekannte, blockierte netzwerkzugriff auf `esm.sh` — eine reine sandbox-einschränkung dieser testumgebung, kein code-fehler).

### noch offen / für die nächsten schritte
- `kompass.js` und `verlauf.js` sind **nur platzhalter** — die eigentliche inhaltliche umsetzung (ziel-hierarchie mit ki-entwurf-vorschlägen bzw. gemeinsame zeitachse aus todos/habits/tagebuch/zielen) folgt als zwei eigene, nächste schritte.
- `journal.js`, `habits.js`, `overview.js`, `goals-view.js` sind unverändert im repo, aber aktuell von keinem tab mehr erreichbar (werden in den nächsten schritten in `kompass.js`/`verlauf.js` aufgehen bzw. deren logik dorthin portiert).
- keine neue datenmodell-änderung nötig für diesen schritt — die einordnungs-heuristik nutzt ausschließlich bereits bestehende felder (`Note.tags`).

## [unveröffentlicht] — 2026-09-13 — datenmodell: habits zählen jetzt auf ziele ein

nutzer-auftrag: erster umsetzungsschritt der klärungsrunde (siehe eintrag unten) — teil 1 von mehreren, **nur** datenmodell + fortschritts-berechnung, bewusst noch keine UI-änderung (`architecture.md` §2.2/§4.1/§4.6, `context.md` §3.1/§3.5/§7.10).

### geändert — `app/js/storage.js`
- `Habit` bekommt ein neues, optionales feld `goalId` (analog zu `Task.goalId`) — verknüpft ein habit optional mit einem ziel.
- `Goal` bekommt ein neues feld `origin` (`"user_defined"` | `"ai_proposed"` | `"user_confirmed"`) — bisher legt markus jedes ziel selbst an, alle bestehenden/neuen ziele bekommen `"user_defined"` (der ki-vorschlags-flow selbst ist noch nicht angebunden).
- `load()` ergänzt fehlende felder auf bereits gespeicherten alt-daten defensiv (`habit.goalId ??= null`, `goal.origin ??= "user_defined"`), analog zum bestehenden muster für fehlende collections.
- seed-daten: `habit_sport` ist jetzt testweise mit dem beispielziel `goal_week_privat` verknüpft, um die neue verbindung mit echten daten testen zu können.

### geändert — `app/js/goals.js`
- `effectiveProgress()` berücksichtigt jetzt zusätzlich zu direkt verlinkten tasks auch direkt verlinkte habits: deren konsistenz im zeitraum des ziels (anteil der bereits **vergangenen** tage des zeitraums mit einem erledigten `HabitLog`-eintrag — bewusst nicht gegen die volle zeitraum-länge gemessen, sonst stünde ein habit am 1. tag eines monats automatisch bei 0%). hat ein ziel sowohl tasks als auch habits verlinkt, ergibt sich der fortschritt aus einem gewichteten mittel (default 1:1, `TASK_HABIT_WEIGHT`). hat ein ziel unterziele, fließen dessen eigene direkt verlinkten tasks/habits zusätzlich zum unterziel-durchschnitt ein (nicht anstelle davon, ebenfalls 1:1 gewichtet, `SUBGOALS_OWN_WEIGHT`). ohne unterziele und ohne verlinkte tasks/habits bleibt `manualProgress` wie bisher die grundlage.
- `isDerived()`, `deleteGoalCascade()` (hängt jetzt auch verlinkte habits sauber aus, nicht nur tasks) und `createGoal()` (setzt `origin: "user_defined"`) entsprechend nachgezogen.

### getestet
- temporäres node-script (scratchpad, nicht committet) mit einer in-memory-`localStorage`-simulation: bestätigt task+habit-gewichtung, habit-konsistenz-berechnung über woche/monat/quartal, unterziel+eigene-verknüpfung-kombination, rückwärtskompatible defaults für alt-daten (fehlende `goalId`/`origin`) und dass `deleteGoalCascade` habit-verknüpfungen sauber löst.
- regressionscheck: bestehende, rein unterziel-basierte ketten (jahr→quartal→monat→woche im bereich "tecis") liefern unverändert dieselben werte wie vor der änderung.
- browser-test (playwright, `python3 -m http.server`): ziele- und habits-ansicht rendern weiterhin fehlerfrei (keine konsolenfehler), fortschrittsbalken der tecis-kette zeigen unverändert 60/60/60/100/20%.

### nächste iteration
- UI für die habit-ziel-verknüpfung (auswahlfeld analog zum bestehenden wochenziel-dropdown bei tasks), sichtbarkeit von `Goal.origin`/ki-vorschlags-badges — beides bewusst noch nicht teil dieses schritts.

## [unveröffentlicht] — 2026-09-13 — login-pflicht + onboarding-wizard (`app/`)

nutzer-auftrag: teil 2 der klärungsrunde (siehe eintrag unten) — login wird in `app/` jetzt pflicht (aber intelligent gestuft, kein sackgassen-zustand), gefolgt von einem kurzen, überspringbaren onboarding-wizard (`architecture.md` §2.2/§4.8/§4.12, `context.md` §3.10).

### hinzugefügt — `app/js/auth-gate.js`, `app/js/onboarding.js`, `app/js/avatars.js`, `app/js/colors.js`, `app/js/areas-ui.js`
- **login-gate** (`auth-gate.js`, neu): läuft in `main.js` vor dem eigentlichen app-start, unterscheidet vier zustände — (a) **kein supabase konfiguriert**: freundlicher setup-bildschirm mit kurzanleitung + den url/anon-key-feldern (kein unendlicher lade-spinner, kein sackgassen-zustand für einen ersten test ohne eingerichtetes supabase-projekt); (b) **konfiguriert, nicht angemeldet**: magic-link-login-bildschirm; (c) **angemeldet, onboarding offen**: der neue onboarding-wizard; (d) **angemeldet + onboarding fertig**: normale app, unverändert. `cloud.js` bekam dafür `getSession()` (liest nur die lokal gespeicherte session, kein netzwerk-roundtrip bei jedem start — damit das gate den alltäglichen, längst eingeloggten gebrauch nicht blockiert, siehe architecture.md §1 "ausnahme, neu entschieden") und `onAuthChange()` (springt automatisch weiter, sobald der magic-link im selben tab geöffnet wird, ohne manuellen reload).
- **onboarding-wizard** (`onboarding.js`, neu): zwei kurze, jederzeit überspringbare schritte nach dem ersten login — (1) bereiche bestätigen/umbenennen/hinzufügen/entfernen, (2) einen von 8 abstrakten, geometrischen avataren wählen (`avatars.js`, neu — reine inline-svg-formen in den bestehenden bereichsfarben, ausdrücklich keine fotos/gesichter). jeder schritt hat einen "später"-link; abschluss **oder** überspringen setzt `settings.onboardingCompletedAt`, danach erscheint der wizard nicht mehr automatisch. über eine neue "profil"-karte in den einstellungen jederzeit erneut aufrufbar.
- `storage.js`: `settings` bekommt zwei neue felder, `avatarId` und `onboardingCompletedAt` — es gibt (noch) kein echtes `User`-objekt im lokalen datenmodell, das war die naheliegendste stelle dafür (rückwärtskompatibel für bestehende lokale datenbestände ergänzt, wie schon bei `habit.goalId`/`goal.origin`).
- `colors.js`/`areas-ui.js` (neu, ausgelagert aus `settings.js`): bereichsfarben-palette und "bereich hinzufügen/löschen/umbenennen"-logik sind jetzt geteilte module, damit `onboarding.js` sie mitnutzen kann, statt alles doppelt zu bauen — vermeidet zugleich einen zirkulären import zwischen `settings.js` und `onboarding.js` (beide importieren nur noch von den neuen, blattförmigen modulen).

### geändert — `app/index.html`, `app/styles.css`, `app/js/main.js`, `app/js/settings.js`
- neues `#gate-root`-element, `#app` startet mit `class="hidden"` (verhindert ein kurzes aufblitzen der leeren app-hülle, bevor das gate entschieden hat).
- neue css-klassen fürs gate/onboarding (`.gate-wrap`, `.gate-header`, `.gate-steps`, `.avatar-grid`, `.avatar-pick`, …) — bestehende liquid-glass-bausteine (`.card`, `.btn-primary`, `.field`) wiederverwendet, keine neue design-sprache.
- `main.js`: `init()` läuft jetzt hinter `authGate.start(init)` statt direkt bei `DOMContentLoaded`.
- `settings.js`: neue "profil"-karte (avatar-vorschau + "erneut durchlaufen"), bereiche-verwaltung nutzt jetzt `areas-ui.js` statt einer eigenen kopie der gleichen logik.

### getestet
- lokal per `python3 -m http.server` + playwright/chromium, alle vier gate-zustände: (a) `localStorage` komplett leer, kein supabase konfiguriert → setup-bildschirm, null konsolenfehler; (b) `cloud.setConfig(...)` über die echte "speichern & weiter"-aktion mit einem fiktiven (aber syntaktisch gültigen) supabase-projekt → login-bildschirm erscheint korrekt (bleibt auch nach reload bestehen); (c) ein bewusst als test-hook dokumentierter `window.__mpDebugSession`-schalter in `auth-gate.js` simuliert den eingeloggt-zustand (kein echtes postfach in dieser umgebung verfügbar) → onboarding erscheint, bereich umbenennen + avatar wählen funktioniert, "fertig" führt in die app; "später" auf jedem der beiden schritte führt ebenfalls direkt in die app und setzt `onboardingCompletedAt`; (d) normale app dahinter unverändert nutzbar (heute-ansicht, einstellungen inkl. neuer profil-karte mit gewähltem avatar + umbenanntem bereich), "erneut durchlaufen" aus den einstellungen öffnet den wizard erneut und funktioniert.
- einzige beobachtete konsolenfehler: ein blockierter netzwerkzugriff auf `esm.sh` (cdn-quelle von `@supabase/supabase-js`) — eine reine einschränkung der sandbox-testumgebung (egress-policy), nicht des codes; `cloud.js` fängt das bereits ab und fällt sauber auf den login-bildschirm zurück.

### noch offen
- kein echter end-to-end-test mit einer echten e-mail-adresse war in dieser umgebung möglich (kein postfach erreichbar) — fall (c) bleibt bis dahin über den dokumentierten test-hook simuliert, nicht über einen echten magic-link verifiziert.
- weiterhin kein Auth0-ersatz (siehe `architecture.md` §4.8) — der supabase-magic-link-login bleibt der web-prototyp-zwischenstand.
- `native/` unverändert.

## [unveröffentlicht] — 2026-09-13 — klärungsrunde: app-flow grundlegend neu gedacht

nutzer-auftrag: "mir gefällt die architektur/grundstruktur und der workflow noch nicht — denk das nochmal mutig neu", gefolgt von einer visualisierung (mockup) und zwei brainstorming-runden zur konkretisierung. reine planungs-iteration, kein neuer code — `architecture.md`/`context.md` sind aktualisiert, umsetzung folgt als nächster schritt.

### geändert — `architecture.md`, `context.md`
- **app-flow neu gedacht**: statt sieben gleichrangiger module (heute/ziele/notizen/tagebuch/habits/übersicht/einstellungen) jetzt **drei bereiche**: "strom" (ein erfassungsfeld statt vorab-kategorisierung — die ki sortiert todo/gedanke/gefühl im hintergrund), "kompass" (ziel-hierarchie, ki entwirft monats-/wochen-hauptziele als vorschlag statt manuellem anlegen jeder ebene), "verlauf" (eine gemeinsame zeitachse für ziele, habits und stimmung statt getrennter dashboards). siehe `architecture.md` §2.2.
- **goal-modell präzisiert**: todos und habits bleiben zwei eigene entitäten (kein umbau zu "praktiken"-knoten im ziel-baum), bekommen aber beide eine optionale ziel-verknüpfung und zählen gemeinsam in dessen fortschritt ein — habits über konsistenz, todos über erledigt-quote (`architecture.md` §4.1/§4.6).
- **login wird pflicht**, einmalig pro gerät, **ausdrücklich passwortlos** (magic-link) — nutzer hatte zunächst klassisches mail+passwort vorgeschlagen, sich nach rückfrage bewusst dagegen entschieden (`architecture.md` §4.8).
- **onboarding neu**: bereiche/projekte + avatar-auswahl beim ersten login (`architecture.md` §4.12).
- **gamification bewusst leicht** (nur streaks, kein xp/level) **+ 1:1-challenges** zwischen zwei per einladungslink verbundenen personen, kein soziales netzwerk/freundesystem (`architecture.md` §4.13) — inspiriert von einem kurzen vergleich mit Coach.me, Goalify und Gola (übertragbarste erkenntnis: nicht jedes ziel passt in dieselbe form/fortschrittsanzeige).
- datenmodell (`architecture.md` §5) um `User.avatar_id`/`onboarding_completed_at`, `Goal.origin`, `Habit.goal_id` und eine neue `Challenge`-entität ergänzt.

### visualisierung
- drei mockup-screens (strom/kompass/verlauf) als klickbares konzept-mockup erstellt, um die neue struktur greifbar zu machen, bevor sie in den code geht.

### nächste iteration
- `v0.4.0` (vorschlag): das neu gedachte konzept tatsächlich in `app/` (und/oder `native/`) umsetzen.

## [unveröffentlicht] — 2026-09-10 — heute-ansicht: weniger reibung bei erfassen & löschen

nutzer-auftrag (über einen feedbackgeber-agenten geprüft und priorisiert): drei kleine reibungspunkte in der heute-ansicht (`app/js/today.js`) beheben.

### hinzugefügt — `app/`
- **rückgängig-toast beim löschen einer aufgabe**: der löschen-button entfernt eine aufgabe nicht mehr sofort endgültig, sondern blendet sie aus und zeigt einen toast mit "rückgängig"-button. erst wenn die 5-sekunden-frist abläuft oder der toast über das neue schließen-x geschlossen wird, verschwindet die aufgabe wirklich (`today.js#removeTaskWithUndo`). dafür kann `toast()` (`js/ui.js`) jetzt optional einen aktions-button und eine `onDismiss`-callback für die "jetzt endgültig"-aktion annehmen, bleibt aber für einfache text-toasts (weiterhin an allen anderen stellen im code genutzt) unverändert abwärtskompatibel.
- **mehrzeiliges einfügen im capture-feld**: wird text mit mehreren zeilen ins einzeilige eingabefeld eingefügt (z. b. eine kopierte liste), legt `today.js` für jede nicht-leere zeile ein eigenes todo an, statt den gesamten text als einen einzigen titel zu übernehmen.
- **"heute alles erledigt"-bestätigung**: sind aufgaben erfasst und alle als erledigt markiert (aber die liste nicht leer), erscheint eine kurze, warme bestätigung ("heute erledigt — gut gemacht") statt nur des leeren-zustand-hinweises — neuer `.done-banner`-stil in `styles.css`, passend zur bestehenden ki-banner-optik.

### getestet
- lokal per `python3 -m http.server` + playwright/chromium: aufgabe löschen → rückgängig-klick stellt sie wieder her; aufgabe löschen → frist ablaufen lassen entfernt sie endgültig (bleibt nach reload weg); schließen-x committet sofort; mehrzeiliger paste legt mehrere todos an; alle todos abhaken zeigt die bestätigung. keine konsolenfehler.

## [0.3.0] — 2026-09-09 — installierbare web-app mit optionalem cloud-sync

nutzer-auftrag: "wie komme ich jetzt zu einer funktionierenden app, die ich auf meinem handy testen kann, die daten... gespeichert werden und ich sowohl auf meinem handy als auch auf meinem mac oder als webversion darauf zugreifen kann?"

### hinzugefügt — `app/`
- **PWA**: `manifest.json`, `sw.js` (network-first mit offline-cache-fallback), eigene app-icons (`icons/`), meta-tags in `index.html` — auf dem iphone über "zum home-bildschirm hinzufügen" installierbar, danach auch offline nutzbar.
- **GitHub-Pages-deployment** (`.github/workflows/pages.yml`): `app/` wird bei jedem push automatisch als statische seite veröffentlicht, damit eine echte, vom handy erreichbare url existiert (einmalig **Settings → Pages → Source: GitHub Actions** aktivieren).
- **optionaler, echter cloud-sync** (`js/cloud.js`, neu): anbindung an ein kostenloses Supabase-projekt (magic-link-login, ein json-dokument pro person in `app_state`, last-write-wins über `updated_at`). ohne einrichtung läuft die app unverändert lokal-only weiter (`storage.js` bekam dafür `onSave()`/`onExternalChange()`-hooks, kennt supabase selbst aber nicht — offline-first bleibt der default). einrichtung + SQL-schema in neuem `app/CLOUD_SETUP.md`.
- neue "cloud-sync"-karte in den einstellungen (projekt-url/anon-key eintragen, login-link anfordern, sync-status, "jetzt synchronisieren", abmelden).

### geändert
- `README.md` (repo + `app/`) und `claude.md` §4 auf den neuen stand gebracht.

### bewusst nicht enthalten
- kein feld-genaues merge bei gleichzeitigen offline-änderungen auf zwei geräten (ganzer datensatz, last-write-wins) — dokumentiertes, akzeptiertes verhalten für einen einzelnen nutzer, der jeweils an einem gerät arbeitet.
- der magic-link-login ist ein zwischenstand für den sync, kein Auth0-ersatz (siehe `architecture.md` §4.8).
- `native/` unverändert (weiterhin nicht kompiliert/getestet).

## [0.2.1] — 2026-09-09 — klärungsrunde: alle offenen fragen beantwortet

nutzer-auftrag: alle offenen fragen aus `context.md` §7 beantwortet, plus eine neue frage ("kannst du eine kostenlose opensource ki einbauen?"). reine planungs-/dokumentations-iteration, kein neuer code.

### geändert — `context.md`, `architecture.md`, `claude.md`
- **speicherung**: "in der claude gespeichert" war "cloud" gemeint — bestätigt, keine änderung an der lokal-first-strategie nötig.
- **plattform**: nativ (swift/SwiftUI) ist der **bestätigte hauptweg** (kein cross-platform-ansatz) — `native/` ist damit nicht mehr nur ein paralleler versuch, sondern das ziel; `app/` bleibt als sofort nutzbarer web-prototyp bestehen, ist aber kein weiterer investitionsschwerpunkt.
- **ki-schicht neu geplant, hybrid & kostenlos** (`architecture.md` §2.1, neu): standardmäßig apple's on-device-ki (Foundation Models, mac + iphone, kostenlos & offline), optional ein stärkeres open-source-modell via Ollama (nur mac). claude-api ist **kein v1-bestandteil mehr**, sondern als späteres, bezahltes "pro"-upgrade vorgesehen — passt zur ohnehin geplanten Stripe-anbindung. neue abstraktion `AIProvider` mit austauschbaren backends (`OnDeviceAIClient`, `OllamaClient`, `ClaudeClient`).
- **mehrnutzer**: v1 bleibt strikt single-user (markus) — mehrnutzer erst nach geplanter app-store-/online-veröffentlichung relevant, architektur bleibt vorbereitet.
- **wochenstart**: montag als default, in den einstellungen änderbar.
- **beta-feedback**: soll an ein eigenes backend angebunden werden (nicht nur `mailto:`) — technologie noch offen.
- **"etwas smarter"**: bestätigt inkl. ausdrücklichem wunsch nach **proaktiven vorschlägen** (nicht nur reaktive ki-hinweise).
- Auth0/Stripe: noch keine bestehenden accounts, werden bei bedarf neu angelegt.

### noch offen (neu)
- konkrete Ollama-modellwahl (Llama 3.1 vs. Mistral vs. Qwen2.5 o. ä.)
- technologie für das feedback-backend

### nächste iteration
- `0.3.0` (vorschlag): ki-schicht (`AIProvider`, on-device zuerst) implementieren, feedback-backend anbinden.

## [0.2.0] — 2026-09-08 — erster lauffähiger stand (web-prototyp + native startpunkt)

nutzer-auftrag: "kannst du mir das jetzt einmal umsetzen" + explizit nachgefragt: die ableitung von kurzfristigen zielen aus langfristigen zielen fehlte noch. beides ist jetzt umgesetzt, parallel auf zwei wegen (nutzer-entscheidung: "beides parallel anlegen"), da diese cloud-umgebung kein Xcode/macOS hat und die geplante native app hier nicht gebaut/getestet werden kann.

### hinzugefügt — `app/` (web-prototyp, echt lauffähig, im browser getestet)
- **ziel-hierarchie mit echter ableitung**: jahr → quartal → monat → woche, fortschritt eines ziels läuft automatisch aus seinen unterzielen zusammen (bzw. bei wochenzielen aus dem anteil erledigter, verlinkter todos) — `app/js/goals.js#effectiveProgress()`, per browser-test verifiziert (live-neuberechnung beim anlegen eines unterziels)
- zweistufiger todo-flow: einfache erfassung (nur titel) → separate, einfache lokale planung (deterministisch, klar als "keine echte ki" beschriftet) → echter `.ics`-kalender-export
- tagebuch mit automatisch übernommenen erledigten todos des tages und einem regelbasierten "rückblick" (kein ki-coach vorgetäuscht)
- habits mit echter streak-berechnung, notizen, übersicht-dashboard (alle zahlen echt berechnet), einstellungen (bereiche, ziel-anzahl, planungs-defaults, daten-export/-import, beta-feedback via `mailto:`)
- responsives liquid-glass-css (`app/styles.css`), läuft auf PC- und handy-breite (mobile-first, sidebar-nav ab 900px)
- daten liegen lokal in `localStorage` (single-user, wie für v1 vorgesehen)

### hinzugefügt — `native/` (Swift/SwiftUI-startpunkt, **nicht kompiliert/getestet**)
- Swift-package mit SwiftData-datenmodell (`Models.swift`) und derselben ziel-ableitungs-logik wie im web-prototyp (`GoalDerivation.swift`)
- `GoalsView` + `CreateGoalSheet`: dieselbe ziel-hierarchie-funktion nativ, `TodayView` als einfache erfassung
- **wichtiger hinweis**: diese umgebung kann keinen Swift-code kompilieren (kein Xcode/macOS) — der code wurde sorgfältig von hand geprüft (u. a. ein echter fehler dabei gefunden und behoben: `GoalLevel` brauchte `Hashable` für die Picker-bindung), ist aber vor jeder weiteren nutzung in Xcode gegenzuprüfen

### gefundene und behobene fehler (aus dem browser-test)
- "+ neues ziel"-button lief auf ~250×250px auf (svg-icon ohne explizite größe in einem flexiblen button) — icons in `ui.js` bekommen jetzt feste width/height-attribute

### geändert
- mvp-scope aus `claude.md` §6 (v0.1.0-vorschlag) umgesetzt, dabei die "ziel-ableitung" bewusst vorgezogen (war ursprünglich erst für eine spätere iteration vorgesehen)

### vereinfachung ggü. architecture.md
- `architecture.md` §5 listet `day` als eigene goal-`level`. in beiden umsetzungen (web + native) übernehmen stattdessen die tasks/todos die tagesebene direkt (ein wochenziel verlinkt tasks) — spart ein zusätzliches, praktisch leeres modell, deckt aber inhaltlich dasselbe ab. siehe `app/README.md` bzw. `native/README.md`.

### noch nicht enthalten
- keine echte ki (Claude-API), kein ki-assistent "frage überall", keine Wispr-Flow-, Auth0-, Stripe- oder cloud-anbindung — alle stellen sind im code klar markiert
- `native/` wurde nicht in Xcode geöffnet/gebaut

## [0.1.1] — 2026-09-08 — erster visualisierungs-entwurf + nutzer-feedback eingearbeitet

### hinzugefügt
- erster klickbarer/visueller mockup-entwurf ("liquid glass") mit 8 bildschirmen, gleichrangig für **iPhone** und **macOS**: schnell-erfassen (todo-eingabe), heute (ki-geplante tages-timeline mit automatischem kalender-export), ziele (überarbeitete, einfachere ebenen-navigation statt dichter spalten-grafik), übersicht/fortschritts-dashboard (neu), abend-check-in (jetzt mit ganztägiger diktierfunktion + automatisch übernommenen erledigten todos), einstellungen (neu, inkl. beta-feedback-hinweis)
- neue funktionsanforderungen aus nutzer-feedback in `context.md` §3.7–§3.9 ergänzt: übersicht/fortschritts-dashboard, einstellungen, beta-feedback-button
- `architecture.md` um module 4.9–4.11 (übersicht, einstellungen, beta-feedback) sowie den entkoppelten "erfassen → ki plant → kalender-export"-flow für todos (§4.1) erweitert
- `ui_guidelines.md` um neue komponenten (ki-planungs-leiste, capture-eingabe, diktier-karte, ebenen-navigator, dashboard-kachel, toggle/stepper, beta-feedback-hinweis) ergänzt

### geändert
- todo-erfassung ist jetzt explizit **zweistufig**: einfache eingabe zuerst, ki-einordnung (bereich/dauer/reihenfolge/kalender-export) erst danach — statt beidem in einem schritt
- ziele-übersicht am desktop **neu gestaltet**: einfache ebenen-liste mit breadcrumb statt der ursprünglichen, zu dichten 5-spalten-"spine"-visualisierung aus v0.1.0 (nutzer-feedback: "übersicht bei den zielen find ich noch nicht optimal")
- primärakzent-farbe von `#5B6CFF` auf `#5260F2` angepasst (kontrast-fix, siehe unten)

### fehlerbehebt (aus automatisiertem review-durchlauf des mockups)
- kontrast tecis-filter-pill (weiß auf hellviolett) und gefühle-pills im tagebuch (weiß auf warmem orange) auf WCAG-AA gebracht
- farbton-abweichungen zwischen den einzelnen bildschirmen vereinheitlicht (glas-transparenz, akzentfarbe)

### noch nicht enthalten
- keine implementierung (weiterhin nur planung + visueller entwurf)
- technische umsetzung des beta-feedback-buttons (mail vs. formular/backend) noch offen — siehe `context.md` §7

## [0.1.0] — 2026-09-08 — planung & brainstorming

### hinzugefügt
- `claude.md` — projektleitfaden, dokumentenset-übersicht, versionierungs-strategie, mvp-vorschlag
- `context.md` — nutzerkontext, strukturierte funktionsanforderungen, annahmen, offene fragen an den nutzer
- `architecture.md` — technische architektur: plattformwahl (Swift/SwiftUI, macOS+iOS), schichtenmodell, kernmodule, datenmodell-skizze, sync-strategie
- `memory.md` — retrieval-/gedächtnisarchitektur für den ki-assistenten ("frage überall") und den abend-coach
- `ui_guidelines.md` — "liquid glass"-designsystem, adhs-gerechte ui-prinzipien, farbpalette, komponenten

### noch nicht enthalten (bewusst)
- keine implementierung (kein code, kein Xcode-projekt)
- keine finalen antworten auf die offenen fragen in `context.md` §7

### nächste iteration
- `0.2.0` (vorschlag): projektgerüst + lokaler mvp gemäß `claude.md` §6, nach klärung der offenen fragen
