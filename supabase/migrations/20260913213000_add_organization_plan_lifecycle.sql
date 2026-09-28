-- SalonFlow plan and tenant lifecycle foundation.
-- Existing tenants stay active and are placed on Pro so this migration does not
-- unexpectedly restrict or trial an already configured salon.
-- New tenants default to Starter with a 14-day trial.

alter table public.organizations
  add column if not exists plan_code text,
  add column if not exists lifecycle_status text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists plan_changed_at timestamptz;

-- Backfill organizations that existed before plans/lifecycle were introduced.
update public.organizations
set
  plan_code = coalesce(plan_code, 'pro'),
  lifecycle_status = coalesce(
    lifecycle_status,
    case when is_active = false then 'suspended' else 'active' end
  ),
  plan_changed_at = coalesce(plan_changed_at, now())
where plan_code is null
   or lifecycle_status is null
   or plan_changed_at is null;

alter table public.organizations
  alter column plan_code set default 'starter',
  alter column lifecycle_status set default 'trial',
  alter column trial_started_at set default now(),
  alter column trial_ends_at set default (now() + interval '14 days'),
  alter column plan_changed_at set default now();

alter table public.organizations
  alter column plan_code set not null,
  alter column lifecycle_status set not null,
  alter column plan_changed_at set not null;

alter table public.organizations
  drop constraint if exists organizations_plan_code_check;
alter table public.organizations
  add constraint organizations_plan_code_check
  check (plan_code in ('starter', 'pro'));

alter table public.organizations
  drop constraint if exists organizations_lifecycle_status_check;
alter table public.organizations
  add constraint organizations_lifecycle_status_check
  check (lifecycle_status in ('trial', 'active', 'past_due', 'suspended'));

alter table public.organizations
  drop constraint if exists organizations_trial_window_check;
alter table public.organizations
  add constraint organizations_trial_window_check
  check (
    trial_started_at is null
    or trial_ends_at is null
    or trial_started_at < trial_ends_at
  );

create index if not exists organizations_plan_code_idx
  on public.organizations(plan_code);

create index if not exists organizations_lifecycle_status_idx
  on public.organizations(lifecycle_status);

-- Keep legacy access flag and the new lifecycle status synchronized.
-- This allows existing RLS/application checks that still use is_active to keep
-- working while lifecycle_status becomes the business-facing account state.
create or replace function public.sync_organization_lifecycle_access()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.is_active := new.lifecycle_status <> 'suspended';
    return new;
  end if;

  if new.lifecycle_status is distinct from old.lifecycle_status then
    new.is_active := new.lifecycle_status <> 'suspended';
  elsif new.is_active is distinct from old.is_active then
    if new.is_active = false then
      new.lifecycle_status := 'suspended';
    elsif old.lifecycle_status = 'suspended' then
      new.lifecycle_status := 'active';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_organization_lifecycle_access
  on public.organizations;
create trigger sync_organization_lifecycle_access
before insert or update on public.organizations
for each row execute function public.sync_organization_lifecycle_access();

comment on column public.organizations.plan_code is
  'Internal SalonFlow commercial plan identifier. Initial values: starter, pro.';
comment on column public.organizations.lifecycle_status is
  'Tenant lifecycle/billing status. Only suspended blocks salon dashboard access.';
comment on column public.organizations.trial_started_at is
  'Trial start timestamp. Kept for lifecycle history even after activation.';
comment on column public.organizations.trial_ends_at is
  'Trial expiration timestamp. Does not automatically suspend the tenant yet.';
comment on column public.organizations.plan_changed_at is
  'Timestamp of the most recent plan change.';
