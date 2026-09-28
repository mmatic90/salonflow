-- Allow public booking pages to resolve active organizations by slug.
-- Only SELECT is opened; writes remain protected by existing owner/admin policies.

drop policy if exists organizations_public_active_select on public.organizations;

create policy organizations_public_active_select
on public.organizations
for select
to anon
using (is_active = true);
