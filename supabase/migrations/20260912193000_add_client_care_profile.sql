-- Add optional salon care profile fields to clients.
-- These are client-level facts/preferences that can apply across appointments.
-- Per-visit treatment notes should remain appointment-specific and are intentionally not modeled here.

alter table public.clients
  add column if not exists allergies_sensitivities text,
  add column if not exists contraindications text,
  add column if not exists treatment_preferences text;

comment on column public.clients.allergies_sensitivities is
  'Optional salon note about allergies or sensitivities relevant to services.';

comment on column public.clients.contraindications is
  'Optional salon note about known contraindications relevant to services.';

comment on column public.clients.treatment_preferences is
  'Optional client preferences that can apply across multiple appointments.';
