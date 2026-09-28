-- Ensure authenticated appointment inserts satisfy the existing RLS policy
-- even when a caller omits created_by explicitly.

alter table public.appointments
  alter column created_by set default auth.uid();

comment on column public.appointments.created_by is
  'User who created the appointment. Defaults to the authenticated user for RLS-safe inserts.';
