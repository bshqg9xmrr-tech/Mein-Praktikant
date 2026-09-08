# mein praktikant — web-prototyp (iteration v0.2.0)

erste **echte, klickbare umsetzung** der planung aus `context.md`/`architecture.md` — läuft im browser (desktop und handy), damit sofort etwas ausprobierbar ist, während die native macOS/iOS-app (siehe `../native/`) parallel als startpunkt existiert.

## starten

kein build-schritt nötig (reines HTML/CSS/JS mit ES-modulen). einfach über einen lokalen webserver öffnen (direktes öffnen per `file://` blockiert ES-modul-imports im browser):

```bash
cd app
python3 -m http.server 8000
# dann im browser: http://localhost:8000
```

oder mit node: `npx serve .`

## was schon echt funktioniert

- **todos**: einfache erfassung (nur titel) → separate, einfache lokale planung (reihenfolge/dauer/pausen — deterministisch, **keine echte ki**, siehe unten) → export als echte `.ics`-kalenderdatei
- **ziel-hierarchie mit echter ableitung** (der teil, der im ersten mockup fehlte): jahres-, quartals-, monats- und wochenziele lassen sich anlegen und an ein übergeordnetes ziel hängen. der fortschritt eines ziels berechnet sich automatisch aus seinen unterzielen (bzw. bei wochenzielen aus den verlinkten, erledigten todos) — `app/js/goals.js#effectiveProgress()`
- **tagebuch**: strukturierte felder, automatisch übernommene erledigte todos des tages, ein regelbasierter "rückblick" (keine ki)
- **habits**: tägliches abhaken, echte streak-berechnung
- **übersicht**: alle zahlen sind echte, aus den lokalen daten berechnete werte
- **einstellungen**: bereiche verwalten, ziel-anzahl je woche/monat, planungs-defaults, daten-export/-import als JSON, beta-feedback-button (öffnet ein vorausgefülltes `mailto:`)
- daten liegen in `localStorage` (single-user, entspricht v1 aus `context.md` §2)

## was bewusst noch nicht echt ist

diese version ersetzt keine ki — alle stellen, an denen später Claude/Anthropic (siehe `architecture.md` §4.3/§4.5, `memory.md`) andocken soll, sind klar beschriftet ("folgt mit ki-anbindung"):

- keine echte diktier-/Wispr-Flow-anbindung (mikrofon-buttons sind hinweise, keine funktion)
- die "einfache lokale planung" ist ein deterministischer algorithmus (reihenfolge = erfassungsreihenfolge, feste dauer, feste pausen), keine ki-schätzung
- kein ki-coach im tagebuch, nur eine regelbasierte zusammenfassung
- kein Auth0-login, kein Stripe, keine cloud-synchronisation (single-user, rein lokal — wie für v1 vorgesehen)
- "frage überall" (der globale ki-assistent) ist noch nicht enthalten

## vereinfachung ggü. architecture.md

`architecture.md` §5 listet ziel-`level` inklusive `day`. in dieser umsetzung übernehmen die **tasks** (todos) die tagesebene direkt — ein wochenziel verlinkt tasks, statt zusätzlich eigene "tagesziel"-objekte zu benötigen. das deckt inhaltlich dasselbe ab (tagesebene wirkt aufs wochenziel ein), ist aber einfacher. siehe `CHANGELOG.md`.
