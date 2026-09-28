-- SalonFlow multi-tenant appointments
-- Depends on organizations, organization_members, employees, clients, services and rooms.

create type public.appointment_status as enum (
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no_show'
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  employee_id uuid references public.employees(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  status public.appointment_status not null default 'scheduled',
  client_name text not null check (char_length(trim(client_name)) >= 1),
  client_phone text,
  client_email text,
  notes text,
  internal_notes text,
  source text not null default 'manual',
  total_price numeric(10,2) check (total_price is null or total_price >= 0),
  currency text not null default 'EUR',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null check (char_length(trim(service_name)) >= 1),
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10,2) check (price is null or price >= 0),
  currency text not null default 'EUR',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, sort_order)
);

create index appointments_organization_date_idx
  on public.appointments(organization_id, appointment_date);
create index appointments_employee_date_idx
  on public.appointments(organization_id, employee_id, appointment_date);
create index appointments_room_date_idx
  on public.appointments(organization_id, room_id, appointment_date);
create index appointments_client_idx
  on public.appointments(organization_id, client_id);
create index appointments_status_date_idx
  on public.appointments(organization_id, status, appointment_date);
create index appointment_services_organization_idx
  on public.appointment_services(organization_id);
create index appointment_services_appointment_idx
  on public.appointment_services(appointment_id);

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create trigger appointment_services_set_updated_at
before update on public.appointment_services
for each row execute function public.set_updated_at();

create or replace function public.validate_appointment_tenant_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.client_id is not null and not exists (
    select 1 from public.clients c
    where c.id = new.client_id and c.organization_id = new.organization_id
  ) then
    raise exception 'Client does not belong to the appointment organization';
  end if;

  if new.employee_id is not null and not exists (
    select 1 from public.employees e
    where e.id = new.employee_id and e.organization_id = new.organization_id
  ) then
    raise exception 'Employee does not belong to the appointment organization';
  end if;

  if new.room_id is not null and not exists (
    select 1 from public.rooms r
    where r.id = new.room_id and r.organization_id = new.organization_id
  ) then
    raise exception 'Room does not belong to the appointment organization';
  end if;

  return new;
end;
$$;

create trigger appointments_validate_tenant_references
before insert or update on public.appointments
for each row execute function public.validate_appointment_tenant_references();

create or replace function public.validate_appointment_service_tenant_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.appointments a
    where a.id = new.appointment_id and a.organization_id = new.organization_id
  ) then
    raise exception 'Appointment does not belong to the selected organization';
  end if;

  if new.service_id is not null and not exists (
    select 1 from public.services s
    where s.id = new.service_id and s.organization_id = new.organization_id
  ) then
    raise exception 'Service does not belong to the selected organization';
  end if;

  return new;
end;
$$;

create trigger appointment_services_validate_tenant_references
before insert or update on public.appointment_services
for each row execute function public.validate_appointment_service_tenant_references();
