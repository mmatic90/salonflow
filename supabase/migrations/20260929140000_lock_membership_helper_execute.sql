-- MiT Salon SECURITY DEFINER execute-surface hardening.
-- is_organization_member is used by authenticated tenant RLS policies. Anonymous
-- callers have no valid auth.uid() membership context and do not need direct RPC
-- access to this helper.

revoke all on function public.is_organization_member(uuid)
from public, anon;

grant execute on function public.is_organization_member(uuid)
to authenticated;

comment on function public.is_organization_member(uuid) is
  'Authenticated tenant-membership RLS helper. Anonymous/public direct execution is disabled.';
