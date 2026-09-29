-- Feedback screenshots are uploaded only through the trusted server action
-- using the service-role client. Authenticated browser clients therefore do
-- not need direct INSERT access to the private feedback bucket.
--
-- Removing this policy prevents authenticated users from filling the bucket
-- with arbitrary files that are not tied to a feedback record.

drop policy if exists "Authenticated users can upload feedback screenshots"
on storage.objects;
