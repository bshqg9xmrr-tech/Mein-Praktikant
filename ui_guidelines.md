# ui_guidelines.md — designsystem "liquid glass"

> designrichtung laut briefing: **liquid glass**, recht hell, transparent, einfache moderne schriftart, **2d**. zusätzliches leitmotiv: **adhs-freundlich** — jede design-entscheidung reduziert kognitive last.

## 1. designprinzipien

1. **ein fokus pro screen** — nicht alles auf einmal zeigen; details liegen eine ebene tiefer (progressive disclosure).
2. **ruhe vor reichhaltigkeit** — viel weißraum/glas-fläche, wenig gleichzeitige reize, keine überflüssigen animationen.
3. **fortschritt sichtbar & belohnend** — abhaken, streaks, fortschrittsbalken geben schnelles, klares feedback (kleine dopamin-anker).
4. **große, eindeutige tap-/klick-ziele** — keine feinmotorik-fallen, klare abstände.
5. **konsistente bereichsfarben** — jeder bereich (privat/plenum/tecis/sonstige) hat eine feste akzentfarbe, die sich durch todo, kalender, ziel-ansicht konsequent zieht — schnelle wiedererkennung ohne lesen.
6. **flach (2d)** — keine tiefen schlagschatten oder skeuomorphe effekte; tiefe entsteht ausschließlich über den glas-/blur-effekt, nicht über schatten-spielerei.

## 2. "liquid glass" — materialdefinition

heller, teiltransparenter glas-effekt als durchgängiges oberflächen-material (angelehnt an moderne glasmorphismus-/"liquid glass"-optik):

| eigenschaft | wert (richtwert) |
|---|---|
| hintergrund-blur | stark (system-blur/material, kein eigener weichzeichner-hack) |
| flächen-opazität | ~65–80 % weiß auf hellem grund |
| rand | 1px, ~15 % weiß/schwarz-transparenz, sehr dezent |
| eckenradius | groß, konsistent (z. b. 20pt karten, 14pt kleinere elemente) |
| schatten | minimal, nur zur ebenen-trennung (nicht zur "3d"-wirkung) |
| bewegung | glas-flächen reagieren dezent auf scroll (parallax-blur-shift), keine bounces/wobble |

grundregel: das glas-material liegt **immer auf einem hellen, ruhigen hintergrund** (kein rauschendes bild/foto dahinter), damit die transparenz nicht zulasten der lesbarkeit geht.

## 3. farbpalette (hell-modus, primär)

- **hintergrund-basis**: sehr helles grau/off-white (z. b. `#F5F6FA`), leichter, sehr sanfter farbverlauf erlaubt (kein knalliges weiß, das ermüdet)
- **glas-oberfläche**: weiß, transparent (siehe material oben)
- **primärakzent (app-marke)**: ein ruhiger blau-/indigo-ton, `#5260F2` — für primäre buttons, aktive states, den ki-assistenten. (im mockup nachträglich von `#5B6CFF` auf diesen etwas dunkleren ton angepasst, damit weißer text auf gefülltem hintergrund zuverlässig WCAG-AA-kontrast [≥4,5:1] erreicht — siehe §7)
- **bereichsfarben** (fest zugeordnet, gut unterscheidbar, nicht grell):
  - privat: warmes koralle/orange
  - plenum: petrol/türkis
  - tecis: violett
  - sonstige: neutrales grau-blau
  - (neue bereiche erhalten automatisch die nächste farbe aus einer definierten, adhs-tauglichen palette — max. kontrast zwischen benachbarten bereichen)
- **statusfarben**: erfolg = weiches grün, warnung = weiches amber, **kein aggressives rot** für "überfällig" (stressreduktion) — stattdessen dezentes amber/orange mit klarem, aber freundlichem hinweistext
- **dark mode**: v1 fokussiert auf hell (laut briefing), dark-variante als spätere iteration vorgesehen, farbrollen sind daher von anfang an als **semantische tokens** (nicht hartkodierte hex-werte) angelegt

## 4. typografie

- **systemschrift** (SF Pro auf Apple-plattformen) — modern, sauber, keine custom-fonts nötig, beste lesbarkeit/dynamic-type-unterstützung
- klare, wenige größenstufen: titel / abschnitt / body / caption — keine feinabstufungen dazwischen
- **fettung statt farbe** zur betonung wichtiger inhalte (aufgabentitel), farbe bleibt für bereiche/status reserviert
- großzügiger zeilenabstand, kurze zeilenlängen in listen — schnelles scannen statt lesen

## 5. kernkomponenten

- **glas-karte**: grundbaustein für todo-item, ziel-karte, notiz, journal-eintrag — einheitlicher rahmen, bereichsfarbe als schmaler akzent-streifen am linken rand
- **fortschritts-ring/-balken**: für ziel-tracker (jahres→tag), habit-streaks — immer mit kurzer text-entsprechung ("60 % · noch 2 von 5"), nicht nur visuell
- **primär-button**: voll gefüllt, primärakzent, groß, ein einziger primär-button pro screen (adhs: eindeutige nächste handlung)
- **sekundär-/glas-button**: transparent mit rand, für nachrangige aktionen
- **tages-timeline**: vertikale kalender-/tagesansicht, todos als blöcke mit geschätzter dauer, pausen als eigene, visuell ruhigere blöcke (gestreiftes/leichteres glas statt vollfläche)
- **bereichs-badge**: kleines, farbiges pill-element (bereichsname + farbe), überall wo ein element einem bereich zugeordnet ist
- **frage-überall-einstieg**: global erreichbarer, schwebender glas-button (immer gleiche position) → öffnet ki-chat als glas-panel über dem aktuellen screen (kein vollständiger screen-wechsel, kontext bleibt sichtbar)
- **abend-check-in-karte**: eigenständig gestaltetes, etwas wärmeres glas-panel (leicht abweichender ton) für tagebuch + coach-feedback, damit dieser moment sich bewusst vom "arbeits-modus" abhebt
- **ki-planungs-leiste** (ergänzt in mockup-iteration 2): schmale, akzent-getönte glas-leiste oben auf der tagesansicht, zeigt kompakt "was die ki schon für dich erledigt hat" (anzahl aufgaben/pausen, kalender-sync-status) + "neu planen"-link — macht ki-arbeit sichtbar statt unsichtbar im hintergrund zu laufen
- **capture-eingabe**: bewusst reduziertes eingabefeld (nur text + mikrofon-icon für diktat), ohne pflicht-dropdowns für bereich/dauer — die einordnung passiert erst im zweiten schritt durch die ki (siehe `architecture.md` §4.1)
- **diktier-karte** (tagebuch): auffällige, große mikrofon-schaltfläche mit warmem farbverlauf für die "ganzen tag diktieren"-funktion — bewusst die visuell dominanteste aktion auf dem abend-screen, da sie den reibungsärmsten weg ins tagebuch darstellt
- **ebenen-navigator** (ziele-screen, überarbeitet in mockup-iteration 2): vertikale liste der fünf ziel-ebenen mit mini-fortschrittsring statt verschachtelter spalten-visualisierung — einfachere, listenartige navigation statt eines dichten "infografik"-layouts, dazu eine breadcrumb-leiste für den aktuellen pfad
- **dashboard-kachel**: kompakte, große kennzahl (zahl zuerst, label klein darunter) für die übersicht-/fortschritts-ansicht — mehrere kacheln im raster, keine überladenen diagramme
- **toggle/stepper** (einstellungen): einfache an/aus-schalter bzw. plus/minus-stepper statt textfelder, wo immer eine begrenzte auswahl möglich ist (adhs: weniger tipp-aufwand, weniger fehlerquellen)
- **beta-feedback-hinweis**: kleine, dezente pille (icon + "beta") auf den kernbildschirmen, führt zu einer prominenten feedback-karte in den einstellungen — nicht aufdringlich, aber jederzeit auffindbar

## 6. bewegung & microinteractions

- abhaken einer aufgabe: kurzer, dezenter erfolgs-effekt (kein overload — kein konfetti-dauerfeuer), gepaart mit fortschritts-update in echtzeit
- screen-übergänge: sanftes fade/blur-crossfade statt harter schnitte oder starker slide-parallax
- benachrichtigungen (morgen-reminder, abend-popup): freundlicher, kurzer ton + text, niemals mehrere gleichzeitig auslösende reize

## 7. barrierefreiheit

- volle unterstützung von **Dynamic Type** (schriftgröße), **VoiceOver**-labels auf allen interaktiven glas-elementen
- kontrast: trotz transparenz muss text auf glas-flächen WCAG-AA-kontrast erreichen (ggf. lokale opazitäts-erhöhung hinter textblöcken)
- **reduce-motion**-systemeinstellung wird respektiert (glas-parallax/blur-shift abgeschaltet)
- farbe ist nie der **einzige** träger von bedeutung (bereich/status immer zusätzlich als text/icon erkennbar) — wichtig auch für farbsehschwächen

## 8. offene punkte

- konkretes icon-set (empfehlung: SF Symbols — konsistent, nativ, 2d-tauglich) — zur bestätigung
- exakte finale farbwerte/kontrastprüfung folgt, sobald erste screens entstehen (dieses dokument liefert die richtwerte/regeln, kein pixelgenaues style-tile)
