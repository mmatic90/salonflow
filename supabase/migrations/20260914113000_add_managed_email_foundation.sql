-- SalonFlow managed tenant email foundation
-- Keeps provider credentials outside the tenant database while adding per-tenant
-- settings, monthly usage accounting and atomic quota reservation.

create table public.organization_email_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  provider text not null default 'salonflow'
    check (provider in ('salonflow', 'custom')),
  managed_email_enabled boolean not null default true,
  from_name text,
  reply_to_email text,
  monthly_limit_override integer
    check (monthly_limit_override is null or monthly_limit_override > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_email_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null,
  attempted_count integer not null default 0 check (attempted_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, period_start),
  check (sent_count + failed_count <= attempted_count)
);

insert into public.organization_email_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

create trigger organization_email_settings_set_updated_at
before update on public.organization_email_settings
for each row execute function public.set_updated_at();

create trigger organization_email_usage_set_updated_at
before update on public.organization_email_usage
for each row execute function public.set_updated_at();

alter table public.organization_email_settings enable row level security;
alter table public.organization_email_usage enable row level security;

create policy "Members can view organization email settings"
on public.organization_email_settings
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can view organization email usage"
on public.organization_email_usage
for select
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);

create or replace function public.reserve_managed_email_send(
  p_organization_id uuid,
  p_default_organization_limit integer,
  p_global_limit integer
)
returns table (
  allowed boolean,
  reason text,
  organization_attempted integer,
  global_attempted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', timezone('UTC', now()))::date;
  v_enabled boolean;
  v_provider text;
  v_override integer;
  v_organization_limit integer;
  v_organization_attempted integer;
  v_global_attempted integer;
begin
  if p_default_organization_limit <= 0 or p_global_limit <= 0 then
    return query select false, 'invalid_limit', 0, 0;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext('salonflow-managed-email-' || v_period_start::text));

  insert into public.organization_email_settings (organization_id)
  values (p_organization_id)
  on conflict (organization_id) do nothing;

  select managed_email_enabled, provider, monthly_limit_override
    into v_enabled, v_provider, v_override
  from public.organization_email_settings
  where organization_id = p_organization_id;

  if coalesce(v_enabled, false) = false then
    return query select false, 'disabled', 0, 0;
    return;
  end if;

  if coalesce(v_provider, 'salonflow') <> 'salonflow' then
    return query select false, 'custom_provider_not_configured', 0, 0;
    return;
  end if;

  v_organization_limit := coalesce(v_override, p_default_organization_limit);

  insert into public.organization_email_usage (
    organization_id,
    period_start,
    attempted_count,
    sent_count,
    failed_count
  )
  values (p_organization_id, v_period_start, 0, 0, 0)
  on conflict (organization_id, period_start) do nothing;

  select attempted_count
    into v_organization_attempted
  from public.organization_email_usage
  where organization_id = p_organization_id
    and period_start = v_period_start;

  select coalesce(sum(attempted_count), 0)::integer
    into v_global_attempted
  from public.organization_email_usage
  where period_start = v_period_start;

  if v_organization_attempted >= v_organization_limit then
    return query
      select false, 'organization_limit', v_organization_attempted, v_global_attempted;
    return;
  end if;

  if v_global_attempted >= p_global_limit then
    return query
      select false, 'global_limit', v_organization_attempted, v_global_attempted;
    return;
  end if;

  update public.organization_email_usage
  set attempted_count = attempted_count + 1
  where organization_id = p_organization_id
    and period_start = v_period_start
  returning attempted_count into v_organization_attempted;

  v_global_attempted := v_global_attempted + 1;

  return query
    select true, 'reserved', v_organization_attempted, v_global_attempted;
end;
$$;

create or replace function public.record_managed_email_result(
  p_organization_id uuid,
  p_success boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period_start date := date_trunc('month', timezone('UTC', now()))::date;
begin
  update public.organization_email_usage
  set
    sent_count = sent_count + case when p_success then 1 else 0 end,
    failed_count = failed_count + case when p_success then 0 else 1 end
  where organization_id = p_organization_id
    and period_start = v_period_start;
end;
$$;

revoke all on function public.reserve_managed_email_send(uuid, integer, integer)
from public, anon, authenticated;
grant execute on function public.reserve_managed_email_send(uuid, integer, integer)
to service_role;

revoke all on function public.record_managed_email_result(uuid, boolean)
from public, anon, authenticated;
grant execute on function public.record_managed_email_result(uuid, boolean)
to service_role;

comment on table public.organization_email_settings is
  'Tenant-level managed email settings. Custom provider is reserved for a future credential-safe integration.';
comment on table public.organization_email_usage is
  'Monthly per-tenant managed email usage used for quota and cost protection.';
