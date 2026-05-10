-- Add type_werken array column for capturing work-type interests
-- (used to qualify leads for partner-routing)

alter table leads
  add column if not exists type_werken text[];
