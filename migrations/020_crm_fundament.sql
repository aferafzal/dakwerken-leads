-- ────────────────────────────────────────────────────────────────
-- Migration 020 — CRM, fase A: team, tijdlijn, berichten, taken, AI-beslissingen, afmeldingen
-- Run dit in Supabase SQL Editor (https://supabase.com → uw project → SQL), eerst op de testdatabank.
--
-- Namen bewust anders dan in het partnerplatform (daar bestaan al gebeurtenissen, partners, partner_*):
-- de tijdlijn van een aanvraag heet hier "tijdlijn". Enkel de server leest en schrijft (service role);
-- anon en authenticated krijgen niets, net als bij leads sinds de afscherming.
-- ────────────────────────────────────────────────────────────────

-- ── Team: wie mag in het dashboard ─────────────────────────────
create table if not exists team (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users (id) on delete set null,  -- gekoppeld bij de eerste login
  email       text not null unique,
  naam        text not null,
  rol         text not null check (rol in ('beheerder', 'medewerker')),
  telegram_chat_id bigint unique,                                         -- voor fase B
  actief      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists team_inlogcodes (
  id          bigint generated always as identity primary key,
  email       text not null,
  pogingen    smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists team_inlogcodes_email_idx on team_inlogcodes (email, created_at desc);

-- ── Tijdlijn per aanvraag: alles wat er met een klant gebeurde ───
create table if not exists tijdlijn (
  id          bigint generated always as identity primary key,
  lead_id     uuid not null references leads (id) on delete cascade,
  soort       text not null,          -- aanvraag | rapport_verstuurd | terugbellen | chat | mail_in | mail_uit | ai_antwoord | status | notitie | taak | gebeld
  door        text not null check (door in ('klant', 'systeem', 'ai', 'team')),
  team_id     uuid references team (id) on delete set null,
  samenvatting text,                  -- korte regel voor de tijdlijn, zonder lange inhoud
  data        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists tijdlijn_lead_idx on tijdlijn (lead_id, created_at desc);

-- ── Berichten: één inbox voor mail, chat en later WhatsApp ──────
create table if not exists berichten (
  id            uuid primary key default gen_random_uuid(),
  lead_id       uuid references leads (id) on delete set null,
  kanaal        text not null check (kanaal in ('email', 'chat', 'whatsapp')),
  richting      text not null check (richting in ('in', 'uit')),
  van           text,
  aan           text,
  onderwerp     text,
  inhoud        text not null,
  message_id    text unique,          -- Message-ID van de mail, voor de draad
  in_reply_to   text,
  status        text not null default 'nieuw' check (status in ('nieuw', 'auto_beantwoord', 'wacht_op_mens', 'beantwoord', 'genegeerd')),
  verstuurd_door text check (verstuurd_door in ('ai', 'team', 'systeem')),
  team_id       uuid references team (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists berichten_lead_idx on berichten (lead_id, created_at desc);
create index if not exists berichten_status_idx on berichten (status, created_at desc);

-- ── AI-beslissingen: waarom de assistent wel of niet zelf antwoordde ──
create table if not exists ai_beslissingen (
  id            bigint generated always as identity primary key,
  bericht_id    uuid not null references berichten (id) on delete cascade,
  categorie     text not null,
  zekerheid     numeric(3, 2) not null,
  rode_vlaggen  text[] not null default '{}',
  automatisch   boolean not null,
  reden         text,
  concept       text,
  model         text,
  created_at    timestamptz not null default now()
);
create index if not exists ai_beslissingen_bericht_idx on ai_beslissingen (bericht_id);

-- ── Taken: opvolging en herinneringen ───────────────────────────
create table if not exists taken (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid references leads (id) on delete cascade,
  soort       text not null,          -- bellen | mail_dag1 | mail_dag5 | offerte_check | review | vrij
  omschrijving text,
  vervalt_op  timestamptz not null,
  status      text not null default 'open' check (status in ('open', 'gedaan', 'vervallen', 'geannuleerd')),
  toegewezen_aan uuid references team (id) on delete set null,
  gedaan_op   timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists taken_open_idx on taken (status, vervalt_op);
create index if not exists taken_lead_idx on taken (lead_id);

-- ── Afmeldingen: wie geen opvolgmails meer wil ──────────────────
create table if not exists afmeldingen (
  email       text primary key,
  created_at  timestamptz not null default now()
);

-- ── Bestonden tijdlijn en berichten al (migratie 021), dan zonder verwijzing naar team: nu toevoegen ──
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tijdlijn_team_id_fkey') then
    alter table tijdlijn add constraint tijdlijn_team_id_fkey foreign key (team_id) references team (id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'berichten_team_id_fkey') then
    alter table berichten add constraint berichten_team_id_fkey foreign key (team_id) references team (id) on delete set null;
  end if;
end $$;

-- ── Afscherming: enkel de server (service role) ─────────────────
do $$
declare t text;
begin
  foreach t in array array['team', 'team_inlogcodes', 'tijdlijn', 'berichten', 'ai_beslissingen', 'taken', 'afmeldingen'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from anon, authenticated', t);
  end loop;
end $$;
