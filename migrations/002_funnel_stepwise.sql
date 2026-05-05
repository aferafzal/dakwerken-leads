-- ────────────────────────────────────────────────────────────────
-- Migration 002 — Stapsgewijze funnel-flow
-- Run dit in Supabase SQL Editor (https://supabase.com → uw project → SQL)
-- ────────────────────────────────────────────────────────────────

-- Nieuwe kolommen voor stapsgewijze data-capture
alter table leads
  add column if not exists status            text    default 'warm',     -- warm | engaged | hot
  add column if not exists bouwjaar          text    null,                -- voor_1980 | 1980_2000 | 2000_2015 | na_2015
  add column if not exists laatste_dakwerken text    null,                -- nooit | minder_5j | tussen_5_15j | meer_15j
  add column if not exists lekkage_recent    text    null,                -- ja | nee | niet_zeker
  add column if not exists dak_data          jsonb   null,                -- volledige dakscan-data (oppervlakte, hoogte, gebouwen)
  add column if not exists session_id        text    null;                -- client-side sessie-id (UUID)

-- Bestaande verplichte velden mogen NULL zijn (worden later aangevuld)
alter table leads
  alter column naam            drop not null,
  alter column telefoon        drop not null,
  alter column probleem        drop not null,
  alter column urgentie        drop not null,
  alter column gemeente        drop not null,
  alter column gdpr_consent    drop not null;

-- Index voor snel ophalen via session_id
create index if not exists leads_session_id_idx on leads (session_id);
create index if not exists leads_status_idx     on leads (status);
