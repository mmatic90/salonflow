-- SalonFlow tenant-aware salon working hours

create table if not exists public.salon_working_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  opens_at time not null default '09:00',
  closes_at time not null default '19:00',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.salon_working_hours
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  only_org uuid;
begin
  if exists (
    select 1 from public.salon_working_hours where organization_id is null
  ) then
    select min(id)
    into only_org
    from public.organizations
    where is_active = true
    having count(*) = 1;

    if only_org is not null then
      update public.salon_working_hours
      set organization_id = only_org
      where organization_id is null;
    end if;
  end if;
end $$;

create unique index if not exists salon_working_hours_org_day_idx
  on public.salon_working_hours(organization_id, day_of_week)
  where organization_id is not null;

drop trigger if exists salon_working_hours_set_updated_at on public.salon_working_hours;
create trigger salon_working_hours_set_updated_at
before update on public.salon_working_hours
for each row execute function public.set_updated_at();

alter table public.salon_working_hours enable row level security;

drop policy if exists salon_working_hours_member_select on public.salon_working_hours;
create policy salon_working_hours_member_select
on public.salon_working_hours
for select to authenticated
using (public.is_organization_member(organization_id));

drop policy if exists salon_working_hours_manager_write on public.salon_working_hours;
create policy salon_working_hours_manager_write
on public.salon_working_hours
for all to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner','admin','manager']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner','admin','manager']::public.organization_role[]
  )
);

drop policy if exists salon_working_hours_public_select on public.salon_working_hours;
create policy salon_working_hours_public_select
on public.salon_working_hours
for select to anon
using (organization_id is not null);
