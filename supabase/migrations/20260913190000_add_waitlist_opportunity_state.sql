-- Persist the first currently available slot found for an active waitlist entry.
-- This keeps dashboard notifications cheap: matching happens when waitlist or appointment state changes,
-- not every time the dashboard renders.

alter table public.waitlist_entries
  add column if not exists matched_date date,
  add column if not exists matched_start_time time,
  add column if not exists matched_end_time time,
  add column if not exists matched_employee_id uuid references public.employees(id) on delete set null,
  add column if not exists matched_room_id uuid references public.rooms(id) on delete set null,
  add column if not exists matched_at timestamptz;

alter table public.waitlist_entries
  drop constraint if exists waitlist_entries_match_state_check;

alter table public.waitlist_entries
  add constraint waitlist_entries_match_state_check
  check (
    (
      matched_date is null
      and matched_start_time is null
      and matched_end_time is null
      and matched_employee_id is null
      and matched_room_id is null
      and matched_at is null
    )
    or
    (
      matched_date is not null
      and matched_start_time is not null
      and matched_end_time is not null
      and matched_employee_id is not null
      and matched_room_id is not null
      and matched_at is not null
      and matched_start_time < matched_end_time
    )
  );

create index if not exists waitlist_entries_active_match_idx
  on public.waitlist_entries(organization_id, status, matched_date, matched_start_time)
  where status = 'waiting' and matched_date is not null;

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

  if new.matched_employee_id is not null and not exists (
    select 1
    from public.employees e
    where e.id = new.matched_employee_id
      and e.organization_id = new.organization_id
  ) then
    raise exception 'Matched employee does not belong to the waitlist organization';
  end if;

  if new.matched_room_id is not null and not exists (
    select 1
    from public.rooms r
    where r.id = new.matched_room_id
      and r.organization_id = new.organization_id
  ) then
    raise exception 'Matched room does not belong to the waitlist organization';
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

comment on column public.waitlist_entries.matched_date is
  'Date of the first currently available slot automatically matched to this waitlist request.';
comment on column public.waitlist_entries.matched_start_time is
  'Start time of the automatically matched slot.';
comment on column public.waitlist_entries.matched_end_time is
  'End time of the automatically matched slot.';
comment on column public.waitlist_entries.matched_employee_id is
  'Employee selected by automatic availability matching.';
comment on column public.waitlist_entries.matched_room_id is
  'Room selected by automatic availability matching.';
comment on column public.waitlist_entries.matched_at is
  'Timestamp when the currently stored match was calculated.';
