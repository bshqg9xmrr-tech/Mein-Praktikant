# cloud-sync einrichten (mac ⇄ iphone ⇄ web)

ohne diese einrichtung läuft die app ganz normal weiter — nur eben pro gerät
für sich (daten liegen dann nur lokal im browser, siehe `context.md` §7.9 /
`architecture.md` §6). diese anleitung schaltet echten, kostenlosen
cloud-sync über [supabase](https://supabase.com) frei, damit mac, iphone und
web-browser dieselben daten sehen.

dauer: ca. 5 minuten, einmalig.

## 1. supabase-projekt anlegen

1. auf [supabase.com](https://supabase.com) kostenlos registrieren (der
   free-tier reicht für diese app locker aus).
2. "New Project" → einen beliebigen namen vergeben (z. b. `mein-praktikant`),
   ein datenbank-passwort setzen (merken/speichern, wird selten gebraucht)
   und eine region wählen (am besten eine nahe an dir, z. b. Frankfurt/EU).
3. warten, bis das projekt fertig eingerichtet ist (dauert ~1–2 minuten).

## 2. tabelle anlegen

im supabase-dashboard links auf **SQL Editor** → **New query** → folgendes
einfügen und mit **Run** ausführen:

```sql
create table if not exists app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state enable row level security;

create policy "eigene daten lesen"
  on app_state for select
  using (auth.uid() = user_id);

create policy "eigene daten schreiben"
  on app_state for insert
  with check (auth.uid() = user_id);

create policy "eigene daten aktualisieren"
  on app_state for update
  using (auth.uid() = user_id);
```

das legt eine tabelle an, in der pro angemeldeter person **genau eine
zeile** mit dem kompletten app-stand (als json) liegt — und stellt über
row-level-security sicher, dass niemand die daten von jemand anderem lesen
oder schreiben kann, selbst mit dem (öffentlichen) anon-key.

## 3. e-mail-login aktivieren (ist standardmäßig schon an)

supabase hat "e-mail (magic link)"-login standardmäßig aktiv — nichts weiter
zu tun. **Authentication → Providers → Email** kann das bei bedarf geprüft
werden.

> hinweis: dieser login ist ein **schneller zwischenstand** für den sync,
> nicht der für v1 geplante Auth0-login (`architecture.md` §4.8) — beides
> lässt sich später sauber ablösen, ohne die tabellenstruktur zu ändern.

## 4. url + anon-key in die app eintragen

im supabase-dashboard: **Project Settings → API**. dort zwei werte kopieren:

- **Project URL** (sieht aus wie `https://xxxxxxxx.supabase.co`)
- **anon public**-key (ein langer string, beginnt mit `eyJ...`)

> der anon-key ist **kein geheimnis** — er ist genau dafür gedacht, im
> browser zu stehen. der schutz kommt über row-level-security (schritt 2),
> nicht über geheimhaltung dieses keys.

beide werte in der app unter **einstellungen → cloud-sync** eintragen und
speichern.

## 5. anmelden — auf jedem gerät

in den einstellungen die **gleiche e-mail-adresse** eintragen und auf
"login-link senden" tippen. den link aus der e-mail auf **diesem gerät**
öffnen (er meldet dich in diesem browser an). das auf mac, iphone und im
web-browser wiederholen — alle drei melden sich mit derselben adresse an und
sehen danach dieselben daten.

nach der ersten anmeldung lädt das aktive gerät entweder den bereits
vorhandenen cloud-stand herunter, oder — falls es das allererste gerät ist —
lädt seinen bisherigen lokalen stand als startpunkt hoch.

## sync-verhalten (kurz)

- jede lokale änderung wird ~1 sekunde später automatisch hochgeladen.
- alle 30 sekunden (und beim zurückwechseln in die app) wird geprüft, ob ein
  anderes gerät etwas neueres hochgeladen hat.
- es gibt **keinen** feld-genauen zusammenführungs-mechanismus — der
  jeweils **zuletzt gespeicherte gesamtstand gewinnt**. für die normale
  nutzung (ein gerät nach dem anderen) ist das unproblematisch; bearbeitest
  du zwei geräte exakt gleichzeitig offline, gewinnt beim nächsten sync der
  zuletzt hochgeladene stand.
