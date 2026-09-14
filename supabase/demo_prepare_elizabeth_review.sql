-- SalonFlow Elizabeth review preparation
-- MANUAL DEMO TOOL — NOT A MIGRATION.
--
-- This script is intentionally locked to the known Demo Salon tenant. It prepares
-- a deterministic, presentation-friendly state without rebuilding the rich demo
-- dataset or touching normal seeded clients/appointments outside the examples below.
--
-- Safe to rerun before a review. Do NOT reuse this file for a real tenant.

do $$
declare
  v_org_id uuid := '7042e15c-1a1e-44e5-991e-bb8aa6266c08';
  v_org_name text;

  v_marina_id uuid;
  v_lara_id uuid;
  v_ivan_id uuid;
  v_ana_id uuid;
  v_room_3_id uuid;
  v_massage_id uuid;
  v_hydra_id uuid;

  v_massage_name text;
  v_massage_duration integer;
  v_massage_price numeric(10,2);
  v_massage_currency text;

  v_week_monday date;
  v_date_1 date;
  v_date_2 date;
  v_appointment_id uuid;
begin
  -- Several integrity guards treat service_role as the trusted maintenance path.
  -- Supabase SQL Editor does not always expose auth.role(), so set the local JWT
  -- claim only for this transaction.
  perform set_config('request.jwt.claim.role', 'service_role', true);

  select o.name
  into v_org_name
  from public.organizations o
  where o.id = v_org_id;

  if v_org_name is null then
    raise exception 'Demo Salon organization % was not found.', v_org_id;
  end if;

  if v_org_name <> 'Demo Salon' then
    raise exception 'Refusing to run: organization % is named %, not Demo Salon.', v_org_id, v_org_name;
  end if;

  ------------------------------------------------------------------------------
  -- 1. Remove only temporary QA traces created during CRM follow-up testing.
  ------------------------------------------------------------------------------
  delete from public.appointments a
  where a.organization_id = v_org_id
    and (
      a.source in ('retention_followup_test', 'retention_automation_test')
      or a.client_id in (
        select c.id
        from public.clients c
        where c.organization_id = v_org_id
          and c.notes in (
            'SALONFLOW_RETENTION_FOLLOWUP_TEST',
            'SALONFLOW_RETENTION_AUTOMATION_TEST'
          )
      )
    );

  delete from public.clients c
  where c.organization_id = v_org_id
    and c.notes in (
      'SALONFLOW_RETENTION_FOLLOWUP_TEST',
      'SALONFLOW_RETENTION_AUTOMATION_TEST'
    );

  ------------------------------------------------------------------------------
  -- 2. Restore the commercial/demo-safe tenant state.
  ------------------------------------------------------------------------------
  update public.organizations
  set
    plan_code = 'pro',
    lifecycle_status = 'active',
    is_active = true,
    plan_changed_at = now()
  where id = v_org_id;

  insert into public.organization_email_settings (
    organization_id,
    managed_email_enabled
  )
  values (v_org_id, true)
  on conflict (organization_id) do update
  set managed_email_enabled = true;

  -- Keep a configured review URL/delay if present, but prevent a scheduled send
  -- from firing during the meeting.
  insert into public.organization_review_settings (
    organization_id,
    enabled,
    delay_hours
  )
  values (v_org_id, false, 24)
  on conflict (organization_id) do update
  set enabled = false;

  -- Automatic CRM follow-up must be OFF during the presentation. Reset the
  -- aggregate test-run state so the settings screen starts clean.
  insert into public.organization_retention_automation_settings (
    organization_id,
    enabled,
    daily_limit
  )
  values (v_org_id, false, 5)
  on conflict (organization_id) do nothing;

  update public.organization_retention_automation_settings
  set
    enabled = false,
    enabled_at = null,
    daily_limit = 5,
    last_run_local_date = null,
    last_run_at = null,
    last_run_status = 'never',
    last_run_candidates = 0,
    last_run_sent = 0,
    last_run_skipped = 0,
    last_run_failed = 0,
    last_run_error = null
  where organization_id = v_org_id;

  ------------------------------------------------------------------------------
  -- 3. Resolve the concrete demo records used by the presentation runbook.
  ------------------------------------------------------------------------------
  select c.id into v_marina_id
  from public.clients c
  where c.organization_id = v_org_id
    and c.first_name = 'Marina'
    and c.last_name = 'Vuković'
    and c.is_active = true
  limit 1;

  select c.id into v_lara_id
  from public.clients c
  where c.organization_id = v_org_id
    and c.first_name = 'Lara'
    and c.last_name = 'Božić'
    and c.is_active = true
  limit 1;

  select e.id into v_ivan_id
  from public.employees e
  where e.organization_id = v_org_id
    and e.first_name = 'Ivan'
    and e.last_name = 'Ivić'
    and e.is_active = true
  limit 1;

  select e.id into v_ana_id
  from public.employees e
  where e.organization_id = v_org_id
    and e.first_name = 'Ana'
    and e.last_name = 'Anić'
    and e.is_active = true
  limit 1;

  select r.id into v_room_3_id
  from public.rooms r
  where r.organization_id = v_org_id
    and r.name = 'Soba 3'
    and r.is_active = true
  limit 1;

  select s.id, s.name, s.duration_minutes, s.price, s.currency
  into v_massage_id, v_massage_name, v_massage_duration, v_massage_price, v_massage_currency
  from public.services s
  where s.organization_id = v_org_id
    and s.name = 'Relax masaža 60 min'
    and s.is_active = true
  limit 1;

  select s.id into v_hydra_id
  from public.services s
  where s.organization_id = v_org_id
    and s.name = 'Hydra Glow tretman lica'
    and s.is_active = true
  limit 1;

  if v_marina_id is null
     or v_lara_id is null
     or v_ivan_id is null
     or v_ana_id is null
     or v_room_3_id is null
     or v_massage_id is null
     or v_hydra_id is null then
    raise exception 'Required Instagram demo seed records are missing. Run the demo seeds before this preparation script.';
  end if;

  ------------------------------------------------------------------------------
  -- 4. Stage Marina Vuković as a deterministic CRM retention example.
  --
  -- Two completed visits, 13 and 7 weeks before the current week, produce a
  -- natural "no future appointment" retention signal without making her appear
  -- extremely inactive. Dates are outside the rich seed's -35 day history.
  ------------------------------------------------------------------------------
  delete from public.crm_retention_email_deliveries
  where organization_id = v_org_id
    and client_id = v_marina_id;

  delete from public.crm_retention_actions
  where organization_id = v_org_id
    and client_id = v_marina_id;

  delete from public.appointments
  where organization_id = v_org_id
    and client_id = v_marina_id;

  update public.clients
  set
    marketing_consent = true,
    marketing_email_status = 'allowed',
    marketing_email_consent_at = now(),
    marketing_email_consent_source = 'manual',
    marketing_email_source = 'manual',
    marketing_email_updated_at = now(),
    marketing_email_updated_by = null
  where id = v_marina_id
    and organization_id = v_org_id;

  v_week_monday := current_date - (extract(isodow from current_date)::integer - 1);
  v_date_1 := v_week_monday - 91;
  v_date_2 := v_week_monday - 49;

  insert into public.appointments (
    organization_id,
    client_id,
    employee_id,
    room_id,
    appointment_date,
    start_time,
    end_time,
    status,
    client_name,
    client_phone,
    client_email,
    notes,
    internal_notes,
    source,
    total_price,
    currency
  )
  select
    v_org_id,
    c.id,
    v_ivan_id,
    v_room_3_id,
    v_date_1,
    '18:00'::time,
    ('18:00'::time + make_interval(mins => v_massage_duration))::time,
    'completed'::public.appointment_status,
    trim(c.first_name || ' ' || coalesce(c.last_name, '')),
    c.phone,
    c.email,
    'Relax masaža — redovni dolazak.',
    null,
    'manual',
    v_massage_price,
    coalesce(v_massage_currency, 'EUR')
  from public.clients c
  where c.id = v_marina_id
  returning id into v_appointment_id;

  insert into public.appointment_services (
    organization_id,
    appointment_id,
    service_id,
    service_name,
    duration_minutes,
    price,
    currency,
    sort_order
  ) values (
    v_org_id,
    v_appointment_id,
    v_massage_id,
    v_massage_name,
    v_massage_duration,
    v_massage_price,
    coalesce(v_massage_currency, 'EUR'),
    0
  );

  insert into public.appointments (
    organization_id,
    client_id,
    employee_id,
    room_id,
    appointment_date,
    start_time,
    end_time,
    status,
    client_name,
    client_phone,
    client_email,
    notes,
    internal_notes,
    source,
    total_price,
    currency
  )
  select
    v_org_id,
    c.id,
    v_ivan_id,
    v_room_3_id,
    v_date_2,
    '18:00'::time,
    ('18:00'::time + make_interval(mins => v_massage_duration))::time,
    'completed'::public.appointment_status,
    trim(c.first_name || ' ' || coalesce(c.last_name, '')),
    c.phone,
    c.email,
    'Relax masaža — redovni dolazak.',
    null,
    'manual',
    v_massage_price,
    coalesce(v_massage_currency, 'EUR')
  from public.clients c
  where c.id = v_marina_id
  returning id into v_appointment_id;

  insert into public.appointment_services (
    organization_id,
    appointment_id,
    service_id,
    service_name,
    duration_minutes,
    price,
    currency,
    sort_order
  ) values (
    v_org_id,
    v_appointment_id,
    v_massage_id,
    v_massage_name,
    v_massage_duration,
    v_massage_price,
    coalesce(v_massage_currency, 'EUR'),
    0
  );

  ------------------------------------------------------------------------------
  -- 5. Stage Lara Božić as a natural waitlist example.
  ------------------------------------------------------------------------------
  delete from public.waitlist_entries
  where organization_id = v_org_id
    and client_id = v_lara_id
    and service_id = v_hydra_id
    and notes = 'Preferira raniji termin ako se oslobodi mjesto.';

  insert into public.waitlist_entries (
    organization_id,
    client_id,
    service_id,
    preferred_employee_id,
    preferred_date_from,
    preferred_date_to,
    preferred_time_from,
    preferred_time_to,
    notes,
    status
  ) values (
    v_org_id,
    v_lara_id,
    v_hydra_id,
    v_ana_id,
    current_date + 3,
    current_date + 14,
    '09:00'::time,
    '16:00'::time,
    'Preferira raniji termin ako se oslobodi mjesto.',
    'waiting'
  );

  raise notice 'Elizabeth review state prepared successfully.';
  raise notice 'Demo Salon: Pro + Active; Managed Email ON; review automation OFF; CRM automation OFF.';
  raise notice 'CRM example: Marina Vuković. Waitlist example: Lara Božić.';
  raise notice 'Do not send Marina follow-up during the review unless her demo email is intentionally replaced by a controlled recipient.';
end $$;
