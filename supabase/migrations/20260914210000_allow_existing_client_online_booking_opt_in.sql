-- Allow a verified public online-booking opt-in to promote an existing client's
-- marketing preference from unknown -> allowed even when an employee accepts the
-- request. Explicit not_allowed remains sticky and cannot be overridden here.

create or replace function public.guard_client_marketing_preference_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_manager boolean := false;
  v_safe_email_reset boolean := false;
  v_verified_online_opt_in boolean := false;
begin
  if tg_op = 'UPDATE'
    and new.email is distinct from old.email
    and old.marketing_email_status = 'allowed'
  then
    new.marketing_email_status := 'unknown';
    new.marketing_email_consent_at := null;
    new.marketing_email_consent_source := null;
    new.marketing_email_source := 'manual';
    new.marketing_email_updated_at := now();
    new.marketing_email_updated_by := auth.uid();
    v_safe_email_reset := true;
  end if;

  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  v_is_manager := public.has_organization_role(
    new.organization_id,
    array['owner', 'admin', 'manager']::public.organization_role[]
  );

  if tg_op = 'INSERT' then
    if new.marketing_email_status = 'unknown' then
      return new;
    end if;

    if new.marketing_email_status = 'allowed'
      and new.marketing_email_source = 'online_booking'
      and new.marketing_email_consent_source = 'online_booking'
      and new.email is not null
      and exists (
        select 1
        from public.online_booking_requests request
        where request.organization_id = new.organization_id
          and lower(trim(request.client_email)) = lower(trim(new.email))
          and request.marketing_email_opt_in = true
          and request.marketing_email_opt_in_at is not null
          and request.marketing_email_opt_in_at = new.marketing_email_consent_at
          and request.status = 'pending'
      )
    then
      return new;
    end if;

    if v_is_manager then
      return new;
    end if;

    raise exception 'MARKETING_PREFERENCE_FORBIDDEN';
  end if;

  if v_safe_email_reset then
    return new;
  end if;

  if old.marketing_email_status = 'unknown'
    and new.marketing_email_status = 'allowed'
    and new.marketing_email_source = 'online_booking'
    and new.marketing_email_consent_source = 'online_booking'
    and new.email is not null
    and exists (
      select 1
      from public.online_booking_requests request
      where request.organization_id = new.organization_id
        and lower(trim(request.client_email)) = lower(trim(new.email))
        and request.marketing_email_opt_in = true
        and request.marketing_email_opt_in_at is not null
        and request.marketing_email_opt_in_at = new.marketing_email_consent_at
        and request.status = 'pending'
    )
  then
    v_verified_online_opt_in := true;
  end if;

  if v_verified_online_opt_in then
    return new;
  end if;

  if new.marketing_email_status is distinct from old.marketing_email_status
    or new.marketing_email_consent_at is distinct from old.marketing_email_consent_at
    or new.marketing_email_consent_source is distinct from old.marketing_email_consent_source
    or new.marketing_email_source is distinct from old.marketing_email_source
    or new.marketing_email_updated_by is distinct from old.marketing_email_updated_by
  then
    if v_is_manager then
      return new;
    end if;

    raise exception 'MARKETING_PREFERENCE_FORBIDDEN';
  end if;

  return new;
end;
$$;

comment on function public.guard_client_marketing_preference_mutation() is
  'Protects marketing preference mutations. Allows verified pending online-booking opt-in for unknown -> allowed on both new and existing clients, while explicit not_allowed remains sticky.';
