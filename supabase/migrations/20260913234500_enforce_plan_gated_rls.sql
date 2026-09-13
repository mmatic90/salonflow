-- First commercial entitlement enforcement at the database boundary.
-- Growth/Pro can use waitlist data; only Pro can read the audit log.
-- Trial tenants receive Pro-equivalent entitlements. Past-due tenants keep their
-- stored plan access; only suspended organizations are blocked.

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
grant execute on function public.organization_has_minimum_plan(uuid, text) to authenticated;

comment on function public.organization_has_minimum_plan(uuid, text) is
  'Returns whether an active organization has at least the requested SalonFlow plan. Trial receives Pro-equivalent access.';

-- Waitlist is a Growth capability. Existing rows are preserved on downgrade and
-- become visible again when the organization returns to Growth/Pro or Trial.
drop policy if exists waitlist_entries_member_select on public.waitlist_entries;
create policy waitlist_entries_member_select
on public.waitlist_entries
for select to authenticated
using (
  public.is_organization_member(organization_id)
  and public.organization_has_minimum_plan(organization_id, 'growth')
);

drop policy if exists waitlist_entries_member_insert on public.waitlist_entries;
create policy waitlist_entries_member_insert
on public.waitlist_entries
for insert to authenticated
with check (
  public.is_organization_member(organization_id)
  and public.organization_has_minimum_plan(organization_id, 'growth')
);

drop policy if exists waitlist_entries_member_update on public.waitlist_entries;
create policy waitlist_entries_member_update
on public.waitlist_entries
for update to authenticated
using (
  public.is_organization_member(organization_id)
  and public.organization_has_minimum_plan(organization_id, 'growth')
)
with check (
  public.is_organization_member(organization_id)
  and public.organization_has_minimum_plan(organization_id, 'growth')
);

drop policy if exists waitlist_entries_manager_delete on public.waitlist_entries;
create policy waitlist_entries_manager_delete
on public.waitlist_entries
for delete to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'growth')
);

-- Audit events continue to be written for every salon so history is not lost
-- before an upgrade. Reading/exporting them is a Pro governance capability and
-- remains restricted to management roles.
drop policy if exists "Organization members can read audit logs" on public.audit_logs;
drop policy if exists "Pro admins can read audit logs" on public.audit_logs;
create policy "Pro admins can read audit logs"
on public.audit_logs
for select to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
);
