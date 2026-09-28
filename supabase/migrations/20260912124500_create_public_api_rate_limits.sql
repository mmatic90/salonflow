-- Public API rate limiting storage for booking endpoints.

create table if not exists public.public_api_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  endpoint text not null,
  created_at timestamptz not null default now()
);

create index if not exists public_api_rate_limits_lookup_idx
  on public.public_api_rate_limits (ip_address, endpoint, created_at desc);

alter table public.public_api_rate_limits enable row level security;

-- No public policies are needed because this table is accessed through
-- the service-role admin client only.
