-- Tenant-aware automated Google review request foundation.
-- Review requests are Pro/Trial email automations and intentionally reuse the
-- existing SalonFlow managed-email quota/provider layer.

create table public.organization_review_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  enabled boolean not null default false,
  google_review_url text,
  delay_hours integer not null default 24
    check (delay_hours in (2, 24)),
  enabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    google_review_url is null
    or (
      char_length(google_review_url) <= 2048
      and google_review_url ~* '^https://([a-z0-9-]+\.)*(google\.[a-z.]+|g\.page|goo\.gl)([:/]|$)'
    )
  ),
  check (enabled = false or google_review_url is not null)
);

insert into public.organization_review_settings (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

create or replace function public.ensure_organization_review_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_review_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

create trigger organizations_create_review_settings
after insert on public.organizations
for each row execute function public.ensure_organization_review_settings();

create or replace function public.normalize_organization_review_settings()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.enabled = false then
    new.enabled_at := null;
  elsif tg_op = 'INSERT' then
    new.enabled_at := coalesce(new.enabled_at, now());
  elsif old.enabled = false then
    new.enabled_at := now();
  else
    -- While enabled, preserve the original activation boundary even if a
    -- tenant attempts to submit a different timestamp directly through the API.
    new.enabled_at := old.enabled_at;
  end if;

  return new;
end;
$$;

create trigger organization_review_settings_normalize
before insert or update on public.organization_review_settings
for each row execute function public.normalize_organization_review_settings();

create trigger organization_review_settings_set_updated_at
before update on public.organization_review_settings
for each row execute function public.set_updated_at();

alter table public.organization_review_settings enable row level security;

create policy "Managers can view organization review settings"
on public.organization_review_settings
for select
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);

create policy "Managers can update organization review settings"
on public.organization_review_settings
for update
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
)
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
);

alter table public.appointments
  add column if not exists review_request_sent_at timestamptz,
  add column if not exists review_request_error text,
  add column if not exists review_request_claimed_at timestamptz,
  add column if not exists review_request_attempt_count integer not null default 0
    check (review_request_attempt_count >= 0),
  add column if not exists review_request_last_attempt_at timestamptz;

create or replace function public.appointments_reset_review_request_retry()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.client_email is distinct from new.client_email
     and new.review_request_sent_at is null then
    new.review_request_error := null;
    new.review_request_claimed_at := null;
    new.review_request_attempt_count := 0;
    new.review_request_last_attempt_at := null;
  end if;

  return new;
end;
$$;

create trigger appointments_reset_review_request_retry
before update of client_email on public.appointments
for each row execute function public.appointments_reset_review_request_retry();

create index if not exists appointments_pending_review_request_idx
on public.appointments (organization_id, appointment_date)
where status = 'completed'
  and client_email is not null
  and review_request_sent_at is null
  and review_request_attempt_count < 3;

create or replace function public.claim_appointment_review_request(
  p_appointment_id uuid,
  p_organization_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed uuid;
begin
  update public.appointments
  set
    review_request_claimed_at = now(),
    review_request_attempt_count = review_request_attempt_count + 1,
    review_request_last_attempt_at = now()
  where id = p_appointment_id
    and organization_id = p_organization_id
    and status = 'completed'
    and client_email is not null
    and review_request_sent_at is null
    and review_request_attempt_count < 3
    and (
      review_request_last_attempt_at is null
      or review_request_last_attempt_at < now() - interval '1 hour'
    )
    and (
      review_request_claimed_at is null
      or review_request_claimed_at < now() - interval '15 minutes'
    )
  returning id into v_claimed;

  return v_claimed is not null;
end;
$$;

revoke all on function public.ensure_organization_review_settings()
from public, anon, authenticated;

revoke all on function public.claim_appointment_review_request(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.claim_appointment_review_request(uuid, uuid)
to service_role;

comment on table public.organization_review_settings is
  'Tenant Google review automation settings. Review requests are opt-in and Pro/Trial gated by the application.';
comment on column public.organization_review_settings.enabled_at is
  'Timestamp of the latest transition from disabled to enabled; prevents retroactive review requests for older visits.';
comment on column public.appointments.review_request_claimed_at is
  'Short-lived delivery claim used to prevent duplicate review-request sends during overlapping cron executions.';
comment on column public.appointments.review_request_attempt_count is
  'Maximum-three-attempt retry counter for automated review-request delivery; client email changes reset unsent retry state.';
