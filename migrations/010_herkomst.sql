-- ────────────────────────────────────────────────────────────────
-- Migration 010 — Herkomst van een aanvraag (welke advertentie of welk bericht)
-- Run dit in Supabase SQL Editor (https://supabase.com → uw project → SQL)
-- ────────────────────────────────────────────────────────────────

-- herkomst: { utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, verwijzer, landing }
-- Komt uit de link waarmee de bezoeker binnenkwam; geen cookies, geen persoonsgegevens.
-- marketing_toestemming: de bezoeker aanvaardde de marketingcookies (Meta-pixel) op het moment van de aanvraag.
alter table leads
  add column if not exists herkomst              jsonb   null,
  add column if not exists marketing_toestemming boolean not null default false;

-- Snel tellen per campagne en per advertentie in het dashboard
create index if not exists leads_herkomst_campagne_idx on leads ((herkomst->>'utm_campaign'));
create index if not exists leads_herkomst_inhoud_idx   on leads ((herkomst->>'utm_content'));
