# anforderungen v2 — "mein praktikant" als tages-assistent

> abgeleitet aus den zwei routines, die markus heute schon täglich nutzt ("⚡ jarvis – morning briefing (mo–fr 8:00)" und "pepper – abend-check-in (täglich 19:30)"), plus markus' eigener beschreibung vom 05.10.2026. dieses dokument beschreibt **was die app funktional können soll**. der prototyp dazu liegt in [`mvp/`](./mvp/).

## 0. die idee in einem satz

aufgaben kommen von überall rein (diktat, WhatsApp, WhatsApp Business, mail, Teams), werden nach deinen vorlieben sortiert, landen **passend zu deiner energie** im kalender, und abends fragt die app kurz ab, was geschafft wurde und wie das auf deine jahresziele einzahlt.

## 1. was die zwei routines heute schon machen (quelle)

| routine | kernfunktion | übernommen in die app? |
|---|---|---|
| morning briefing | kalender lesen, tagesplan bauen, **ein hauptfokus**, max. 3–4 slots, "falls noch zeit"-liste | ja, kern |
| morning briefing | unerledigtes von gestern automatisch übernehmen, transparent markieren ("von gestern übernommen"), ohne rüge | ja, kern |
| morning briefing | kernzeiten (plenum 9–16), wochentags-themen, sportziel 4–5x/woche, realistische dauern + puffer | ja, kern (alles persönlich einstellbar) |
| morning briefing | slots wirklich in den kalender eintragen, bestehende termine nicht überschreiben | ja (mvp: .ics-export) |
| morning briefing | nachrichten-zentrale: mail + WhatsApp + Teams zusammen, 🔴 heute / 🟡 woche / 🟢 info | ja, kern ("eingang") |
| morning briefing | antwortvorschläge (nie selbst senden), terminanfragen mit 2 freien slots | ja |
| morning briefing | admin-autopilot: rechnungen/fristen vorbereiten (betrag, fälligkeit, IBAN) — nie selbst zahlen | ja (erkennen + vorbereiten) |
| morning briefing | meeting-vorbereitung (ziel, letzter stand, offene fragen) | später (braucht echte ki + verlauf) |
| morning briefing | brain-dump (Wispr Flow) in projekte einsortieren | ja (diktat + einordnung) |
| morning briefing | offene loops ("wartet seit 3 tagen auf Z") | ja ("wartet auf"-liste) |
| morning briefing | hauptfokus auf jahresziel zurückspiegeln | ja |
| morning briefing | geburtstage nächste 7 tage | später |
| morning briefing | push nur bei echt zeitkritischen punkten | ja (abend-erinnerung; morgen-push später) |
| morning briefing | **immobilien** (besichtigungs-exposés, fix & flip, "mo = immobilien") | **nein — bewusst ausgeschlossen** |
| morning briefing | investment-updates (kurse, earnings) | nein — kein teil des struktur-kerns, höchstens späteres optionales modul |
| abend-check-in | geplante slots konkret durchgehen: geschafft / verschoben / liegen geblieben | ja, kern |
| abend-check-in | "gab's heute was neues?" schnell erfassen | ja |
| abend-check-in | habits per antippen (ja / teilweise / nein), **persönlich festgelegt** | ja, kern |
| abend-check-in | stimmung mit 4 vorauswahl-optionen | ja |
| abend-check-in | nicht erledigtes automatisch für morgen vormerken, zeitüberschreitungen ehrlich benennen, keine vorwürfe | ja, kern |
| abend-check-in | kompakte habit-tracker-zeile pro tag, nur fakten, unbeantwortet = "–" | ja |
| abend-check-in | projekt-fortschritt + content-idee beiläufig | ja (ideen-sammlung im eingang) |

## 2. funktionale anforderungen (app)

### f1 — aufgaben-eingang ("eingang")
- **diktat**: mikrofon-knopf, gesprochener brain-dump wird zu text und in einzelne aufgaben zerlegt.
- **text/einfügen**: notiz tippen oder nachricht/mail einfügen, quelle per antippen wählen (notiz, WhatsApp, WhatsApp Business, mail, Teams).
- **verbindungen**: WhatsApp, WhatsApp Business, mail (mehrere konten), Teams, kalender.
  - mvp: echte datei-importe (WhatsApp-chat-export `.txt`, mail als `.eml`, kalender als `.ics`) + einfügen + teilen-menü (wo das betriebssystem es erlaubt).
  - später: direkte live-anbindung (braucht backend bzw. native app, siehe §4).
- jede erkannte aufgabe bekommt einen vorschlag für: **dringlichkeit** (🔴 heute / 🟡 diese woche / 🟢 info), **art** (todo, terminanfrage, admin, wartet-auf, idee), **kontext** (privat / geschäftlich), **energie-typ** (fokus, kreativ, routine, kommunikation, bewegung), **dauer**, **fälligkeit**, **jahresziel**.
- vorschläge sind mit einem tippen änderbar und müssen bestätigt werden ("übernehmen") — nichts landet ungefragt im plan.
- terminanfragen → antwort-vorlage mit 2 freien slots (privat nach feierabend/wochenende, geschäftlich in der kernzeit). **die app sendet nie selbst.**
- admin (rechnung, frist, formular) → betrag, fälligkeit, IBAN herausziehen. **die app zahlt nie selbst.**
- "wartet auf" → eigene liste mit "seit x tagen".

### f2 — persönliche vorlieben ("profil")
- arbeitstage, kernarbeitszeit, planungsfenster (tagesbeginn/-ende).
- **energie-profil pro stunde**: wann bin ich kreativ, wann kann ich fokussiert arbeiten, wann eher routine abarbeiten, wann brauche ich erholung.
- erholung: feste pause (mittag), pause nach jedem fokus-block, puffer zwischen terminen, maximale fokus-blocklänge.
- maximale anzahl haupt-slots pro tag (gegen überladung).
- wochentags-themen (frei definierbar).
- wetter: ort, "bei gutem wetter draußen-bewegung einplanen".
- sportziel pro woche.
- uhrzeit abend-check-in.

### f3 — adhs-gerechte kalender-einplanung ("heute")
- **ein hauptfokus** pro tag (dringendstes bzw. am längsten aufgeschobenes, mit kleinem ersten schritt).
- max. n haupt-slots im kalender, der rest als "falls noch zeit/energie" ohne slot.
- regeln: bestehende termine (privat + geschäftlich) werden nie überschrieben; geschäftliches in die kernzeit, privates danach; aufgabe passt zum energie-fenster (kreativ in kreativ-zeiten usw.); pause nach fokus-blöcken; puffer um termine; lange aufgaben werden in teil-blöcke zerlegt.
- wetter: bei trockenem wetter wird bewegung draußen eingeplant, bei regen drinnen.
- sportziel: fehlen diese woche noch einheiten, wird ein bewegungs-slot vorgeschlagen (nicht erzwungen).
- jeder slot zeigt **warum** er dort liegt (transparenz statt black box).
- plan per tippen übernehmen und in den eigenen kalender exportieren.
- unerledigtes von gestern wird automatisch übernommen und markiert.

### f4 — abend-check-in ("abend")
- erinnerung zur eingestellten uhrzeit.
- geplante aufgaben des tages durchgehen: ✓ geschafft / ↪ morgen / ✕ streichen.
- neues vom tag schnell erfassen (inkl. diktat).
- habits (persönlich festgelegt): ja / teilweise / nein.
- stimmung (4 optionen) + "wie hat der plan gepasst?" (zu voll → morgen ein slot weniger).
- ergebnis: kurze tageszusammenfassung, liegengebliebenes ehrlich und ohne vorwurf, alles offene ist für morgen vorgemerkt, und **wie die heutigen aufgaben & habits auf die jahresziele einzahlen** (fortschritt vorher → nachher).

### f5 — jahresziele & habits ("ziele")
- jahresziele persönlich festlegen (titel, kontext, warum).
- habits persönlich festlegen (täglich oder x-mal pro woche), jeweils einem jahresziel zugeordnet.
- aufgaben können einem jahresziel zugeordnet werden.
- fortschritt pro ziel wird **berechnet** aus erledigten zugeordneten aufgaben + habit-konstanz, nicht von hand geschätzt.

## 3. nicht-funktionale anforderungen
- adhs: wenig text, antippen statt tippen, keine vorwürfe, nie überladen, jede automatik erklärt sich.
- ehrlichkeit: regelbasierte einordnung ist als "regelbasiert — keine echte ki" gekennzeichnet; keine erfundenen daten.
- lokal-first: alles läuft ohne konto und offline (außer wetter).
- nichts wird ohne bestätigung gesendet, bezahlt oder in fremde systeme geschrieben.

## 4. was der mvp bewusst (noch) nicht kann
- **live**-anbindung an WhatsApp/WhatsApp Business/mail/Teams/Apple-kalender: geht technisch nur mit backend (WhatsApp Business API, Microsoft Graph, IMAP/Gmail-API) bzw. in der nativen mac-app (EventKit, Mail). der mvp nutzt stattdessen echte datei-importe und einfügen.
- echte ki (zusammenfassen, meeting-vorbereitung, freie sprache verstehen): geplant über die hybride ki-schicht (`architecture.md` §2.1).
- geburtstage, wochen-reset (sonntag), freundes-radar: eigene, spätere module.
- immobilien: kein bestandteil der app. investment-updates: nicht im kern.
