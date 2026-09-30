-- Permanent platform-owned showcase demo salons used for sales demonstrations.
-- These are intentionally separate from time-limited Sales Trial tenants.

create table if not exists public.showcase_demo_organizations (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  demo_key text not null unique,
  locale text not null,
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint showcase_demo_key_check check (demo_key in ('hr', 'it', 'en')),
  constraint showcase_demo_locale_check check (locale in ('hr', 'it', 'en'))
);

alter table public.showcase_demo_organizations enable row level security;

revoke all on table public.showcase_demo_organizations from public, anon, authenticated;

comment on table public.showcase_demo_organizations is
  'Platform-only registry for permanent MiT Salon showcase/demo tenants. Not used for customer Sales Trials.';

create or replace function public.reset_showcase_demo_data(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.showcase_demo_organizations
    where organization_id = p_organization_id
  ) then
    raise exception 'SHOWCASE_DEMO_RESET_NOT_ALLOWED';
  end if;

  -- Delete request/workflow rows first because they can reference core salon data.
  delete from public.online_booking_requests
  where organization_id = p_organization_id;

  delete from public.waitlist_entries
  where organization_id = p_organization_id;

  -- appointment_services cascade from appointments.
  delete from public.appointments
  where organization_id = p_organization_id;

  -- Client-owned CRM/marketing/treatment data cascades from clients.
  delete from public.clients
  where organization_id = p_organization_id;

  delete from public.salon_working_hours
  where organization_id = p_organization_id;

  -- Employee schedules and employee/service mappings cascade from employees.
  delete from public.employees
  where organization_id = p_organization_id;

  -- Service/resource mappings cascade from the related entities.
  delete from public.services
  where organization_id = p_organization_id;

  delete from public.rooms
  where organization_id = p_organization_id;

  delete from public.equipment
  where organization_id = p_organization_id;

  -- Never leave outbound showcase automations enabled after a refresh.
  update public.organization_review_settings
  set
    enabled = false,
    google_review_url = null,
    enabled_at = null,
    updated_at = now()
  where organization_id = p_organization_id;

  update public.organization_retention_automation_settings
  set
    enabled = false,
    enabled_at = null,
    last_run_local_date = null,
    last_run_at = null,
    last_run_status = 'never',
    last_run_candidates = 0,
    last_run_sent = 0,
    last_run_skipped = 0,
    last_run_failed = 0,
    last_run_error = null,
    updated_at = now()
  where organization_id = p_organization_id;
end;
$$;

revoke all on function public.reset_showcase_demo_data(uuid)
from public, anon, authenticated;

grant execute on function public.reset_showcase_demo_data(uuid)
to service_role;

comment on function public.reset_showcase_demo_data(uuid) is
  'Repeatable service-role-only reset of operational data for a registered permanent showcase demo tenant.';
