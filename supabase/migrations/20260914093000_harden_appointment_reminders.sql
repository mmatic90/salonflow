-- SalonFlow tenant-aware appointment reminder foundation.
-- Reminder delivery is evaluated at send time so current tenant plan/lifecycle
-- is authoritative. Existing legacy Twilio scheduling columns are kept only for
-- compatibility and migration away from pre-scheduled reminder messages.

alter table public.appointments
  add column if not exists email_reminder_24h_sent_at timestamptz,
  add column if not exists email_reminder_24h_error text,
  add column if not exists sms_reminder_24h_sent_at timestamptz,
  add column if not exists sms_reminder_24h_error text,
  add column if not exists twilio_created_sms_sid text,
  add column if not exists twilio_reminder_24h_sid text,
  add column if not exists reminder_24h_scheduled_at timestamptz;

create index if not exists appointments_pending_reminder_idx
  on public.appointments(organization_id, appointment_date, start_time)
  where status in ('scheduled', 'confirmed');

-- If the actual appointment delivery target changes after a reminder was sent,
-- make the reminder eligible again. Routine edits (notes, room, employee, etc.)
-- do not reset delivery and therefore cannot accidentally send a duplicate.
create or replace function public.reset_appointment_reminder_delivery_on_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  old_active boolean := old.status in ('scheduled', 'confirmed');
  new_active boolean := new.status in ('scheduled', 'confirmed');
begin
  if
    old.appointment_date is distinct from new.appointment_date
    or old.start_time is distinct from new.start_time
    or old.client_email is distinct from new.client_email
    or old.client_phone is distinct from new.client_phone
    or (not old_active and new_active)
  then
    new.email_reminder_24h_sent_at := null;
    new.email_reminder_24h_error := null;
    new.sms_reminder_24h_sent_at := null;
    new.sms_reminder_24h_error := null;
  end if;

  return new;
end;
$$;

drop trigger if exists appointments_reset_reminder_delivery
  on public.appointments;
create trigger appointments_reset_reminder_delivery
before update on public.appointments
for each row execute function public.reset_appointment_reminder_delivery_on_change();

comment on column public.appointments.email_reminder_24h_sent_at is
  'Timestamp when the tenant-aware 24h email reminder was delivered.';
comment on column public.appointments.email_reminder_24h_error is
  'Most recent 24h email reminder delivery error, cleared after success or appointment target change.';
comment on column public.appointments.sms_reminder_24h_sent_at is
  'Timestamp when the tenant-aware 24h SMS reminder was delivered.';
comment on column public.appointments.sms_reminder_24h_error is
  'Most recent 24h SMS reminder delivery error, cleared after success or appointment target change.';
comment on column public.appointments.twilio_reminder_24h_sid is
  'Legacy pre-scheduled Twilio reminder SID. New reminders are evaluated and sent by the tenant-aware reminder cron.';
comment on column public.appointments.reminder_24h_scheduled_at is
  'Legacy pre-scheduled reminder timestamp retained while old Twilio schedules are retired.';
