-- Enforce SalonFlow appointment runtime rules at database level.
-- Existing automatically generated 08:00-20:00 employee schedules are removed so
-- an employee without an explicitly configured schedule is treated as unavailable.

delete from public.employee_default_schedule
where (
  day_of_week between 1 and 6
  and is_working = true
  and start_time = '08:00'::time
  and end_time = '20:00'::time
)
or (
  day_of_week = 0
  and is_working = false
  and start_time is null
  and end_time is null
);

create or replace function public.enforce_appointment_runtime_rules()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  effective_schedule record;
begin
  if new.status not in ('scheduled', 'confirmed', 'completed') then
    return new;
  end if;

  if new.employee_id is null then
    raise exception 'EMPLOYEE_NOT_WORKING';
  end if;

  select *
  into effective_schedule
  from public.get_employee_effective_schedule(new.employee_id, new.appointment_date)
  limit 1;

  if effective_schedule is null
     or effective_schedule.is_working is not true
     or effective_schedule.start_time is null
     or effective_schedule.end_time is null
     or new.start_time < effective_schedule.start_time
     or new.end_time > effective_schedule.end_time then
    raise exception 'EMPLOYEE_NOT_WORKING';
  end if;

  if exists (
    select 1
    from public.appointments existing
    where existing.organization_id = new.organization_id
      and existing.id <> new.id
      and existing.appointment_date = new.appointment_date
      and existing.employee_id = new.employee_id
      and existing.status in ('scheduled', 'confirmed', 'completed')
      and new.start_time < existing.end_time
      and existing.start_time < new.end_time
  ) then
    raise exception 'EMPLOYEE_APPOINTMENT_OVERLAP';
  end if;

  if new.room_id is not null and exists (
    select 1
    from public.appointments existing
    where existing.organization_id = new.organization_id
      and existing.id <> new.id
      and existing.appointment_date = new.appointment_date
      and existing.room_id = new.room_id
      and existing.status in ('scheduled', 'confirmed', 'completed')
      and new.start_time < existing.end_time
      and existing.start_time < new.end_time
  ) then
    raise exception 'ROOM_APPOINTMENT_OVERLAP';
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_enforce_runtime_rules on public.appointments;
create trigger appointments_enforce_runtime_rules
before insert or update of organization_id, employee_id, room_id, appointment_date, start_time, end_time, status
on public.appointments
for each row execute function public.enforce_appointment_runtime_rules();
