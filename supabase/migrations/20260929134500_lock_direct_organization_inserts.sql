-- Complete the private-pilot organization provisioning lock.
-- The legacy foundation still allows authenticated users to insert organization rows
-- directly when created_by = auth.uid(). Current tenant provisioning is controlled by
-- the Platform Admin Sales Trial flow and uses the service-role client, which bypasses RLS.

drop policy if exists "Authenticated users can create organizations"
on public.organizations;
