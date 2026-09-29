-- MiT Salon SECURITY DEFINER execute-surface hardening.
-- Public booking now resolves tenant data through trusted server-side service-role
-- queries, so anonymous clients no longer need direct EXECUTE access to the
-- lifecycle/plan/role helper functions used by authenticated tenant RLS.

revoke execute on function public.has_organization_role(uuid, public.organization_role[])
from public, anon;
grant execute on function public.has_organization_role(uuid, public.organization_role[])
to authenticated, service_role;

revoke execute on function public.organization_has_minimum_plan(uuid, text)
from public, anon;
grant execute on function public.organization_has_minimum_plan(uuid, text)
to authenticated, service_role;

revoke execute on function public.organization_workspace_accessible(uuid)
from public, anon;
grant execute on function public.organization_workspace_accessible(uuid)
to authenticated, service_role;

comment on function public.has_organization_role(uuid, public.organization_role[]) is
  'Authenticated tenant role/lifecycle RLS helper. Anonymous/public direct execution is disabled.';

comment on function public.organization_has_minimum_plan(uuid, text) is
  'Authenticated tenant plan/lifecycle RLS helper. Anonymous/public direct execution is disabled.';

comment on function public.organization_workspace_accessible(uuid) is
  'Tenant lifecycle RLS helper used by authenticated workspace access and privileged server-side operations. Anonymous/public direct execution is disabled.';
