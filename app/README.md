# mein praktikant — web-prototyp (iteration v0.3.0)

erste **echte, klickbare umsetzung** der planung aus `context.md`/`architecture.md` — läuft im browser (desktop und handy), installierbar als PWA auf dem iphone, mit optionalem cloud-sync über mehrere geräte hinweg. läuft, während die native macOS/iOS-app (siehe `../native/`) parallel als startpunkt existiert.

## auf dem handy/mac benutzen (gehostet)

sobald GitHub Pages für dieses repo aktiv ist (**Settings → Pages → Source: GitHub Actions**, einmalig, der workflow `.github/workflows/pages.yml` deployt automatisch bei jedem push), ist die app unter der dort angezeigten url erreichbar — z. b. `https://<dein-github-name>.github.io/Mein-Praktikant/`. auf dem iphone in Safari öffnen → teilen-symbol → **"Zum Home-Bildschirm"** — läuft danach wie eine installierte app (eigenes icon, kein browser-rahmen, auch offline nutzbar).

**geräteübergreifende, gemeinsame daten** (mac + iphone + web zeigen dieselben einträge) brauchen zusätzlich einmalig ein kostenloses cloud-projekt — siehe [`CLOUD_SETUP.md`](./CLOUD_SETUP.md). ohne diesen schritt funktioniert die app normal weiter, nur eben pro gerät für sich (daten in `localStorage`).

## lokal starten (entwicklung)

kein build-schritt nötig (reines HTML/CSS/JS mit ES-modulen). einfach über einen lokalen webserver öffnen (direktes öffnen per `file://` blockiert ES-modul-imports im browser):

```bash
cd app
python3 -m http.server 8000
# dann im browser: http://localhost:8000
```

oder mit node: `npx serve .`

## was schon echt funktioniert

- **todos**: einfache erfassung (nur titel, auch mehrzeilig per paste — jede zeile wird ein eigenes todo) → separate, einfache lokale planung (reihenfolge/dauer/pausen — deterministisch, **keine echte ki**, siehe unten) → export als echte `.ics`-kalenderdatei. löschen zeigt zuerst einen "rückgängig"-toast, bevor die aufgabe wirklich verschwindet; sind alle aufgaben des tages erledigt, erscheint eine kurze bestätigung.
- **ziel-hierarchie mit echter ableitung** (der teil, der im ersten mockup fehlte): jahres-, quartals-, monats- und wochenziele lassen sich anlegen und an ein übergeordnetes ziel hängen. der fortschritt eines ziels berechnet sich automatisch aus seinen unterzielen (bzw. bei wochenzielen aus den verlinkten, erledigten todos) — `app/js/goals.js#effectiveProgress()`
- **tagebuch**: strukturierte felder, automatisch übernommene erledigte todos des tages, ein regelbasierter "rückblick" (keine ki)
- **habits**: tägliches abhaken, echte streak-berechnung
- **übersicht**: alle zahlen sind echte, aus den lokalen daten berechnete werte
- **einstellungen**: bereiche verwalten, ziel-anzahl je woche/monat, planungs-defaults, daten-export/-import als JSON, beta-feedback-button (öffnet ein vorausgefülltes `mailto:`)
- daten liegen standardmäßig in `localStorage` (pro gerät); **optional** synchronisiert ein cloud-projekt (Supabase, siehe `CLOUD_SETUP.md`) denselben stand über mehrere geräte — `js/cloud.js`
- **installierbar als PWA** (`manifest.json`, `sw.js`): "zum home-bildschirm hinzufügen" auf dem iphone, funktioniert danach auch offline

## was bewusst noch nicht echt ist

diese version ersetzt keine ki — alle stellen, an denen später eine ki (siehe `architecture.md` §2.1/§4.3/§4.5, `memory.md`) andocken soll, sind klar beschriftet ("folgt mit ki-anbindung"):

- keine echte diktier-/Wispr-Flow-anbindung (mikrofon-buttons sind hinweise, keine funktion)
- die "einfache lokale planung" ist ein deterministischer algorithmus (reihenfolge = erfassungsreihenfolge, feste dauer, feste pausen), keine ki-schätzung
- kein ki-coach im tagebuch, nur eine regelbasierte zusammenfassung
- kein Auth0-login (der optionale cloud-sync-login über supabase-magic-link ist ein zwischenstand, kein Auth0-ersatz), kein Stripe
- "frage überall" (der globale ki-assistent) ist noch nicht enthalten

## vereinfachung ggü. architecture.md

`architecture.md` §5 listet ziel-`level` inklusive `day`. in dieser umsetzung übernehmen die **tasks** (todos) die tagesebene direkt — ein wochenziel verlinkt tasks, statt zusätzlich eigene "tagesziel"-objekte zu benötigen. das deckt inhaltlich dasselbe ab (tagesebene wirkt aufs wochenziel ein), ist aber einfacher. siehe `CHANGELOG.md`.
