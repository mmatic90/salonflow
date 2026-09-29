-- MiT Salon online-booking security cleanup.
-- Direct public INSERT access to online_booking_requests was removed earlier,
-- so the SECURITY DEFINER helper that existed only to support that policy is
-- no longer needed. Removing it avoids leaving an unnecessary privileged
-- function callable through the database API surface.

drop function if exists public.online_booking_service_belongs_to_org(uuid, uuid);
