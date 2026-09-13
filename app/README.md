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

## was schon echt funktioniert

- **todos**: einfache erfassung (nur titel, auch mehrzeilig per paste — jede zeile wird ein eigenes todo) → separate, einfache lokale planung (reihenfolge/dauer/pausen — deterministisch, **keine echte ki**, siehe unten) → export als echte `.ics`-kalenderdatei. löschen zeigt zuerst einen "rückgängig"-toast, bevor die aufgabe wirklich verschwindet; sind alle aufgaben des tages erledigt, erscheint eine kurze bestätigung.
- **ziel-hierarchie mit echter ableitung** (der teil, der im ersten mockup fehlte): jahres-, quartals-, monats- und wochenziele lassen sich anlegen und an ein übergeordnetes ziel hängen. der fortschritt eines ziels berechnet sich automatisch aus seinen unterzielen, plus (neu) aus eigenen direkt verlinkten todos (erledigt-quote) und habits (konsistenz im zeitraum des ziels), gewichtet 1:1 — `app/js/goals.js#effectiveProgress()`. ein habit lässt sich (noch ohne eigene UI dafür, siehe unten) über `habit.goalId` mit einem ziel verknüpfen, analog zu `task.goalId`.
- **tagebuch**: strukturierte felder, automatisch übernommene erledigte todos des tages, ein regelbasierter "rückblick" (keine ki)
- **habits**: tägliches abhaken, echte streak-berechnung
- **übersicht**: alle zahlen sind echte, aus den lokalen daten berechnete werte
- **einstellungen**: bereiche verwalten, ziel-anzahl je woche/monat, planungs-defaults, daten-export/-import als JSON, beta-feedback-button (öffnet ein vorausgefülltes `mailto:`)
- daten liegen in `localStorage` (pro gerät); ein cloud-projekt (Supabase, siehe `CLOUD_SETUP.md`) ist jetzt für den login **vorausgesetzt** (siehe oben), synchronisiert danach denselben stand über mehrere geräte — `js/cloud.js`
- **installierbar als PWA** (`manifest.json`, `sw.js`): "zum home-bildschirm hinzufügen" auf dem iphone, funktioniert danach auch offline

## was bewusst noch nicht echt ist

diese version ersetzt keine ki — alle stellen, an denen später eine ki (siehe `architecture.md` §2.1/§4.3/§4.5, `memory.md`) andocken soll, sind klar beschriftet ("folgt mit ki-anbindung"):

- keine echte diktier-/Wispr-Flow-anbindung (mikrofon-buttons sind hinweise, keine funktion)
- die "einfache lokale planung" ist ein deterministischer algorithmus (reihenfolge = erfassungsreihenfolge, feste dauer, feste pausen), keine ki-schätzung
- kein ki-coach im tagebuch, nur eine regelbasierte zusammenfassung
- kein Auth0-login (der pflicht-login über supabase-magic-link, siehe oben, ist ein funktionaler zwischenstand, kein Auth0-ersatz), kein Stripe
- "frage überall" (der globale ki-assistent) ist noch nicht enthalten
- kein ki-vorschlags-flow für monats-/wochenziele (`architecture.md` §4.1 "ki entwirft ebenen unter dem jahresziel") — `Goal.origin` ist im datenmodell vorbereitet, aber bisher legt markus jedes ziel selbst an (`origin` steht immer auf `"user_defined"`)
- **keine UI, um ein habit mit einem ziel zu verknüpfen** — `habit.goalId` existiert im datenmodell und fließt bereits in `effectiveProgress()` ein, aber die verknüpfung lässt sich aktuell nur direkt in den daten setzen, nicht über die oberfläche (kommt in einer folge-iteration)

## vereinfachung ggü. architecture.md

`architecture.md` §5 listet ziel-`level` inklusive `day`. in dieser umsetzung übernehmen die **tasks** (todos) die tagesebene direkt — ein wochenziel verlinkt tasks, statt zusätzlich eigene "tagesziel"-objekte zu benötigen. das deckt inhaltlich dasselbe ab (tagesebene wirkt aufs wochenziel ein), ist aber einfacher. siehe `CHANGELOG.md`.
