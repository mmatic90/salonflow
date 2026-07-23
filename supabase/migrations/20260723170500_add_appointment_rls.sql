-- SalonFlow appointment RLS

alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;

create policy "Members can view appointments"
on public.appointments
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Members can create appointments"
on public.appointments
for insert
to authenticated
with check (
  public.is_organization_member(organization_id)
  and created_by = auth.uid()
);

create policy "Members can update appointments"
on public.appointments
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "Managers can delete appointments"
on public.appointments
for delete
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);

create policy "Members can view appointment services"
on public.appointment_services
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Members can create appointment services"
on public.appointment_services
for insert
to authenticated
with check (public.is_organization_member(organization_id));

create policy "Members can update appointment services"
on public.appointment_services
for update
to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));

create policy "Members can delete appointment services"
on public.appointment_services
for delete
to authenticated
using (public.is_organization_member(organization_id));
