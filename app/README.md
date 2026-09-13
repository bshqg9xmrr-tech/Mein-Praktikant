# mein praktikant — web-prototyp (iteration v0.3.0)

erste **echte, klickbare umsetzung** der planung aus `context.md`/`architecture.md` — läuft im browser (desktop und handy), installierbar als PWA auf dem iphone, mit login-pflicht + cloud-sync über mehrere geräte hinweg (siehe unten). läuft, während die native macOS/iOS-app (siehe `../native/`) parallel als startpunkt existiert.

## auf dem handy/mac benutzen (gehostet)

sobald GitHub Pages für dieses repo aktiv ist (**Settings → Pages → Source: GitHub Actions**, einmalig, der workflow `.github/workflows/pages.yml` deployt automatisch bei jedem push), ist die app unter der dort angezeigten url erreichbar — z. b. `https://<dein-github-name>.github.io/Mein-Praktikant/`. auf dem iphone in Safari öffnen → teilen-symbol → **"Zum Home-Bildschirm"** — läuft danach wie eine installierte app (eigenes icon, kein browser-rahmen, auch offline nutzbar).

**login ist jetzt pflicht, einmalig pro gerät** (`architecture.md` §2.2/§4.8, neu — anders als in v0.3.0): die app öffnet sich beim allerersten start mit einem geführten, gestuften einstieg statt direkt der normalen ansicht — siehe [unten](#login--onboarding-neu). ist man einmal eingeloggt, läuft alles danach wieder ganz normal offline-first weiter (kein wiederkehrender netzwerk-zwang im alltag).

## lokal starten (entwicklung)

kein build-schritt nötig (reines HTML/CSS/JS mit ES-modulen). einfach über einen lokalen webserver öffnen (direktes öffnen per `file://` blockiert ES-modul-imports im browser):

```bash
cd app
python3 -m http.server 8000
# dann im browser: http://localhost:8000
```

oder mit node: `npx serve .`

## login & onboarding (neu)

seit dieser iteration verlangt die app **einmalig pro gerät** einen login, bevor sie sich normal nutzen lässt (`architecture.md` §2.2/§4.8/§4.12, `context.md` §3.10) — umgesetzt in `js/auth-gate.js`. bewusst **gestuft**, damit ein erster test ohne eingerichtetes supabase-projekt keine sackgasse ist:

1. **kein cloud-projekt eingetragen** → ein setup-bildschirm mit kurzanleitung + den url/anon-key-feldern (dieselben wie bisher in den einstellungen) — kein unendlicher lade-zustand, direkt lösbar.
2. **cloud-projekt eingetragen, aber nicht angemeldet** → magic-link-login (e-mail eintragen, link aus der mail auf demselben gerät öffnen).
3. **angemeldet, aber noch kein onboarding** → ein kurzer, **zwei schritte** umfassender, jederzeit überspringbarer wizard (`js/onboarding.js`): bereiche bestätigen/umbenennen, dann einen von 8 abstrakten avataren wählen (reine geometrische formen, `js/avatars.js` — kein foto-upload). "später" auf jedem schritt führt direkt in die app.
4. **angemeldet + onboarding erledigt** → die normale app, wie gehabt.

einmal durchlaufen, bleibt die app **offline-first** wie zuvor — es gibt keinen wiederkehrenden netzwerk-zwang im alltäglichen gebrauch, nur dieser einmalige einstieg ist gated. das onboarding lässt sich jederzeit über **einstellungen → profil → "erneut durchlaufen"** erneut öffnen.

## navigation (neu, `architecture.md` §2.2)

die app hat seit dieser iteration nur noch **drei bereiche** statt der ursprünglichen sieben gleichrangigen tabs:

1. **strom** (`js/strom.js`) — ersetzt inhaltlich `today.js` + `notes.js`: ein einziges erfassungsfeld, eine lokale heuristik sortiert todo/gedanke/gefühl ein (siehe unten), darunter eine auf 2–3 einträge reduzierte "jetzt wichtig"-liste.
2. **kompass** (`js/kompass.js`) — ersetzt die bisherige "ziele"-ansicht: ein sich verjüngender pfad jahresziel → (quartal) → monat → woche pro bereich, mit bereichsfarbigem verbindungs-strich, fortschrittsbalken (`effectiveProgress()`) und ki-entwurfs-badges (siehe unten).
3. **verlauf** (`js/verlauf.js`) — ersetzt übersicht + tagebuch-liste + habit-historie. **aktuell nur ein minimaler platzhalter** (siehe "was bewusst noch nicht echt ist").

**einstellungen** ist kein eigener tab mehr, sondern über das zahnrad-icon oben rechts in der topbar erreichbar (neben dem beta-pill).

## was schon echt funktioniert

- **strom**: ein einziges erfassungsfeld (auch mehrzeilig per paste — jede zeile wird einzeln erfasst) → eine **lokale, deterministische einordnungs-heuristik** (keine echte ki, siehe unten) schlägt "todo"/"gedanke"/"gefühl" vor → landet je nach kategorie als `Task` (heute) oder `Note` (gedanke bzw. gefühl, mit tag `"gefühl"`). eine "gerade einsortiert"-liste zeigt die letzten einträge mit einem klickbaren badge, über das sich die kategorie jederzeit korrigieren lässt (inkl. echter migration zwischen den collections).
- **todos**: separate, einfache lokale planung (reihenfolge/dauer/pausen — deterministisch, **keine echte ki**, siehe unten) → export als echte `.ics`-kalenderdatei. löschen zeigt zuerst einen "rückgängig"-toast, bevor die aufgabe wirklich verschwindet; sind alle aufgaben des tages erledigt, erscheint eine kurze bestätigung. standardmäßig zeigt "jetzt wichtig" nur 2–3 offene todos, ein "N weitere anzeigen"-link blendet den rest ein.
- **ziel-hierarchie mit echter ableitung** (der teil, der im ersten mockup fehlte): jahres-, quartals-, monats- und wochenziele lassen sich anlegen und an ein übergeordnetes ziel hängen. der fortschritt eines ziels berechnet sich automatisch aus seinen unterzielen, plus aus eigenen direkt verlinkten todos (erledigt-quote) und habits (konsistenz im zeitraum des ziels), gewichtet 1:1 — `app/js/goals.js#effectiveProgress()`.
- **kompass** (`js/kompass.js`, neu): pro bereich (pill-auswahl oben, default: der erste bereich mit einem jahresziel) zeigt eine karten-kette jahresziel → seine kinder (je nachdem, was tatsächlich existiert) → wochenziel(e), jede karte kleiner als die darüber ("verjüngender pfad"), mit bereichsfarbigem verbindungs-strich links. jede karte zeigt ihren fortschrittsbalken (`effectiveProgress()`) und ein badge je nach `goal.origin` ("von dir" / "ki-entwurf · bestätigt" / gestrichelt "ki-vorschlag · offen" mit "ändern"/"bestätigen"-buttons). gibt es noch kein jahresziel im gewählten bereich, erscheint ein leerer zustand mit einem "jahresziel festlegen"-formular.
- **einfacher, lokaler "ki-entwurf"-mechanismus** (`kompass.js`, **keine echte ki**, siehe unten): existiert ein jahres- oder monatsziel ohne die nächste ebene darunter, bietet eine karte einen button "monats-/wochenziel vorschlagen lassen" — legt einen deterministischen textbaustein-vorschlag (leicht umformulierter titel des übergeordneten ziels) mit `origin: "ai_proposed"` an. "bestätigen" übernimmt ihn unverändert (`origin` → `user_confirmed`), "ändern" öffnet ein formular zum anpassen des titels (setzt `origin` beim speichern ebenfalls auf `user_confirmed`).
- **habit-verknüpfung über die oberfläche** (neu, war bisher nur direkt in den daten möglich): jede blatt-ziel-karte (meist ein wochenziel) zeigt ihre verlinkten todos und habits ("3 todos · 1 habit verlinkt") sowie einen "+ habit verknüpfen"-button, der ein bestehendes habit auswählen und per `habit.goalId` zuweisen lässt (inkl. auflösen der verknüpfung per klick auf ein verlinktes habit-pill). die konsistenz des habits fließt danach sofort sichtbar in `effectiveProgress()` des ziels ein.
- **tagebuch**: strukturierte felder, automatisch übernommene erledigte todos des tages, ein regelbasierter "rückblick" (keine ki) — vorhanden in `journal.js`, aktuell nicht per tab erreichbar (wird zur grundlage für `verlauf.js`).
- **habits**: tägliches abhaken, echte streak-berechnung — vorhanden in `habits.js`, aktuell nicht per tab erreichbar (wird zur grundlage für `verlauf.js`).
- **übersicht**: alle zahlen sind echte, aus den lokalen daten berechnete werte — vorhanden in `overview.js`, aktuell nicht per tab erreichbar (wird zur grundlage für `verlauf.js`).
- **einstellungen**: bereiche verwalten, ziel-anzahl je woche/monat, planungs-defaults, daten-export/-import als JSON, beta-feedback-button (öffnet ein vorausgefülltes `mailto:`) — erreichbar über das zahnrad-icon oben rechts.
- daten liegen in `localStorage` (pro gerät); ein cloud-projekt (Supabase, siehe `CLOUD_SETUP.md`) ist jetzt für den login **vorausgesetzt** (siehe oben), synchronisiert danach denselben stand über mehrere geräte — `js/cloud.js`
- **installierbar als PWA** (`manifest.json`, `sw.js`): "zum home-bildschirm hinzufügen" auf dem iphone, funktioniert danach auch offline

## was bewusst noch nicht echt ist

diese version ersetzt keine ki — alle stellen, an denen später eine ki (siehe `architecture.md` §2.1/§4.3/§4.5, `memory.md`) andocken soll, sind klar beschriftet ("folgt mit ki-anbindung"):

- **die einordnungs-heuristik in "strom" ist keine ki** — eine ganz simple, für jeden nachvollziehbare wortlisten-heuristik (fragezeichen/"vielleicht"/"idee" → gedanke; gefühlsbezogene wörter → gefühl; sonst todo), kein sprachmodell, kein lernen aus historie. im UI klar als "lokale einordnung · keine echte ki" beschriftet, jederzeit per klick auf das badge korrigierbar.
- **der "ki-entwurf"-mechanismus in "kompass" ist ebenfalls keine ki** — "monats-/wochenziel vorschlagen lassen" übernimmt nur den titel des übergeordneten ziels leicht umformuliert (ein simpler textbaustein), kein sprachmodell, keine planung, kein verständnis des ziel-inhalts. im UI klar als "lokaler entwurf · keine echte ki" beschriftet. echtes "ki entwirft ebenen unter dem jahresziel" (`BreakdownGoalUseCase`, architecture.md §4.1) kommt erst mit der ki-schicht aus §2.1.
- **`kompass.js` bildet bewusst nur "jahr → monat → woche" nach, keine automatische quartals-ebene** — der einfache entwurfs-mechanismus überspringt die quartalsebene (ein jahresziel ohne unterziele bekommt direkt einen monatsziel-vorschlag). wer eine quartalsebene möchte, kann sie weiterhin manuell anlegen (die zugrundeliegende `goals.js`-logik unterstützt sie unverändert und zeigt sie korrekt an, siehe die bestehende tecis-kette in den seed-daten) — dieselbe art von pragmatischer vereinfachung wie das weglassen der `day`-ebene (siehe unten).
- **`verlauf.js` ist aktuell nur ein minimaler platzhalter** (eine kurze "kommt als nächstes"-karte) — die eigentliche inhaltliche umsetzung folgt als eigener, nächster schritt. die dafür nötige logik ist bereits vollständig vorhanden (`overview.js`/`habits.js`/`journal.js`), aktuell aber von keinem tab mehr aus erreichbar.
- keine echte diktier-/Wispr-Flow-anbindung (mikrofon-buttons sind hinweise, keine funktion)
- die "einfache lokale planung" ist ein deterministischer algorithmus (reihenfolge = erfassungsreihenfolge, feste dauer, feste pausen), keine ki-schätzung
- kein ki-coach im tagebuch, nur eine regelbasierte zusammenfassung
- kein Auth0-login (der pflicht-login über supabase-magic-link, siehe oben, ist ein funktionaler zwischenstand, kein Auth0-ersatz), kein Stripe
- "frage überall" (der globale ki-assistent) ist noch nicht enthalten

## vereinfachung ggü. architecture.md

`architecture.md` §5 listet ziel-`level` inklusive `day`. in dieser umsetzung übernehmen die **tasks** (todos) die tagesebene direkt — ein wochenziel verlinkt tasks, statt zusätzlich eigene "tagesziel"-objekte zu benötigen. das deckt inhaltlich dasselbe ab (tagesebene wirkt aufs wochenziel ein), ist aber einfacher. siehe `CHANGELOG.md`.
