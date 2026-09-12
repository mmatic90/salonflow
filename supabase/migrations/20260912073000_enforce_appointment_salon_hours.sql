-- Enforce salon opening hours at the database boundary.
-- Active appointments can never be created or moved outside salon hours.

create or replace function public.enforce_appointment_salon_hours()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_day_of_week integer;
  v_opens_at time;
  v_closes_at time;
  v_is_closed boolean;
begin
  -- Cancelled/no-show/completed records may remain historically valid even if
  -- salon hours are changed later. Enforce only bookable active states.
  if new.status not in ('scheduled', 'confirmed') then
    return new;
  end if;

  v_day_of_week := extract(dow from new.appointment_date::date)::integer;

  select swh.opens_at, swh.closes_at, swh.is_closed
    into v_opens_at, v_closes_at, v_is_closed
  from public.salon_working_hours swh
  where swh.organization_id = new.organization_id
    and swh.day_of_week = v_day_of_week
  limit 1;

  if not found or coalesce(v_is_closed, true) then
    raise exception 'SALON_CLOSED';
  end if;

  if new.start_time < v_opens_at or new.end_time > v_closes_at then
    raise exception 'OUTSIDE_SALON_HOURS';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_appointment_salon_hours on public.appointments;

create trigger trg_enforce_appointment_salon_hours
before insert or update of
  organization_id,
  appointment_date,
  start_time,
  end_time,
  status
on public.appointments
for each row
execute function public.enforce_appointment_salon_hours();
