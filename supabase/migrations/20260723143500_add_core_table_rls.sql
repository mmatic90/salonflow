-- Row Level Security for SalonFlow core tenant tables.

alter table public.employees enable row level security;
alter table public.services enable row level security;
alter table public.clients enable row level security;
alter table public.rooms enable row level security;
alter table public.equipment enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['employees', 'services', 'rooms', 'equipment']
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_organization_member(organization_id))',
      table_name || '_member_select',
      table_name
    );

    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.has_organization_role(organization_id, array[''owner'', ''admin'', ''manager'']::public.organization_role[]))',
      table_name || '_manager_insert',
      table_name
    );

    execute format(
      'create policy %I on public.%I for update to authenticated using (public.has_organization_role(organization_id, array[''owner'', ''admin'', ''manager'']::public.organization_role[])) with check (public.has_organization_role(organization_id, array[''owner'', ''admin'', ''manager'']::public.organization_role[]))',
      table_name || '_manager_update',
      table_name
    );

    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.has_organization_role(organization_id, array[''owner'', ''admin'', ''manager'']::public.organization_role[]))',
      table_name || '_manager_delete',
      table_name
    );
  end loop;
end;
$$;

create policy clients_member_select
on public.clients
for select to authenticated
using (public.is_organization_member(organization_id));

create policy clients_member_insert
on public.clients
for insert to authenticated
with check (public.is_organization_member(organization_id));

create policy clients_member_update
on public.clients
for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy clients_manager_delete
on public.clients
for delete to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);
