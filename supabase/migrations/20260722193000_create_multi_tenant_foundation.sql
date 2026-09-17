-- SalonFlow multi-tenant foundation
-- Safe to run against a new Supabase project.

create extension if not exists pgcrypto;

create type public.organization_role as enum (
  'owner',
  'admin',
  'manager',
  'employee'
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  timezone text not null default 'Europe/Zagreb',
  locale text not null default 'hr',
  currency text not null default 'EUR',
  phone text,
  email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  postal_code text,
  country_code text not null default 'HR' check (char_length(country_code) = 2),
  logo_url text,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'employee',
  display_name text,
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_id_idx
  on public.organization_members(user_id);

create index organization_members_organization_id_idx
  on public.organization_members(organization_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.is_active = true
  );
$$;

create or replace function public.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members member
    where member.organization_id = target_organization_id
      and member.user_id = auth.uid()
      and member.is_active = true
      and member.role = any(allowed_roles)
  );
$$;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.has_organization_role(uuid, public.organization_role[]) to authenticated;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "Members can view their organizations"
on public.organizations
for select
to authenticated
using (public.is_organization_member(id));

create policy "Authenticated users can create organizations"
on public.organizations
for insert
to authenticated
with check (created_by = auth.uid());

create policy "Owners and admins can update organizations"
on public.organizations
for update
to authenticated
using (
  public.has_organization_role(
    id,
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    id,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "Owners can delete organizations"
on public.organizations
for delete
to authenticated
using (
  public.has_organization_role(
    id,
    array['owner']::public.organization_role[]
  )
);

create policy "Members can view memberships in their organizations"
on public.organization_members
for select
to authenticated
using (public.is_organization_member(organization_id));

create policy "Owners and admins can add members"
on public.organization_members
for insert
to authenticated
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "Owners and admins can update members"
on public.organization_members
for update
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy "Owners and admins can remove members"
on public.organization_members
for delete
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin']::public.organization_role[]
  )
);

create or replace function public.create_organization_with_owner(
  organization_name text,
  organization_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := trim(organization_name);
  normalized_slug text := lower(trim(organization_slug));
  new_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if char_length(normalized_name) < 2 then
    raise exception 'Organization name must contain at least 2 characters';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Organization slug is invalid';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (normalized_name, normalized_slug, current_user_id)
  returning id into new_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role
  )
  values (
    new_organization_id,
    current_user_id,
    'owner'
  );

  return new_organization_id;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text) from public;
grant execute on function public.create_organization_with_owner(text, text)
to authenticated;
