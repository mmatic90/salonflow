-- Tenant-aware audit log storage used by the dashboard, settings and client actions.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text,
  actor_display_name text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  entity_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_organization_created_at_idx
  on public.audit_logs (organization_id, created_at desc);

create index if not exists audit_logs_actor_user_id_idx
  on public.audit_logs (actor_user_id);

create index if not exists audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

alter table public.audit_logs enable row level security;

-- Recreate policies idempotently so the migration can be safely reapplied.
drop policy if exists "Organization members can read audit logs" on public.audit_logs;
create policy "Organization members can read audit logs"
  on public.audit_logs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members member
      where member.organization_id = audit_logs.organization_id
        and member.user_id = auth.uid()
        and member.is_active = true
    )
  );

drop policy if exists "Organization members can create audit logs" on public.audit_logs;
create policy "Organization members can create audit logs"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    actor_user_id = auth.uid()
    and exists (
      select 1
      from public.organization_members member
      where member.organization_id = audit_logs.organization_id
        and member.user_id = auth.uid()
        and member.is_active = true
    )
  );

-- Audit entries are intentionally immutable from the application.
revoke update, delete on public.audit_logs from authenticated;
grant select, insert on public.audit_logs to authenticated;
