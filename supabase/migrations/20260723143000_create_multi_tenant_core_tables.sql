-- SalonFlow core multi-tenant tables
-- Depends on the organization foundation migration.

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  first_name text not null check (char_length(trim(first_name)) >= 1),
  last_name text,
  email text,
  phone text,
  color text not null default '#2563eb',
  job_title text,
  notes text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, email)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  category text,
  description text,
  duration_minutes integer not null check (duration_minutes > 0),
  cleanup_minutes integer not null default 0 check (cleanup_minutes >= 0),
  price numeric(10,2) check (price is null or price >= 0),
  currency text not null default 'EUR',
  color text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) >= 1),
  last_name text,
  email text,
  phone text,
  date_of_birth date,
  notes text,
  marketing_consent boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  description text,
  capacity integer not null default 1 check (capacity > 0),
  color text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 1),
  description text,
  quantity_total integer not null default 1 check (quantity_total > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create index employees_organization_id_idx on public.employees(organization_id);
create index employees_user_id_idx on public.employees(user_id);
create index services_organization_id_idx on public.services(organization_id);
create index clients_organization_id_idx on public.clients(organization_id);
create index clients_phone_idx on public.clients(organization_id, phone);
create index clients_email_idx on public.clients(organization_id, email);
create index rooms_organization_id_idx on public.rooms(organization_id);
create index equipment_organization_id_idx on public.equipment(organization_id);

create trigger employees_set_updated_at before update on public.employees
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients
for each row execute function public.set_updated_at();
create trigger rooms_set_updated_at before update on public.rooms
for each row execute function public.set_updated_at();
create trigger equipment_set_updated_at before update on public.equipment
for each row execute function public.set_updated_at();
