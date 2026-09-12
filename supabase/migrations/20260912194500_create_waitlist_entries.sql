-- SalonFlow waitlist foundation.
-- Allows salons to track clients who want an earlier or otherwise preferred appointment slot.

create table public.waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  preferred_employee_id uuid references public.employees(id) on delete set null,
  preferred_date_from date,
  preferred_date_to date,
  preferred_time_from time,
  preferred_time_to time,
  notes text,
  status text not null default 'waiting'
    check (status in ('waiting', 'booked', 'cancelled')),
  booked_appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    preferred_date_from is null
    or preferred_date_to is null
    or preferred_date_from <= preferred_date_to
  ),
  check (
    (preferred_time_from is null and preferred_time_to is null)
    or (
      preferred_time_from is not null
      and preferred_time_to is not null
      and preferred_time_from < preferred_time_to
    )
  )
);

create index waitlist_entries_organization_status_idx
  on public.waitlist_entries(organization_id, status, created_at);
create index waitlist_entries_client_idx
  on public.waitlist_entries(organization_id, client_id);
create index waitlist_entries_service_idx
  on public.waitlist_entries(organization_id, service_id, status);

create trigger waitlist_entries_set_updated_at
before update on public.waitlist_entries
for each row execute function public.set_updated_at();

create or replace function public.validate_waitlist_tenant_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.clients c
    where c.id = new.client_id
      and c.organization_id = new.organization_id
  ) then
    raise exception 'Client does not belong to the waitlist organization';
  end if;

  if not exists (
    select 1
    from public.services s
    where s.id = new.service_id
      and s.organization_id = new.organization_id
  ) then
    raise exception 'Service does not belong to the waitlist organization';
  end if;

  if new.preferred_employee_id is not null and not exists (
    select 1
    from public.employees e
    where e.id = new.preferred_employee_id
      and e.organization_id = new.organization_id
  ) then
    raise exception 'Employee does not belong to the waitlist organization';
  end if;

  if new.booked_appointment_id is not null and not exists (
    select 1
    from public.appointments a
    where a.id = new.booked_appointment_id
      and a.organization_id = new.organization_id
  ) then
    raise exception 'Appointment does not belong to the waitlist organization';
  end if;

  return new;
end;
$$;

create trigger waitlist_entries_validate_tenant_references
before insert or update on public.waitlist_entries
for each row execute function public.validate_waitlist_tenant_references();

alter table public.waitlist_entries enable row level security;

create policy waitlist_entries_member_select
on public.waitlist_entries
for select to authenticated
using (public.is_organization_member(organization_id));

create policy waitlist_entries_member_insert
on public.waitlist_entries
for insert to authenticated
with check (public.is_organization_member(organization_id));

create policy waitlist_entries_member_update
on public.waitlist_entries
for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy waitlist_entries_manager_delete
on public.waitlist_entries
for delete to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);
