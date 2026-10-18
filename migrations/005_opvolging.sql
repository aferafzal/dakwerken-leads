-- ────────────────────────────────────────────────────────────────
-- Migration 005 — Opvolging van aanvragen in het dashboard
-- Run dit in Supabase SQL Editor (https://supabase.com → uw project → SQL)
-- ────────────────────────────────────────────────────────────────

-- status blijft wat de bezoeker deed (warm | engaged | hot);
-- opvolging is wat wij ermee deden.
alter table leads
  add column if not exists opvolging    text        not null default 'nieuw',  -- nieuw | gecontacteerd | doorgestuurd | offerte | gewonnen | verloren
  add column if not exists notitie      text        null,
  add column if not exists opvolging_op timestamptz null;

-- Leads uit het oude offerteformulier: hun opvolging stond in status
update leads set opvolging = case status
    when 'gebeld'   then 'gecontacteerd'
    when 'offerte'  then 'offerte'
    when 'gewonnen' then 'gewonnen'
    when 'verloren' then 'verloren'
    else opvolging
  end
where status in ('gebeld', 'offerte', 'gewonnen', 'verloren');

create index if not exists leads_opvolging_idx on leads (opvolging);
