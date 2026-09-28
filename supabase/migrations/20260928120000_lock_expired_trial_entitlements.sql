-- Expired Sales Trials must not fall back to the stored Starter plan.
-- Keep organization identity and membership readable so the dedicated expiry
-- screen can render, but lock tenant workspace data and mutations until the
-- lifecycle is converted to an active paid plan.

create or replace function public.organization_workspace_accessible(
  target_organization_id uuid
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
    where organization.id = target_organization_id
      and organization.is_active = true
      and (
        organization.lifecycle_status <> 'trial'
        or (
          organization.trial_ends_at is not null
          and organization.trial_ends_at > now()
        )
      )
  );
$$;

revoke all on function public.organization_workspace_accessible(uuid) from public;
grant execute on function public.organization_workspace_accessible(uuid)
to anon, authenticated;

comment on function public.organization_workspace_accessible(uuid) is
  'Returns whether tenant workspace data may currently be used. Active trial windows and non-trial active tenants are accessible; expired/invalid trials and inactive tenants are locked.';

-- Management-role checks are also lifecycle-aware. Identity reads continue to
-- use is_organization_member so an expired tenant can still render its expiry
-- page, while role-gated mutations remain blocked.
create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.organization_workspace_accessible(target_organization_id)
    and exists (
      select 1
      from public.organization_members member
      where member.organization_id = target_organization_id
        and member.user_id = auth.uid()
        and member.is_active = true
        and member.role = any(allowed_roles)
    );
$$;

revoke all on function public.has_organization_role(uuid, public.organization_role[]) from public;
grant execute on function public.has_organization_role(uuid, public.organization_role[])
to authenticated;

-- Plan checks must return false for every tier while a trial is expired. This
-- prevents an expired Sales Trial from silently inheriting its stored Starter
-- plan through any RLS policy or RPC that uses this helper.
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
      and public.organization_workspace_accessible(organization.id)
      and exists (
        select 1
        from public.organization_members member
        where member.organization_id = organization.id
          and member.user_id = auth.uid()
          and member.is_active = true
      )
      and (
        case
          when organization.lifecycle_status = 'trial' then 2
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
grant execute on function public.organization_has_minimum_plan(uuid, text)
to authenticated;

comment on function public.organization_has_minimum_plan(uuid, text) is
  'Returns whether the current authenticated member has access at or above the requested plan. Active trials are Pro-equivalent; expired or invalid trial windows grant no Starter/Growth/Pro entitlement until lifecycle activation.';

-- Prevent tenant users from changing commercial/platform-controlled fields on
-- their own organization. Platform Admin and future billing webhooks use the
-- service role and remain able to update these fields.
create or replace function public.guard_organization_platform_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), current_user::text) = 'service_role'
    or current_user in ('postgres', 'supabase_admin')
  then
    return new;
  end if;

  if
    new.is_active is distinct from old.is_active
    or new.created_by is distinct from old.created_by
    or new.plan_code is distinct from old.plan_code
    or new.lifecycle_status is distinct from old.lifecycle_status
    or new.trial_started_at is distinct from old.trial_started_at
    or new.trial_ends_at is distinct from old.trial_ends_at
    or new.plan_changed_at is distinct from old.plan_changed_at
    or new.billing_provider is distinct from old.billing_provider
    or new.billing_email is distinct from old.billing_email
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.stripe_price_id is distinct from old.stripe_price_id
    or new.billing_period_start is distinct from old.billing_period_start
    or new.billing_period_end is distinct from old.billing_period_end
    or new.billing_cancel_at_period_end is distinct from old.billing_cancel_at_period_end
    or new.billing_updated_at is distinct from old.billing_updated_at
  then
    raise exception 'ORGANIZATION_PLATFORM_FIELDS_FORBIDDEN';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_guard_platform_fields
on public.organizations;
create trigger organizations_guard_platform_fields
before update on public.organizations
for each row execute function public.guard_organization_platform_fields();

-- Add one restrictive lifecycle policy to every current tenant-scoped RLS table.
-- Existing permissive membership/plan policies still decide who may access a row;
-- this policy adds the independent requirement that the workspace is not locked.
-- organization_members is deliberately excluded so identity/membership can still
-- be read on /trial-expired. Its mutations are already role-gated through the
-- lifecycle-aware has_organization_role helper above.
do $$
declare
  target record;
begin
  for target in
    select distinct table_class.relname as table_name
    from pg_class table_class
    join pg_namespace namespace
      on namespace.oid = table_class.relnamespace
    join pg_attribute attribute
      on attribute.attrelid = table_class.oid
    where namespace.nspname = 'public'
      and table_class.relkind = 'r'
      and table_class.relrowsecurity = true
      and attribute.attname = 'organization_id'
      and attribute.attisdropped = false
      and table_class.relname <> 'organization_members'
  loop
    execute format(
      'drop policy if exists workspace_lifecycle_access on public.%I',
      target.table_name
    );

    execute format(
      'create policy workspace_lifecycle_access on public.%I as restrictive for all to anon, authenticated using (public.organization_workspace_accessible(organization_id)) with check (public.organization_workspace_accessible(organization_id))',
      target.table_name
    );
  end loop;
end;
$$;

-- Anonymous public booking may read basic organization identity, but an expired
-- trial should disappear at the database boundary as well as in the Next.js
-- public booking routes. Authenticated members are not restricted by this policy
-- so the expiry page can still display their salon name.
drop policy if exists organizations_public_workspace_lifecycle_access
on public.organizations;
create policy organizations_public_workspace_lifecycle_access
on public.organizations
as restrictive
for select
to anon
using (public.organization_workspace_accessible(id));
