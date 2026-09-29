-- MiT Salon SECURITY DEFINER trigger/event-trigger hardening.
-- These functions are invoked by database triggers/event triggers and do not need
-- direct execution from anonymous or authenticated API clients.

revoke execute on function public.ensure_client_marketing_unsubscribe_token()
from public, anon, authenticated;

revoke execute on function public.ensure_retention_automation_settings()
from public, anon, authenticated;

revoke execute on function public.guard_client_marketing_preference_mutation()
from public, anon, authenticated;

revoke execute on function public.normalize_client_marketing_email_preference()
from public, anon, authenticated;

revoke execute on function public.normalize_retention_automation_settings()
from public, anon, authenticated;

revoke execute on function public.record_client_marketing_preference_event()
from public, anon, authenticated;

revoke execute on function public.rls_auto_enable()
from public, anon, authenticated;

revoke execute on function public.sync_waitlist_opportunities_from_appointment()
from public, anon, authenticated;

comment on function public.ensure_client_marketing_unsubscribe_token() is
  'Trigger-only helper. Direct API execution is disabled.';
comment on function public.ensure_retention_automation_settings() is
  'Trigger-only helper. Direct API execution is disabled.';
comment on function public.guard_client_marketing_preference_mutation() is
  'Trigger-only helper. Direct API execution is disabled.';
comment on function public.normalize_client_marketing_email_preference() is
  'Trigger-only helper. Direct API execution is disabled.';
comment on function public.normalize_retention_automation_settings() is
  'Trigger-only helper. Direct API execution is disabled.';
comment on function public.record_client_marketing_preference_event() is
  'Trigger-only helper. Direct API execution is disabled.';
comment on function public.rls_auto_enable() is
  'Event-trigger-only helper. Direct API execution is disabled.';
comment on function public.sync_waitlist_opportunities_from_appointment() is
  'Trigger-only helper. Direct API execution is disabled.';
