-- SalonFlow platform-admin foundation.
-- Platform administrators are explicitly assigned and are not inferred from salon ownership.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

drop policy if exists "Platform admins can verify themselves"
  on public.platform_admins;
create policy "Platform admins can verify themselves"
on public.platform_admins
for select
to authenticated
using (user_id = auth.uid());

-- No client-side INSERT/UPDATE/DELETE policies are intentionally provided.
-- Platform-admin membership is maintained from the database/service-role side only.

-- Bootstrap only the owner of the existing Demo Salon used by this installation.
-- Future salon owners are never promoted to platform admin automatically.
do $$
declare
  bootstrap_user_id uuid;
  bootstrap_display_name text;
begin
  if not exists (select 1 from public.platform_admins) then
    select member.user_id, member.display_name
      into bootstrap_user_id, bootstrap_display_name
    from public.organization_members member
    join public.organizations organization
      on organization.id = member.organization_id
    where organization.id = '7042e15c-1a1e-44e5-991e-bb8aa6266c08'::uuid
      and organization.name = 'Demo Salon'
      and member.is_active = true
      and member.role = 'owner'::public.organization_role
    order by member.created_at asc
    limit 1;

    if bootstrap_user_id is not null then
      insert into public.platform_admins (user_id, display_name)
      values (bootstrap_user_id, bootstrap_display_name)
      on conflict (user_id) do nothing;
    end if;
  end if;
end;
$$;

alter table public.feedback
  add column if not exists organization_id uuid references public.organizations(id) on delete set null,
  add column if not exists organization_name text;

create index if not exists feedback_organization_id_idx
  on public.feedback(organization_id);

-- Existing feedback predates tenant attribution. Backfill only when the database
-- has exactly one organization, so we never guess across multiple tenants.
do $$
declare
  organization_count integer;
  only_organization_id uuid;
  only_organization_name text;
begin
  select count(*) into organization_count from public.organizations;

  if organization_count = 1 then
    select id, name
      into only_organization_id, only_organization_name
    from public.organizations
    limit 1;

    update public.feedback
    set
      organization_id = coalesce(organization_id, only_organization_id),
      organization_name = coalesce(organization_name, only_organization_name)
    where organization_id is null
       or organization_name is null;
  end if;
end;
$$;

comment on table public.platform_admins is
  'Explicit SalonFlow platform administrators. Salon owners are not platform administrators by default.';
comment on column public.feedback.organization_id is
  'Tenant that submitted the feedback. Nullable to preserve feedback if a tenant is removed.';
comment on column public.feedback.organization_name is
  'Salon name snapshot captured when feedback is submitted.';
