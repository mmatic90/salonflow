-- SalonFlow no longer sends SMS messages. Keep phone numbers as salon/client
-- contact data, but remove SMS/Twilio delivery state from appointments.
-- This migration is safe whether or not the earlier mixed-channel reminder
-- migration was already applied.

drop trigger if exists appointments_reset_reminder_delivery
  on public.appointments;

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
    or (not old_active and new_active)
  then
    new.email_reminder_24h_sent_at := null;
    new.email_reminder_24h_error := null;
  end if;

  return new;
end;
$$;

create trigger appointments_reset_reminder_delivery
before update on public.appointments
for each row execute function public.reset_appointment_reminder_delivery_on_change();

alter table public.appointments
  drop column if exists sms_reminder_24h_sent_at,
  drop column if exists sms_reminder_24h_error,
  drop column if exists twilio_created_sms_sid,
  drop column if exists twilio_reminder_24h_sid,
  drop column if exists reminder_24h_scheduled_at;
