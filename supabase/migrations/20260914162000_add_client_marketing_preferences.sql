-- Communication preferences / marketing consent foundation.
-- Operational appointment email remains separate from optional marketing/retention email.

alter table public.clients
  add column if not exists marketing_email_status text not null default 'unknown',
  add column if not exists marketing_email_consent_at timestamptz,
  add column if not exists marketing_email_consent_source text,
  add column if not exists marketing_email_source text not null default 'manual',
  add column if not exists marketing_email_updated_at timestamptz not null default now(),
  add column if not exists marketing_email_updated_by uuid references auth.users(id) on delete set null;

alter table public.clients
  drop constraint if exists clients_marketing_email_status_check,
  add constraint clients_marketing_email_status_check
    check (marketing_email_status in ('unknown', 'allowed', 'not_allowed')),
  drop constraint if exists clients_marketing_email_source_check,
  add constraint clients_marketing_email_source_check
    check (marketing_email_source in ('manual', 'online_booking', 'unsubscribe', 'import', 'legacy')),
  drop constraint if exists clients_marketing_email_consent_source_check,
  add constraint clients_marketing_email_consent_source_check
    check (
      marketing_email_consent_source is null
      or marketing_email_consent_source in ('manual', 'online_booking', 'import', 'legacy')
    ),
  drop constraint if exists clients_marketing_email_consent_consistency_check,
  add constraint clients_marketing_email_consent_consistency_check
    check (
      (marketing_email_status = 'allowed'
        and marketing_email_consent_at is not null
        and marketing_email_consent_source is not null)
      or
      (marketing_email_status <> 'allowed'
        and marketing_email_consent_at is null
        and marketing_email_consent_source is null)
    );

-- Preserve the meaning of the legacy boolean conservatively. The old false
-- default is not treated as an explicit refusal.
update public.clients
set
  marketing_email_status = case when marketing_consent then 'allowed' else 'unknown' end,
  marketing_email_consent_at = case
    when marketing_consent then coalesce(updated_at, created_at, now())
    else null
  end,
  marketing_email_consent_source = case when marketing_consent then 'legacy' else null end,
  marketing_email_source = 'legacy',
  marketing_email_updated_at = coalesce(updated_at, created_at, now()),
  marketing_email_updated_by = null;

create table if not exists public.client_marketing_preference_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  previous_status text
    check (previous_status is null or previous_status in ('unknown', 'allowed', 'not_allowed')),
  new_status text not null
    check (new_status in ('unknown', 'allowed', 'not_allowed')),
  source text not null
    check (source in ('manual', 'online_booking', 'unsubscribe', 'import', 'legacy')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists client_marketing_preference_events_client_idx
on public.client_marketing_preference_events (organization_id, client_id, created_at desc);

alter table public.client_marketing_preference_events enable row level security;

drop policy if exists client_marketing_preference_events_member_select
on public.client_marketing_preference_events;
create policy client_marketing_preference_events_member_select
on public.client_marketing_preference_events
for select to authenticated
using (public.is_organization_member(organization_id));

grant select on public.client_marketing_preference_events to authenticated;
revoke insert, update, delete on public.client_marketing_preference_events from authenticated, anon;

create table if not exists public.client_marketing_unsubscribe_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null unique references public.clients(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create index if not exists client_marketing_unsubscribe_tokens_org_idx
on public.client_marketing_unsubscribe_tokens (organization_id);

alter table public.client_marketing_unsubscribe_tokens enable row level security;
revoke all on public.client_marketing_unsubscribe_tokens from anon, authenticated;
grant select, insert, update, delete on public.client_marketing_unsubscribe_tokens to service_role;

insert into public.client_marketing_unsubscribe_tokens (organization_id, client_id)
select c.organization_id, c.id
from public.clients c
on conflict (client_id) do nothing;

-- Keep the deprecated marketing_consent boolean synchronized while newer code
-- migrates to the richer status model.
create or replace function public.normalize_client_marketing_email_preference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.marketing_email_status is distinct from old.marketing_email_status then
    new.marketing_email_updated_at := now();
  end if;

  if new.marketing_email_status = 'allowed' then
    new.marketing_email_consent_at := coalesce(new.marketing_email_consent_at, now());
    new.marketing_email_consent_source := coalesce(
      new.marketing_email_consent_source,
      case
        when new.marketing_email_source in ('manual', 'online_booking', 'import', 'legacy')
          then new.marketing_email_source
        else 'manual'
      end
    );
  else
    new.marketing_email_consent_at := null;
    new.marketing_email_consent_source := null;
  end if;

  new.marketing_consent := (new.marketing_email_status = 'allowed');
  return new;
end;
$$;

drop trigger if exists clients_normalize_marketing_email_preference on public.clients;
create trigger clients_normalize_marketing_email_preference
before insert or update of marketing_email_status, marketing_email_consent_at,
  marketing_email_consent_source, marketing_email_source, marketing_email_updated_by
on public.clients
for each row execute function public.normalize_client_marketing_email_preference();

create or replace function public.record_client_marketing_preference_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.marketing_email_status = 'unknown' then
      return new;
    end if;

    insert into public.client_marketing_preference_events (
      organization_id,
      client_id,
      previous_status,
      new_status,
      source,
      created_by,
      created_at
    ) values (
      new.organization_id,
      new.id,
      null,
      new.marketing_email_status,
      new.marketing_email_source,
      new.marketing_email_updated_by,
      new.marketing_email_updated_at
    );
    return new;
  end if;

  if new.marketing_email_status is distinct from old.marketing_email_status then
    insert into public.client_marketing_preference_events (
      organization_id,
      client_id,
      previous_status,
      new_status,
      source,
      created_by,
      created_at
    ) values (
      new.organization_id,
      new.id,
      old.marketing_email_status,
      new.marketing_email_status,
      new.marketing_email_source,
      new.marketing_email_updated_by,
      new.marketing_email_updated_at
    );
  end if;

  return new;
end;
$$;

drop trigger if exists clients_record_marketing_preference_event on public.clients;
create trigger clients_record_marketing_preference_event
after insert or update of marketing_email_status
on public.clients
for each row execute function public.record_client_marketing_preference_event();

create or replace function public.ensure_client_marketing_unsubscribe_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.client_marketing_unsubscribe_tokens (organization_id, client_id)
  values (new.organization_id, new.id)
  on conflict (client_id) do nothing;
  return new;
end;
$$;

drop trigger if exists clients_ensure_marketing_unsubscribe_token on public.clients;
create trigger clients_ensure_marketing_unsubscribe_token
after insert on public.clients
for each row execute function public.ensure_client_marketing_unsubscribe_token();

-- Create a legacy event only for records that actually had a positive legacy consent.
insert into public.client_marketing_preference_events (
  organization_id,
  client_id,
  previous_status,
  new_status,
  source,
  created_by,
  created_at
)
select
  c.organization_id,
  c.id,
  'unknown',
  'allowed',
  'legacy',
  null,
  c.marketing_email_updated_at
from public.clients c
where c.marketing_email_status = 'allowed'
  and not exists (
    select 1
    from public.client_marketing_preference_events e
    where e.client_id = c.id
      and e.new_status = 'allowed'
      and e.source = 'legacy'
  );

alter table public.online_booking_requests
  add column if not exists marketing_email_opt_in boolean not null default false,
  add column if not exists marketing_email_opt_in_at timestamptz;

alter table public.online_booking_requests
  drop constraint if exists online_booking_requests_marketing_opt_in_consistency_check,
  add constraint online_booking_requests_marketing_opt_in_consistency_check
    check (
      (marketing_email_opt_in = true and marketing_email_opt_in_at is not null)
      or
      (marketing_email_opt_in = false and marketing_email_opt_in_at is null)
    );

comment on column public.clients.marketing_email_status is
  'Marketing/retention email preference only. Operational appointment emails are governed separately.';
comment on table public.client_marketing_preference_events is
  'Append-only history of explicit marketing email preference changes.';
comment on table public.client_marketing_unsubscribe_tokens is
  'Opaque public unsubscribe tokens. Tenant users cannot read these tokens directly.';
