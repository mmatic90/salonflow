-- Make public API rate-limit consumption atomic so concurrent requests cannot
-- all pass a count-then-insert race. This helper is service-role only because
-- public endpoints consume it through the server-side admin client.

create index if not exists public_api_rate_limits_lookup_idx
on public.public_api_rate_limits (endpoint, ip_address, created_at desc);

create or replace function public.consume_public_api_rate_limit(
  p_ip_address text,
  p_endpoint text,
  p_limit integer,
  p_window_minutes integer
)
returns table (
  allowed boolean,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_lock_key bigint;
begin
  if coalesce(trim(p_ip_address), '') = '' then
    raise exception 'p_ip_address is required';
  end if;

  if coalesce(trim(p_endpoint), '') = '' then
    raise exception 'p_endpoint is required';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'p_limit must be greater than zero';
  end if;

  if p_window_minutes is null or p_window_minutes <= 0 then
    raise exception 'p_window_minutes must be greater than zero';
  end if;

  v_lock_key := hashtextextended(trim(p_endpoint) || ':' || trim(p_ip_address), 0);
  perform pg_advisory_xact_lock(v_lock_key);

  select count(*)::integer
  into v_count
  from public.public_api_rate_limits
  where ip_address = trim(p_ip_address)
    and endpoint = trim(p_endpoint)
    and created_at >= now() - make_interval(mins => p_window_minutes);

  if v_count >= p_limit then
    return query select false, 0;
    return;
  end if;

  insert into public.public_api_rate_limits (ip_address, endpoint)
  values (trim(p_ip_address), trim(p_endpoint));

  return query select true, greatest(p_limit - v_count - 1, 0);
end;
$$;

revoke all on function public.consume_public_api_rate_limit(text, text, integer, integer)
from public, anon, authenticated;

grant execute on function public.consume_public_api_rate_limit(text, text, integer, integer)
to service_role;

comment on function public.consume_public_api_rate_limit(text, text, integer, integer) is
  'Atomically checks and consumes one public API rate-limit attempt. Service-role only.';
