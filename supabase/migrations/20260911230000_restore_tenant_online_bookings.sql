-- SalonFlow tenant-aware online booking foundation
-- Restores the legacy online booking feature on top of the multi-tenant schema.

alter table public.services
  add column if not exists is_online_bookable boolean not null default false;

create table if not exists public.online_booking_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete restrict,
  requested_date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  suggested_employee_id uuid references public.employees(id) on delete set null,
  suggested_room_id uuid references public.rooms(id) on delete set null,
  final_employee_id uuid references public.employees(id) on delete set null,
  final_room_id uuid references public.rooms(id) on delete set null,
  final_duration_minutes integer check (final_duration_minutes is null or final_duration_minutes > 0),
  client_full_name text not null,
  client_phone text,
  client_email text,
  client_note text,
  language text not null default 'hr',
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  rejection_reason text,
  rejection_message text,
  appointment_id uuid references public.appointments(id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_time > start_time)
);

alter table public.online_booking_requests
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists language text not null default 'hr',
  add column if not exists archived_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists rejection_reason text,
  add column if not exists rejection_message text,
  add column if not exists appointment_id uuid references public.appointments(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.online_booking_requests obr
set organization_id = s.organization_id
from public.services s
where obr.organization_id is null
  and obr.service_id = s.id;

create index if not exists online_booking_requests_org_created_idx
  on public.online_booking_requests(organization_id, created_at desc);
create index if not exists online_booking_requests_org_status_idx
  on public.online_booking_requests(organization_id, status);
create index if not exists online_booking_requests_org_requested_date_idx
  on public.online_booking_requests(organization_id, requested_date);

drop trigger if exists online_booking_requests_set_updated_at on public.online_booking_requests;
create trigger online_booking_requests_set_updated_at
before update on public.online_booking_requests
for each row execute function public.set_updated_at();

create or replace function public.online_booking_service_belongs_to_org(
  p_service_id uuid,
  p_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.services s
    where s.id = p_service_id
      and s.organization_id = p_organization_id
      and s.is_active = true
      and s.is_online_bookable = true
  );
$$;

alter table public.online_booking_requests enable row level security;

drop policy if exists online_booking_requests_member_select on public.online_booking_requests;
create policy online_booking_requests_member_select
on public.online_booking_requests
for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists online_booking_requests_member_update on public.online_booking_requests;
create policy online_booking_requests_member_update
on public.online_booking_requests
for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

drop policy if exists online_booking_requests_manager_delete on public.online_booking_requests;
create policy online_booking_requests_manager_delete
on public.online_booking_requests
for delete to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin','manager']::public.organization_role[]
  )
);

drop policy if exists online_booking_requests_public_insert on public.online_booking_requests;
create policy online_booking_requests_public_insert
on public.online_booking_requests
for insert to anon, authenticated
with check (
  organization_id is not null
  and public.online_booking_service_belongs_to_org(service_id, organization_id)
);

drop policy if exists services_public_online_select on public.services;
create policy services_public_online_select
on public.services
for select to anon
using (is_active = true and is_online_bookable = true);
