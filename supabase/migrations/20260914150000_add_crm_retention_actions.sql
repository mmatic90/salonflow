-- Pro CRM retention action queue history.
-- The queue itself is derived from current tenant CRM/appointment signals;
-- this table stores append-only operator decisions so handled signals do not
-- continuously reappear and snoozed signals can return later.

create table public.crm_retention_actions (
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
  action text not null
    check (action in ('contacted', 'snoozed', 'resolved', 'ignored')),
  snoozed_until date,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (action = 'snoozed' and snoozed_until is not null)
    or (action <> 'snoozed' and snoozed_until is null)
  ),
  check (char_length(signal_key) between 1 and 220)
);

create index crm_retention_actions_org_created_idx
on public.crm_retention_actions (organization_id, created_at desc);

create index crm_retention_actions_signal_idx
on public.crm_retention_actions (organization_id, signal_key, created_at desc);

create index crm_retention_actions_client_idx
on public.crm_retention_actions (organization_id, client_id, created_at desc);

alter table public.crm_retention_actions enable row level security;

create policy "Pro managers can view retention actions"
on public.crm_retention_actions
for select
to authenticated
using (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
);

create policy "Pro managers can create retention actions"
on public.crm_retention_actions
for insert
to authenticated
with check (
  public.has_organization_role(
    organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  )
  and public.organization_has_minimum_plan(organization_id, 'pro')
  and created_by = auth.uid()
  and exists (
    select 1
    from public.clients c
    where c.id = client_id
      and c.organization_id = organization_id
  )
);

comment on table public.crm_retention_actions is
  'Append-only Pro CRM retention workflow history. Queue candidates are derived from current tenant CRM signals; handled/snoozed state is recorded here.';
comment on column public.crm_retention_actions.signal_key is
  'Deterministic signal generation key. New client activity produces a new key, while handled historical generations remain suppressed.';
