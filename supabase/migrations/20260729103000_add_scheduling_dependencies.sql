-- SalonFlow multi-tenant scheduling dependencies
-- Adds working hours, employee schedules, service mappings and SMS tracking
-- required by the appointment create/edit workflow.

alter table public.appointments
  add column if not exists twilio_created_sms_sid text,
  add column if not exists twilio_reminder_24h_sid text,
  add column if not exists reminder_24h_scheduled_at timestamptz;

create table if not exists public.salon_working_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time not null default '08:00',
  closes_at time not null default '20:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, day_of_week),
  check (is_closed or closes_at > opens_at)
);

create table if not exists public.employee_default_schedule (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  is_working boolean not null default true,
  start_time time,
  end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, day_of_week),
  check (
    (not is_working and start_time is null and end_time is null)
    or
    (is_working and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create table if not exists public.employee_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  schedule_date date not null,
  is_working boolean not null default false,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, schedule_date),
  check (
    (not is_working and start_time is null and end_time is null)
    or
    (is_working and start_time is not null and end_time is not null and end_time > start_time)
  )
);

create table if not exists public.employee_services (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, employee_id, service_id)
);

create table if not exists public.service_rooms (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, service_id, room_id)
);

create index if not exists salon_working_hours_org_idx
  on public.salon_working_hours(organization_id);
create index if not exists employee_default_schedule_org_employee_idx
  on public.employee_default_schedule(organization_id, employee_id);
create index if not exists employee_schedule_overrides_org_employee_date_idx
  on public.employee_schedule_overrides(organization_id, employee_id, schedule_date);
create index if not exists employee_services_employee_idx
  on public.employee_services(organization_id, employee_id);
create index if not exists employee_services_service_idx
  on public.employee_services(organization_id, service_id);
create index if not exists service_rooms_service_idx
  on public.service_rooms(organization_id, service_id);
create index if not exists service_rooms_room_idx
  on public.service_rooms(organization_id, room_id);

-- Protect tenant references even when IDs are supplied manually.
create or replace function public.validate_scheduling_tenant_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_table_name in ('employee_default_schedule', 'employee_schedule_overrides', 'employee_services') then
    if not exists (
      select 1 from public.employees e
      where e.id = new.employee_id and e.organization_id = new.organization_id
    ) then
      raise exception 'Employee does not belong to the selected organization';
    end if;
  end if;

  if tg_table_name in ('employee_services', 'service_rooms') then
    if not exists (
      select 1 from public.services s
      where s.id = new.service_id and s.organization_id = new.organization_id
    ) then
      raise exception 'Service does not belong to the selected organization';
    end if;
  end if;

  if tg_table_name = 'service_rooms' then
    if not exists (
      select 1 from public.rooms r
      where r.id = new.room_id and r.organization_id = new.organization_id
    ) then
      raise exception 'Room does not belong to the selected organization';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists employee_default_schedule_validate_tenant on public.employee_default_schedule;
create trigger employee_default_schedule_validate_tenant
before insert or update on public.employee_default_schedule
for each row execute function public.validate_scheduling_tenant_references();

drop trigger if exists employee_schedule_overrides_validate_tenant on public.employee_schedule_overrides;
create trigger employee_schedule_overrides_validate_tenant
before insert or update on public.employee_schedule_overrides
for each row execute function public.validate_scheduling_tenant_references();

drop trigger if exists employee_services_validate_tenant on public.employee_services;
create trigger employee_services_validate_tenant
before insert or update on public.employee_services
for each row execute function public.validate_scheduling_tenant_references();

drop trigger if exists service_rooms_validate_tenant on public.service_rooms;
create trigger service_rooms_validate_tenant
before insert or update on public.service_rooms
for each row execute function public.validate_scheduling_tenant_references();

create or replace function public.get_employee_effective_schedule(
  p_employee_id uuid,
  p_date date
)
returns table (
  is_working boolean,
  start_time time,
  end_time time,
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
      and public.is_organization_member(organization_id)
  ),
  override_row as (
    select o.is_working, o.start_time, o.end_time, 'override'::text as schedule_source
    from public.employee_schedule_overrides o
    join employee_org eo on eo.organization_id = o.organization_id
    where o.employee_id = p_employee_id
      and o.schedule_date = p_date
    limit 1
  ),
  default_row as (
    select d.is_working, d.start_time, d.end_time, 'default'::text as schedule_source
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

-- RLS
alter table public.salon_working_hours enable row level security;
alter table public.employee_default_schedule enable row level security;
alter table public.employee_schedule_overrides enable row level security;
alter table public.employee_services enable row level security;
alter table public.service_rooms enable row level security;

create policy "Members can view salon working hours"
on public.salon_working_hours for select to authenticated
using (public.is_organization_member(organization_id));
create policy "Managers can manage salon working hours"
on public.salon_working_hours for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]));

create policy "Members can view employee default schedules"
on public.employee_default_schedule for select to authenticated
using (public.is_organization_member(organization_id));
create policy "Managers can manage employee default schedules"
on public.employee_default_schedule for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]));

create policy "Members can view employee schedule overrides"
on public.employee_schedule_overrides for select to authenticated
using (public.is_organization_member(organization_id));
create policy "Managers can manage employee schedule overrides"
on public.employee_schedule_overrides for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]));

create policy "Members can view employee services"
on public.employee_services for select to authenticated
using (public.is_organization_member(organization_id));
create policy "Managers can manage employee services"
on public.employee_services for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]));

create policy "Members can view service rooms"
on public.service_rooms for select to authenticated
using (public.is_organization_member(organization_id));
create policy "Managers can manage service rooms"
on public.service_rooms for all to authenticated
using (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]))
with check (public.has_organization_role(organization_id, array['owner','admin','manager']::public.organization_role[]));

-- Seed usable defaults for organizations already created during development.
insert into public.salon_working_hours (
  organization_id, day_of_week, opens_at, closes_at, is_closed
)
select
  o.id,
  day_number,
  '08:00'::time,
  '20:00'::time,
  day_number = 0
from public.organizations o
cross join generate_series(0, 6) as day_number
on conflict (organization_id, day_of_week) do nothing;

insert into public.employee_default_schedule (
  organization_id, employee_id, day_of_week, is_working, start_time, end_time
)
select
  e.organization_id,
  e.id,
  day_number,
  day_number <> 0,
  case when day_number = 0 then null else '08:00'::time end,
  case when day_number = 0 then null else '20:00'::time end
from public.employees e
cross join generate_series(0, 6) as day_number
on conflict (employee_id, day_of_week) do nothing;

insert into public.employee_services (organization_id, employee_id, service_id)
select e.organization_id, e.id, s.id
from public.employees e
join public.services s on s.organization_id = e.organization_id
on conflict do nothing;

insert into public.service_rooms (organization_id, service_id, room_id)
select s.organization_id, s.id, r.id
from public.services s
join public.rooms r on r.organization_id = s.organization_id
on conflict do nothing;
