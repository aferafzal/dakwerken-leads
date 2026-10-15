-- Anonieme funnelstatistiek: welke stap bereikt een sessie?
-- Geen persoonsgegevens: enkel een willekeurig sessie-id (in de browser gemaakt) en de stapnaam.
-- Uit te voeren in de Supabase SQL-editor.

create table if not exists funnel_events (
  id bigint generated always as identity primary key,
  session_id text not null,
  stap text not null,
  created_at timestamptz not null default now()
);

create index if not exists funnel_events_created_at_idx on funnel_events (created_at);
create index if not exists funnel_events_session_idx on funnel_events (session_id);

-- Enkel de server (service role) leest en schrijft
alter table funnel_events enable row level security;
