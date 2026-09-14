-- SalonFlow sales-trial foundation.
-- Marks privately provisioned sales trials and makes Pro-equivalent trial
-- entitlements expire at trial_ends_at instead of remaining available forever.

create table public.organization_trial_metadata (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  owner_invite_email text,
  invite_sent_at timestamptz,
  invite_last_error text,
  demo_data_seeded boolean not null default false,
  seed_version integer,
  created_by_platform_admin uuid references auth.users(id) on delete set null,
  last_demo_reset_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seed_version is null or seed_version > 0),
  check (char_length(coalesce(owner_invite_email, '')) <= 320),
  check (char_length(coalesce(invite_last_error, '')) <= 500)
);

create index organization_trial_metadata_invite_email_idx
on public.organization_trial_metadata (lower(owner_invite_email))
where owner_invite_email is not null;

create trigger organization_trial_metadata_set_updated_at
before update on public.organization_trial_metadata
for each row execute function public.set_updated_at();

alter table public.organization_trial_metadata enable row level security;
revoke all on public.organization_trial_metadata from anon, authenticated;
grant select, insert, update, delete on public.organization_trial_metadata to service_role;

comment on table public.organization_trial_metadata is
  'Platform-private metadata for sales trial tenants. Row presence marks a tenant as a platform-provisioned sales trial and later gates destructive demo resets.';
comment on column public.organization_trial_metadata.owner_invite_email is
  'Owner email used for the latest sales-trial invitation. No invite token or action link is stored.';

-- Keep the existing plan hierarchy, but only grant Pro-equivalent trial access
-- while the configured trial window is still active. After expiry the tenant
-- falls back to its stored plan (new sales trials use Starter underneath).
create or replace function public.organization_has_minimum_plan(
  p_organization_id uuid,
  p_minimum_plan text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = p_organization_id
      and organization.is_active = true
      and exists (
        select 1
        from public.organization_members member
        where member.organization_id = organization.id
          and member.user_id = auth.uid()
          and member.is_active = true
      )
      and (
        case
          when organization.lifecycle_status = 'trial'
            and organization.trial_ends_at is not null
            and organization.trial_ends_at > now()
            then 2
          when organization.plan_code = 'pro' then 2
          when organization.plan_code = 'growth' then 1
          else 0
        end
      ) >= (
        case p_minimum_plan
          when 'starter' then 0
          when 'growth' then 1
          when 'pro' then 2
          else 99
        end
      )
  );
$$;

revoke all on function public.organization_has_minimum_plan(uuid, text) from public;
grant execute on function public.organization_has_minimum_plan(uuid, text) to authenticated;

comment on function public.organization_has_minimum_plan(uuid, text) is
  'Returns whether the current authenticated member has access at or above the requested plan. Trial grants Pro-equivalent access only until trial_ends_at; expired trials fall back to the stored plan.';
