-- Add missing tenant-safe service <-> equipment mapping.
-- The settings UI and actions already expect this relation.

create table if not exists public.service_equipment (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (organization_id, service_id, equipment_id)
);

create index if not exists service_equipment_service_idx
  on public.service_equipment(organization_id, service_id);

create index if not exists service_equipment_equipment_idx
  on public.service_equipment(organization_id, equipment_id);

create or replace function public.validate_service_equipment_tenant_references()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.services s
    where s.id = new.service_id
      and s.organization_id = new.organization_id
  ) then
    raise exception 'Service does not belong to the selected organization';
  end if;

  if not exists (
    select 1
    from public.equipment e
    where e.id = new.equipment_id
      and e.organization_id = new.organization_id
  ) then
    raise exception 'Equipment does not belong to the selected organization';
  end if;

  return new;
end;
$$;

drop trigger if exists service_equipment_validate_tenant
  on public.service_equipment;
create trigger service_equipment_validate_tenant
before insert or update on public.service_equipment
for each row execute function public.validate_service_equipment_tenant_references();

alter table public.service_equipment enable row level security;

create policy "Members can view service equipment"
on public.service_equipment
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can manage service equipment"
on public.service_equipment
for all
to authenticated
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
