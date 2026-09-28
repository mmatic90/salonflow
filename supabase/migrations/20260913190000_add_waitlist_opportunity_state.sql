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

-- Keep persisted opportunities synchronized for every appointment mutation, regardless of
-- whether it came from the dashboard API, a server action or another booking flow.
-- A newly occupied slot invalidates overlapping suggestions. A slot that becomes free
-- immediately offers itself to compatible waiting entries.
create or replace function public.sync_waitlist_opportunities_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_blocks boolean := false;
  new_blocks boolean := false;
  slot_changed boolean := false;
begin
  if tg_op <> 'INSERT' then
    old_blocks := old.status in ('scheduled', 'confirmed', 'completed');
  end if;

  if tg_op <> 'DELETE' then
    new_blocks := new.status in ('scheduled', 'confirmed', 'completed');
  end if;

  if tg_op = 'UPDATE' then
    slot_changed :=
      old.appointment_date is distinct from new.appointment_date
      or old.start_time is distinct from new.start_time
      or old.end_time is distinct from new.end_time
      or old.employee_id is distinct from new.employee_id
      or old.room_id is distinct from new.room_id;
  end if;

  -- Any blocking appointment can make an existing persisted suggestion stale.
  if new_blocks then
    update public.waitlist_entries w
    set
      matched_date = null,
      matched_start_time = null,
      matched_end_time = null,
      matched_employee_id = null,
      matched_room_id = null,
      matched_at = null
    where w.organization_id = new.organization_id
      and w.status = 'waiting'
      and w.matched_date = new.appointment_date
      and w.matched_start_time is not null
      and w.matched_end_time is not null
      and (
        w.matched_employee_id = new.employee_id
        or (new.room_id is not null and w.matched_room_id = new.room_id)
      )
      and w.matched_start_time < new.end_time
      and new.start_time < w.matched_end_time;
  end if;

  -- If a blocking appointment is cancelled, deleted or moved, its old slot is now free.
  if old_blocks
    and (
      tg_op = 'DELETE'
      or not new_blocks
      or slot_changed
    )
    and old.employee_id is not null
    and old.room_id is not null
    and old.appointment_date >= current_date
  then
    update public.waitlist_entries w
    set
      matched_date = old.appointment_date,
      matched_start_time = greatest(
        old.start_time,
        coalesce(w.preferred_time_from, old.start_time)
      ),
      matched_end_time = greatest(
        old.start_time,
        coalesce(w.preferred_time_from, old.start_time)
      ) + make_interval(mins => s.duration_minutes),
      matched_employee_id = old.employee_id,
      matched_room_id = old.room_id,
      matched_at = now()
    from public.services s,
         public.employee_services es,
         public.service_rooms sr
    where w.organization_id = old.organization_id
      and w.status = 'waiting'
      and s.id = w.service_id
      and s.organization_id = w.organization_id
      and s.is_active = true
      and s.duration_minutes > 0
      and es.organization_id = w.organization_id
      and es.service_id = w.service_id
      and es.employee_id = old.employee_id
      and sr.organization_id = w.organization_id
      and sr.service_id = w.service_id
      and sr.room_id = old.room_id
      and (
        w.preferred_employee_id is null
        or w.preferred_employee_id = old.employee_id
      )
      and (
        w.preferred_date_from is null
        or old.appointment_date >= w.preferred_date_from
      )
      and (
        w.preferred_date_to is null
        or old.appointment_date <= w.preferred_date_to
      )
      and greatest(
        old.start_time,
        coalesce(w.preferred_time_from, old.start_time)
      ) + make_interval(mins => s.duration_minutes)
        <= least(
          old.end_time,
          coalesce(w.preferred_time_to, old.end_time)
        )
      and (
        w.matched_date is null
        or old.appointment_date < w.matched_date
        or (
          old.appointment_date = w.matched_date
          and greatest(
            old.start_time,
            coalesce(w.preferred_time_from, old.start_time)
          ) < w.matched_start_time
        )
      );
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists appointments_sync_waitlist_opportunities
  on public.appointments;

create trigger appointments_sync_waitlist_opportunities
after insert or update or delete on public.appointments
for each row execute function public.sync_waitlist_opportunities_from_appointment();

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
