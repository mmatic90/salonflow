-- Public booking requests are created by the trusted server-side booking API
-- using the service-role client. Browser clients do not need direct INSERT
-- access to online_booking_requests.
--
-- The previous anon/authenticated INSERT policy validated only that the service
-- belonged to the organization. Other related UUID columns (employee/room etc.)
-- could therefore be supplied directly to Supabase without the API's full
-- availability and tenant-consistency checks.

-- Remove direct client-side inserts and keep request creation behind the
-- server-side booking flow, which re-validates the selected slot before insert.
drop policy if exists online_booking_requests_public_insert
on public.online_booking_requests;
