-- Public booking data is now served through trusted server-side queries.
-- Anonymous clients must not read complete tenant rows directly because RLS
-- filters rows, not columns, and organizations now contain platform/billing data.

-- Organizations remain readable to authenticated members through the existing
-- membership policy. Public pages resolve the salon server-side with the service role.
drop policy if exists organizations_public_active_select
on public.organizations;

drop policy if exists organizations_public_workspace_lifecycle_access
on public.organizations;

-- Services remain readable to authenticated organization members through the
-- existing tenant policy. Public pages receive only the explicitly selected
-- public fields from trusted server-side queries.
drop policy if exists services_public_online_select
on public.services;
