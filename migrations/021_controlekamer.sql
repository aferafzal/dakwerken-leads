-- ────────────────────────────────────────────────────────────────
-- Migration 021 — Controlekamer: archief, volgende actie, tijdlijn en verstuurde mails
-- Run dit in Supabase SQL Editor (https://supabase.com → uw project → SQL).
-- Voegt alleen kolommen en tabellen toe; wist niets. Mag twee keer lopen.
--
-- tijdlijn en berichten hebben dezelfde vorm als in 020 (CRM-fundament), maar team_id
-- verwijst nog niet naar een team-tabel: de login per persoon komt later. 020 maakt de
-- tabellen niet opnieuw aan (create table if not exists) en voegt de verwijzing dan toe.
-- ────────────────────────────────────────────────────────────────

-- ── Aanvragen: archief en wat er als volgende moet gebeuren ─────
alter table leads
  add column if not exists gearchiveerd_op   timestamptz null,
  add column if not exists volgende_actie    text        null,   -- bv. "Bellen", "Plaatsbezoek", "Offerte opvolgen"
  add column if not exists volgende_actie_op timestamptz null,
  add column if not exists eerste_reactie_op timestamptz null;   -- eerste mail of statuswijziging door ons (reactietijd)

create index if not exists leads_archief_idx        on leads (gearchiveerd_op);
create index if not exists leads_volgende_actie_idx on leads (volgende_actie_op) where volgende_actie_op is not null;

-- ── Tijdlijn per aanvraag ───────────────────────────────────────
create table if not exists tijdlijn (
  id           bigint generated always as identity primary key,
  lead_id      uuid not null references leads (id) on delete cascade,
  soort        text not null,          -- aanvraag | rapport_verstuurd | terugbellen | mail_uit | status | notitie | volgende_actie | archief | herstel
  door         text not null check (door in ('klant', 'systeem', 'ai', 'team')),
  team_id      uuid null,              -- verwijzing naar team volgt met 020
  samenvatting text,                   -- korte regel, zonder lange inhoud
  data         jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists tijdlijn_lead_idx on tijdlijn (lead_id, created_at desc);

-- ── Berichten: verstuurde mails (later ook inkomende mail, chat en WhatsApp) ──
create table if not exists berichten (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid references leads (id) on delete cascade,   -- definitief wissen wist ook de mails
  kanaal         text not null check (kanaal in ('email', 'chat', 'whatsapp')),
  richting       text not null check (richting in ('in', 'uit')),
  van            text,
  aan            text,
  onderwerp      text,
  inhoud         text not null,
  message_id     text unique,
  in_reply_to    text,
  status         text not null default 'nieuw' check (status in ('nieuw', 'auto_beantwoord', 'wacht_op_mens', 'beantwoord', 'genegeerd')),
  verstuurd_door text check (verstuurd_door in ('ai', 'team', 'systeem')),
  team_id        uuid null,
  created_at     timestamptz not null default now()
);
create index if not exists berichten_lead_idx   on berichten (lead_id, created_at desc);
create index if not exists berichten_status_idx on berichten (status, created_at desc);

-- ── Afscherming: alleen de server (service role) leest en schrijft ──
alter table tijdlijn  enable row level security;
alter table berichten enable row level security;
revoke all on tijdlijn  from anon, authenticated;
revoke all on berichten from anon, authenticated;
