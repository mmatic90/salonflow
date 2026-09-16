-- One-time fresh-start reset for platform-provisioned Sales Trial tenants.
-- Keeps organization identity, membership, plan/billing and audit history, while
-- removing salon operational/demo data so a converted customer can configure
-- the salon again with real production data.

create or replace function public.reset_sales_trial_demo_data(
  p_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo_data_seeded boolean;
  v_last_demo_reset_at timestamptz;
  v_lifecycle_status text;
begin
  select
    metadata.demo_data_seeded,
    metadata.last_demo_reset_at,
    organization.lifecycle_status::text
  into
    v_demo_data_seeded,
    v_last_demo_reset_at,
    v_lifecycle_status
  from public.organization_trial_metadata metadata
  join public.organizations organization
    on organization.id = metadata.organization_id
  where metadata.organization_id = p_organization_id
  for update of metadata;

  if not found then
    raise exception 'SALES_TRIAL_DEMO_RESET_NOT_AVAILABLE';
  end if;

  if v_lifecycle_status <> 'active' then
    raise exception 'SALES_TRIAL_DEMO_RESET_REQUIRES_ACTIVE_PLAN';
  end if;

  if coalesce(v_demo_data_seeded, false) is not true
    or v_last_demo_reset_at is not null
  then
    raise exception 'SALES_TRIAL_DEMO_RESET_NOT_AVAILABLE';
  end if;

  -- Delete request/workflow rows that can reference services or appointments
  -- before deleting the core salon data.
  delete from public.online_booking_requests
  where organization_id = p_organization_id;

  delete from public.waitlist_entries
  where organization_id = p_organization_id;

  -- appointment_services cascade from appointments.
  delete from public.appointments
  where organization_id = p_organization_id;

  -- CRM retention rows, marketing preference history/tokens and other
  -- client-owned rows cascade from clients.
  delete from public.clients
  where organization_id = p_organization_id;

  -- A real salon should explicitly configure its own opening hours again.
  delete from public.salon_working_hours
  where organization_id = p_organization_id;

  -- Employee schedules and employee/service mappings cascade from employees.
  delete from public.employees
  where organization_id = p_organization_id;

  -- Service-room and service-equipment mappings cascade from services/rooms/equipment.
  delete from public.services
  where organization_id = p_organization_id;

  delete from public.rooms
  where organization_id = p_organization_id;

  delete from public.equipment
  where organization_id = p_organization_id;

  -- Outbound automations stay deliberately disabled after a fresh start.
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

  update public.organization_trial_metadata
  set
    demo_data_seeded = false,
    last_demo_reset_at = now(),
    updated_at = now()
  where organization_id = p_organization_id;

  update public.organization_setup_progress
  set
    source = 'trial_conversion_fresh_start',
    confirmed_steps = '{}'::text[],
    started_at = now(),
    dismissed_at = null,
    completed_at = null,
    updated_at = now()
  where organization_id = p_organization_id;
end;
$$;

revoke all on function public.reset_sales_trial_demo_data(uuid)
from public, anon, authenticated;

grant execute on function public.reset_sales_trial_demo_data(uuid)
to service_role;

comment on function public.reset_sales_trial_demo_data(uuid) is
  'One-time service-role-only reset for a converted Sales Trial that still contains seeded demo data. Preserves organization identity, membership, billing/plan state and platform/audit history.';
