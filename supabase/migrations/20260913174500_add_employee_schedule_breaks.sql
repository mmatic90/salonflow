-- Add one optional break interval to employee schedules and enforce it at DB level.
-- This supports split shifts such as 08:00-12:00 / break / 14:00-18:00.

alter table public.employee_default_schedule
  add column if not exists break_start_time time,
  add column if not exists break_end_time time;

alter table public.employee_schedule_overrides
  add column if not exists break_start_time time,
  add column if not exists break_end_time time;

alter table public.employee_default_schedule
  drop constraint if exists employee_default_schedule_break_check;

alter table public.employee_default_schedule
  add constraint employee_default_schedule_break_check
  check (
    (break_start_time is null and break_end_time is null)
    or (
      is_working
      and start_time is not null
      and end_time is not null
      and break_start_time is not null
      and break_end_time is not null
      and break_start_time > start_time
      and break_end_time > break_start_time
      and break_end_time < end_time
    )
  );

alter table public.employee_schedule_overrides
  drop constraint if exists employee_schedule_overrides_break_check;

alter table public.employee_schedule_overrides
  add constraint employee_schedule_overrides_break_check
  check (
    (break_start_time is null and break_end_time is null)
    or (
      is_working
      and start_time is not null
      and end_time is not null
      and break_start_time is not null
      and break_end_time is not null
      and break_start_time > start_time
      and break_end_time > break_start_time
      and break_end_time < end_time
    )
  );

create or replace function public.get_employee_effective_break(
  p_employee_id uuid,
  p_date date
)
returns table (
  break_start_time time,
  break_end_time time,
  schedule_source text
)
language sql
stable
security invoker
set search_path = public
as $$
  with employee_org as (
    select organization_id
    from public.employees
    where id = p_employee_id
  ),
  override_row as (
    select
      o.break_start_time,
      o.break_end_time,
      'override'::text as schedule_source
    from public.employee_schedule_overrides o
    join employee_org eo on eo.organization_id = o.organization_id
    where o.employee_id = p_employee_id
      and o.schedule_date = p_date
    limit 1
  ),
  default_row as (
    select
      d.break_start_time,
      d.break_end_time,
      'default'::text as schedule_source
    from public.employee_default_schedule d
    join employee_org eo on eo.organization_id = d.organization_id
    where d.employee_id = p_employee_id
      and d.day_of_week = extract(dow from p_date)::integer
    limit 1
  )
  select * from override_row
  union all
  select * from default_row
  where not exists (select 1 from override_row)
  limit 1;
$$;

grant execute on function public.get_employee_effective_break(uuid, date) to authenticated;

create or replace function public.enforce_appointment_runtime_rules()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  effective_schedule record;
  effective_break record;
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

  select *
  into effective_break
  from public.get_employee_effective_break(new.employee_id, new.appointment_date)
  limit 1;

  if effective_break is not null
     and effective_break.break_start_time is not null
     and effective_break.break_end_time is not null
     and new.start_time < effective_break.break_end_time
     and effective_break.break_start_time < new.end_time then
    raise exception 'EMPLOYEE_BREAK_OVERLAP';
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
