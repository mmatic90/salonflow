-- Fix Sales Trial fresh-start availability.
-- Seed provisioning historically wrote last_demo_reset_at at seed time, which made
-- a newly seeded trial look as if its one-time reset had already been consumed.
-- The invariant is now:
--   demo_data_seeded = true  -> last_demo_reset_at is null
--   after a real fresh start -> demo_data_seeded = false and last_demo_reset_at is set

update public.organization_trial_metadata
set
  last_demo_reset_at = null,
  updated_at = now()
where demo_data_seeded = true
  and last_demo_reset_at is not null;

create or replace function public.normalize_sales_trial_demo_reset_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.demo_data_seeded = true then
    new.last_demo_reset_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_trial_metadata_normalize_demo_reset_state
  on public.organization_trial_metadata;

create trigger organization_trial_metadata_normalize_demo_reset_state
before insert or update of demo_data_seeded, last_demo_reset_at
on public.organization_trial_metadata
for each row execute function public.normalize_sales_trial_demo_reset_state();

revoke all on function public.normalize_sales_trial_demo_reset_state()
from public, anon, authenticated;

comment on function public.normalize_sales_trial_demo_reset_state() is
  'Keeps one-time fresh-start metadata unconsumed while seeded demo data is still present.';
