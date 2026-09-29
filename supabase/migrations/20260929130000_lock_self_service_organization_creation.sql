-- MiT Salon private-pilot hardening.
-- Organization provisioning is performed by the platform-admin Sales Trial flow.
-- Prevent authenticated browser clients from creating arbitrary tenant organizations
-- through the legacy onboarding RPC while keeping the function available to privileged
-- server-side roles if it is needed for controlled administration later.

revoke execute on function public.create_organization_with_owner(text, text)
from authenticated, anon, public;

grant execute on function public.create_organization_with_owner(text, text)
to service_role;

comment on function public.create_organization_with_owner(text, text) is
  'Privileged organization provisioning helper. Direct authenticated self-service organization creation is disabled; current tenant provisioning is controlled by the platform-admin Sales Trial flow.';
