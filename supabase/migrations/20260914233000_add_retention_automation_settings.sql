-- Pro CRM retention automation settings and daily execution guard.
-- Automation is OFF by default for every tenant.

create table public.organization_retention_automation_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  daily_limit integer not null default 5 check (daily_limit between 1 and 20),
  enabled_at timestamptz,
  last_run_local_date date,
  last_run_at timestamptz,
  last_run_status text not null default 'never'
    check (last_run_status in ('never', 'processing', 'completed', 'failed')),
  last_run_candidates integer not null default 0 check (last_run_candidates >= 0),
  last_run_sent integer not null default 0 check (last_run_sent >= 0),
  last_run_skipped integer not null default 0 check (last_run_skipped >= 0),
  last_run_failed integer not null default 0 check (last_run_failed >= 0),
  last_run_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (enabled = true and enabled_at is not null)
    or (enabled = false and enabled_at is null)
  )
);

insert into public.organization_retention_automation_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

create or replace function public.ensure_retention_automation_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_retention_automation_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists organizations_ensure_retention_automation_settings on public.organizations;
create trigger organizations_ensure_retention_automation_settings
after insert on public.organizations
for each row execute function public.ensure_retention_automation_settings();

create or replace function public.normalize_retention_automation_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.enabled then
      new.enabled_at := coalesce(new.enabled_at, now());
    else
      new.enabled_at := null;
    end if;
  elsif new.enabled is distinct from old.enabled then
    if new.enabled then
      new.enabled_at := now();
    else
      new.enabled_at := null;
    end if;
  end if;

  if coalesce(auth.role(), '') <> 'service_role' and tg_op = 'UPDATE' then
    new.last_run_local_date := old.last_run_local_date;
    new.last_run_at := old.last_run_at;
    new.last_run_status := old.last_run_status;
    new.last_run_candidates := old.last_run_candidates;
    new.last_run_sent := old.last_run_sent;
    new.last_run_skipped := old.last_run_skipped;
    new.last_run_failed := old.last_run_failed;
    new.last_run_error := old.last_run_error;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists retention_automation_settings_normalize on public.organization_retention_automation_settings;
create trigger retention_automation_settings_normalize
before insert or update on public.organization_retention_automation_settings
for each row execute function public.normalize_retention_automation_settings();

alter table public.organization_retention_automation_settings enable row level security;

create policy "Pro managers can view retention automation settings"
on public.organization_retention_automation_settings
for select
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
);

create policy "Pro managers can update retention automation settings"
on public.organization_retention_automation_settings
for update
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
);

grant select, update on public.organization_retention_automation_settings to authenticated;
revoke insert, delete on public.organization_retention_automation_settings from anon, authenticated;
grant select, insert, update, delete on public.organization_retention_automation_settings to service_role;

create or replace function public.claim_retention_automation_run(
  p_organization_id uuid,
  p_local_date date
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.organization_retention_automation_settings%rowtype;
begin
  select *
  into v_settings
  from public.organization_retention_automation_settings s
  where s.organization_id = p_organization_id
  for update;

  if not found or v_settings.enabled is not true then
    return false;
  end if;

  if v_settings.last_run_local_date = p_local_date then
    if v_settings.last_run_status = 'completed' then
      return false;
    end if;

    if v_settings.last_run_status = 'processing'
      and v_settings.last_run_at is not null
      and v_settings.last_run_at > now() - interval '2 hours'
    then
      return false;
    end if;
  end if;

  update public.organization_retention_automation_settings
  set
    last_run_local_date = p_local_date,
    last_run_at = now(),
    last_run_status = 'processing',
    last_run_candidates = 0,
    last_run_sent = 0,
    last_run_skipped = 0,
    last_run_failed = 0,
    last_run_error = null,
    updated_at = now()
  where organization_id = p_organization_id;

  return true;
end;
$$;

revoke all on function public.claim_retention_automation_run(uuid, date) from public, anon, authenticated;
grant execute on function public.claim_retention_automation_run(uuid, date) to service_role;

create or replace function public.record_retention_automation_run(
  p_organization_id uuid,
  p_status text,
  p_candidates integer,
  p_sent integer,
  p_skipped integer,
  p_failed integer,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('completed', 'failed') then
    raise exception 'INVALID_RETENTION_AUTOMATION_RUN_STATUS';
  end if;

  update public.organization_retention_automation_settings
  set
    last_run_at = now(),
    last_run_status = p_status,
    last_run_candidates = greatest(coalesce(p_candidates, 0), 0),
    last_run_sent = greatest(coalesce(p_sent, 0), 0),
    last_run_skipped = greatest(coalesce(p_skipped, 0), 0),
    last_run_failed = greatest(coalesce(p_failed, 0), 0),
    last_run_error = case
      when p_status = 'failed' then left(coalesce(p_error, 'unknown'), 500)
      else null
    end,
    updated_at = now()
  where organization_id = p_organization_id;
end;
$$;

revoke all on function public.record_retention_automation_run(uuid, text, integer, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.record_retention_automation_run(uuid, text, integer, integer, integer, integer, text) to service_role;

comment on table public.organization_retention_automation_settings is
  'Pro CRM retention email automation settings. Disabled by default. Last-run fields contain aggregate execution metadata only, never client/message content.';
