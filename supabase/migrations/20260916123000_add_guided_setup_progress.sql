-- Guided salon setup progress.
-- A paid salon can be led through a deliberate post-trial configuration checklist
-- without locking the tenant into the wizard. Progress is tenant-scoped and the
-- actual readiness checks continue to come from live salon data.

create table if not exists public.organization_setup_progress (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  source text not null default 'manual',
  confirmed_steps text[] not null default '{}'::text[],
  started_at timestamptz not null default now(),
  dismissed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  check (char_length(source) between 1 and 60)
);

create trigger organization_setup_progress_set_updated_at
before update on public.organization_setup_progress
for each row execute function public.set_updated_at();

alter table public.organization_setup_progress enable row level security;

create policy "Members can view guided setup progress"
on public.organization_setup_progress for select to authenticated
using (public.is_organization_member(organization_id));

create policy "Managers can manage guided setup progress"
on public.organization_setup_progress for all to authenticated
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

grant select, insert, update on public.organization_setup_progress to authenticated;
grant select, insert, update, delete on public.organization_setup_progress to service_role;

comment on table public.organization_setup_progress is
  'Tenant-visible progress for the guided salon setup shown after trial conversion or when started manually.';
comment on column public.organization_setup_progress.confirmed_steps is
  'Setup steps the salon administrator explicitly reviewed. Live readiness is checked separately from the underlying salon data.';
