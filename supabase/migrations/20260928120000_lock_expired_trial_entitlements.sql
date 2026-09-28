-- Expired Sales Trials must not fall back to the stored Starter plan.
-- A tenant remains data-preserved and reactivateable, but every plan-gated
-- capability stays locked until Platform Admin converts the lifecycle to active.

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
          when organization.lifecycle_status = 'trial'
            then -1
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
  'Returns whether the current authenticated member has access at or above the requested plan. Active trials are Pro-equivalent until trial_ends_at. Expired or invalid trial windows grant no Starter/Growth/Pro entitlement until the lifecycle is converted to active.';
