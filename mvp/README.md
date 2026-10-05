# mvp v2 — mein praktikant als tages-assistent

neuer, eigenständiger prototyp, abgeleitet aus den routines "jarvis – morning briefing" und "pepper – abend-check-in" (siehe [`../anforderungen-v2.md`](../anforderungen-v2.md)). läuft parallel zur v0.4-beta in `app/`, mit eigenem speicher — die beiden stören sich nicht.

**online:** `https://bshqg9xmrr-tech.github.io/Mein-Praktikant/mvp/` (nach dem deploy). auf dem mac in safari: teilen → "zum dock hinzufügen", in chrome: adressleiste → "app installieren".

## die fünf bereiche

| bereich | was passiert | vorbild |
|---|---|---|
| **heute** | 🎯 ein hauptfokus mit kleinem ersten schritt, darunter der energie-gerechte zeitplan (max. n slots, pausen, kleinkram gebündelt, sport wetter-abhängig), "falls noch zeit", offene loops. export als `.ics` in den eigenen kalender. | morning briefing |
| **eingang** | diktat (mikrofon), notizen, eingefügte nachrichten (WhatsApp, WhatsApp Business, mail, Teams), datei-importe (WhatsApp-chat-export, `.eml`, `.ics`) → regelbasiert eingeordnet in 🔴 heute / 🟡 woche / ⚪ später / 🟢 info, mit art, kontext, energie, dauer, fälligkeit, jahresziel. antwort-vorlagen mit 2 freien slots, admin-autopilot (betrag/IBAN/frist). | nachrichten-zentrale |
| **abend** | aufgaben ✓/↪/✕, neues erfassen, habits ja/teils/nein, stimmung, "wie hat der plan gepasst?" → zusammenfassung, vormerkung für morgen, einzahlung auf die jahresziele, habit-tracker-zeile. | abend-check-in |
| **ziele** | jahresziele (mit zielwert) und habits (x/woche, einem ziel zugeordnet), fortschritt berechnet. | — |
| **profil** | energie-profil pro stunde, kernzeit, erholung, max. slots, wochentags-themen, wetter-ort, sportziel, check-in-zeit, verbindungen, backup. | — |

## ehrlich: was echt ist und was nicht

- **echt**: planer-regeln, datums-/dringlichkeits-erkennung, WhatsApp-/mail-/ics-parser, wetter (Open-Meteo, kostenlos, ohne konto), diktat (Web Speech API in chrome/safari), `.ics`-export, ziel-berechnung, alles offline-fähig.
- **regelbasiert, keine ki**: die einordnung im eingang und die antwort-vorlagen — überall in der ui so gekennzeichnet.
- **noch nicht**: live-anbindung an WhatsApp/Teams/mail-postfächer (braucht backend bzw. native app), echte ki, geburtstage, wochen-reset. immobilien sind bewusst kein teil der app.

## lokal starten

```bash
cd mvp && python3 -m http.server 8080
# → http://localhost:8080
```

## code-überblick (`js/`)

`main.js` (shell/navigation) · `db.js` (localStorage `mp2-db-v1`) · `extract.js` (regel-einordnung) · `importers.js` (WhatsApp/mail/ics) · `scheduler.js` (tagesplan + terminvorschläge) · `progress.js` (ziel-fortschritt) · `weather.js` · `core.js` (übernahme von gestern, plan, diktat, erinnerung) · `view-*.js` (die fünf bereiche) · `onboarding.js` · `demo.js` (beispieldaten).
