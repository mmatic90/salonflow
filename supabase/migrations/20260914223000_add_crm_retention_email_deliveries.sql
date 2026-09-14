-- Pro CRM manual follow-up email delivery ledger.
-- One mutable delivery row is kept per deterministic retention signal generation.
-- Successful delivery is permanent/deduplicated; failed/skipped rows may be retried manually.

create table public.crm_retention_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  signal_key text not null,
  reason_code text not null
    check (reason_code in (
      'overdue_cadence',
      'inactive_client',
      'no_future_booking',
      'attendance_risk'
    )),
  status text not null
    check (status in ('processing', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  failure_reason text,
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, signal_key),
  check (char_length(signal_key) between 1 and 220),
  check (
    (status = 'sent' and sent_at is not null)
    or (status <> 'sent' and sent_at is null)
  )
);

create index crm_retention_email_deliveries_org_updated_idx
on public.crm_retention_email_deliveries (organization_id, updated_at desc);

create index crm_retention_email_deliveries_client_idx
on public.crm_retention_email_deliveries (organization_id, client_id, updated_at desc);

alter table public.crm_retention_email_deliveries enable row level security;

create policy "Pro managers can view retention email deliveries"
on public.crm_retention_email_deliveries
for select
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
);

grant select on public.crm_retention_email_deliveries to authenticated;
revoke insert, update, delete on public.crm_retention_email_deliveries from anon, authenticated;
grant select, insert, update, delete on public.crm_retention_email_deliveries to service_role;

create or replace function public.claim_crm_retention_email_delivery(
  p_organization_id uuid,
  p_client_id uuid,
  p_signal_key text,
  p_reason_code text,
  p_initiated_by uuid
)
returns table (
  allowed boolean,
  reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.crm_retention_email_deliveries%rowtype;
begin
  if p_signal_key is null or char_length(p_signal_key) < 1 or char_length(p_signal_key) > 220 then
    return query select false, 'invalid_signal'::text;
    return;
  end if;

  if p_reason_code not in (
    'overdue_cadence',
    'inactive_client',
    'no_future_booking',
    'attendance_risk'
  ) then
    return query select false, 'invalid_reason'::text;
    return;
  end if;

  if not exists (
    select 1
    from public.clients c
    where c.id = p_client_id
      and c.organization_id = p_organization_id
      and c.is_active = true
  ) then
    return query select false, 'missing_client'::text;
    return;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_organization_id::text || ':' || p_signal_key, 0)
  );

  select *
  into v_row
  from public.crm_retention_email_deliveries d
  where d.organization_id = p_organization_id
    and d.signal_key = p_signal_key
  for update;

  if found then
    if v_row.status = 'sent' then
      return query select false, 'already_sent'::text;
      return;
    end if;

    if v_row.status = 'processing'
      and v_row.updated_at > now() - interval '10 minutes'
    then
      return query select false, 'in_progress'::text;
      return;
    end if;

    update public.crm_retention_email_deliveries
    set
      client_id = p_client_id,
      reason_code = p_reason_code,
      status = 'processing',
      attempt_count = attempt_count + 1,
      last_attempt_at = now(),
      sent_at = null,
      failure_reason = null,
      initiated_by = p_initiated_by,
      updated_at = now()
    where organization_id = p_organization_id
      and signal_key = p_signal_key;
  else
    insert into public.crm_retention_email_deliveries (
      organization_id,
      client_id,
      signal_key,
      reason_code,
      status,
      attempt_count,
      last_attempt_at,
      initiated_by
    ) values (
      p_organization_id,
      p_client_id,
      p_signal_key,
      p_reason_code,
      'processing',
      1,
      now(),
      p_initiated_by
    );
  end if;

  return query select true, 'claimed'::text;
end;
$$;

revoke all on function public.claim_crm_retention_email_delivery(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.claim_crm_retention_email_delivery(uuid, uuid, text, text, uuid) to service_role;

create or replace function public.record_crm_retention_email_outcome(
  p_organization_id uuid,
  p_signal_key text,
  p_status text,
  p_failure_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery public.crm_retention_email_deliveries%rowtype;
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'INVALID_RETENTION_EMAIL_STATUS';
  end if;

  select *
  into v_delivery
  from public.crm_retention_email_deliveries d
  where d.organization_id = p_organization_id
    and d.signal_key = p_signal_key
  for update;

  if not found then
    raise exception 'RETENTION_EMAIL_DELIVERY_NOT_FOUND';
  end if;

  if v_delivery.status = 'sent' then
    return;
  end if;

  update public.crm_retention_email_deliveries
  set
    status = p_status,
    sent_at = case when p_status = 'sent' then now() else null end,
    failure_reason = case
      when p_status = 'sent' then null
      else left(coalesce(p_failure_reason, p_status), 240)
    end,
    updated_at = now()
  where id = v_delivery.id;

  if p_status = 'sent' then
    insert into public.crm_retention_actions (
      organization_id,
      client_id,
      signal_key,
      reason_code,
      action,
      snoozed_until,
      created_by
    )
    select
      v_delivery.organization_id,
      v_delivery.client_id,
      v_delivery.signal_key,
      v_delivery.reason_code,
      'contacted',
      null,
      v_delivery.initiated_by
    where not exists (
      select 1
      from public.crm_retention_actions a
      where a.organization_id = v_delivery.organization_id
        and a.signal_key = v_delivery.signal_key
        and a.action = 'contacted'
    );
  end if;
end;
$$;

revoke all on function public.record_crm_retention_email_outcome(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.record_crm_retention_email_outcome(uuid, text, text, text) to service_role;

comment on table public.crm_retention_email_deliveries is
  'Pro CRM marketing follow-up delivery state. One row per deterministic retention signal; successful sends are deduplicated while failed/skipped attempts may be retried.';
comment on column public.crm_retention_email_deliveries.failure_reason is
  'Short internal delivery/eligibility code only; never store provider secrets or message content here.';
