-- SalonFlow Elizabeth review preparation
-- MANUAL DEMO TOOL — NOT A MIGRATION.
--
-- This script is intentionally locked to the known Demo Salon tenant.
-- It does NOT rebuild the main demo dataset and does not require the Instagram v3 seed.
-- It creates/updates only three presentation clients identified by dedicated demo emails,
-- plus the minimum presentation rows needed for client care, waitlist and CRM retention.
--
-- Safe to rerun before a review. Do NOT reuse this file for a real tenant.

do $$
declare
  v_org_id uuid := '7042e15c-1a1e-44e5-991e-bb8aa6266c08';
  v_org_name text;

  v_ema_id uuid;
  v_lara_id uuid;
  v_marina_id uuid;

  v_waitlist_service_id uuid;
  v_waitlist_employee_id uuid;

  v_crm_service_id uuid;
  v_crm_service_name text;
  v_crm_service_duration integer;
  v_crm_service_price numeric(10,2);
  v_crm_service_currency text;

  v_employee_id uuid;
  v_slot_date date;
  v_slot_start time;
  v_slot_end time;
  v_appointment_id uuid;
  v_created_visits integer := 0;
  v_window integer;
begin
  -- Several consent-integrity paths trust service_role maintenance operations.
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
  -- 1. Remove only temporary QA traces from the earlier retention tests.
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
  -- 2. Restore a presentation-safe tenant state.
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

  -- Preserve an existing review URL/delay, but stop scheduled sends during demo.
  insert into public.organization_review_settings (
    organization_id,
    enabled,
    delay_hours
  )
  values (v_org_id, false, 24)
  on conflict (organization_id) do update
  set enabled = false;

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
  -- 3. Create or refresh three deterministic presentation clients.
  -- Dedicated demo emails make the rows safe to identify without relying on names
  -- from any particular seed version.
  ------------------------------------------------------------------------------

  -- Ema: Client care / safety example.
  select c.id into v_ema_id
  from public.clients c
  where c.organization_id = v_org_id
    and lower(c.email) = 'elizabeth-demo-ema@demo-salon.test'
  limit 1;

  if v_ema_id is null then
    insert into public.clients (
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      notes,
      allergies_sensitivities,
      contraindications,
      treatment_preferences,
      marketing_consent,
      marketing_email_status,
      marketing_email_source,
      is_active
    ) values (
      v_org_id,
      'Ema',
      'Babić',
      'elizabeth-demo-ema@demo-salon.test',
      '+385 91 555 0101',
      'Preferira nježnije tretmane i kratku provjeru stanja kože prije tretmana.',
      'Osjetljiva koža; moguća reakcija na jače pilinge.',
      'Izbjegavati agresivne tretmane kod aktivne iritacije kože.',
      'Blaži proizvodi; naglasak na hidrataciji i umirujućoj njezi.',
      false,
      'unknown',
      'manual',
      true
    ) returning id into v_ema_id;
  else
    update public.clients
    set
      first_name = 'Ema',
      last_name = 'Babić',
      phone = '+385 91 555 0101',
      notes = 'Preferira nježnije tretmane i kratku provjeru stanja kože prije tretmana.',
      allergies_sensitivities = 'Osjetljiva koža; moguća reakcija na jače pilinge.',
      contraindications = 'Izbjegavati agresivne tretmane kod aktivne iritacije kože.',
      treatment_preferences = 'Blaži proizvodi; naglasak na hidrataciji i umirujućoj njezi.',
      is_active = true
    where id = v_ema_id;
  end if;

  -- Lara: Waitlist example.
  select c.id into v_lara_id
  from public.clients c
  where c.organization_id = v_org_id
    and lower(c.email) = 'elizabeth-demo-lara@demo-salon.test'
  limit 1;

  if v_lara_id is null then
    insert into public.clients (
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      notes,
      marketing_consent,
      marketing_email_status,
      marketing_email_source,
      is_active
    ) values (
      v_org_id,
      'Lara',
      'Božić',
      'elizabeth-demo-lara@demo-salon.test',
      '+385 91 555 0102',
      'Fleksibilna s terminima; rado dolazi ranije ako se oslobodi mjesto.',
      false,
      'unknown',
      'manual',
      true
    ) returning id into v_lara_id;
  else
    update public.clients
    set
      first_name = 'Lara',
      last_name = 'Božić',
      phone = '+385 91 555 0102',
      notes = 'Fleksibilna s terminima; rado dolazi ranije ako se oslobodi mjesto.',
      is_active = true
    where id = v_lara_id;
  end if;

  -- Marina: CRM retention example. Consent is explicitly enabled so the manual
  -- follow-up button is eligible, but the demo email is intentionally non-routable.
  select c.id into v_marina_id
  from public.clients c
  where c.organization_id = v_org_id
    and lower(c.email) = 'elizabeth-demo-marina@demo-salon.test'
  limit 1;

  if v_marina_id is null then
    insert into public.clients (
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      notes,
      marketing_consent,
      marketing_email_status,
      marketing_email_consent_at,
      marketing_email_consent_source,
      marketing_email_source,
      marketing_email_updated_at,
      marketing_email_updated_by,
      is_active
    ) values (
      v_org_id,
      'Marina',
      'Vuković',
      'elizabeth-demo-marina@demo-salon.test',
      '+385 91 555 0103',
      'Redovna klijentica kojoj odgovara povremeni podsjetnik za ponovni dolazak.',
      true,
      'allowed',
      now(),
      'manual',
      'manual',
      now(),
      null,
      true
    ) returning id into v_marina_id;
  else
    update public.clients
    set
      first_name = 'Marina',
      last_name = 'Vuković',
      phone = '+385 91 555 0103',
      notes = 'Redovna klijentica kojoj odgovara povremeni podsjetnik za ponovni dolazak.',
      marketing_consent = true,
      marketing_email_status = 'allowed',
      marketing_email_consent_at = now(),
      marketing_email_consent_source = 'manual',
      marketing_email_source = 'manual',
      marketing_email_updated_at = now(),
      marketing_email_updated_by = null,
      is_active = true
    where id = v_marina_id;
  end if;

  ------------------------------------------------------------------------------
  -- 4. Stage a waitlist row using whatever current demo configuration exists.
  -- Prefer Hydra Glow when present; otherwise use the first active service.
  ------------------------------------------------------------------------------
  select s.id into v_waitlist_service_id
  from public.services s
  where s.organization_id = v_org_id
    and s.is_active = true
  order by
    case when lower(s.name) like '%hydra%glow%' then 0 else 1 end,
    s.sort_order nulls last,
    s.name
  limit 1;

  if v_waitlist_service_id is null then
    raise exception 'Demo Salon has no active service. At least one service is required for the waitlist demo.';
  end if;

  select es.employee_id into v_waitlist_employee_id
  from public.employee_services es
  join public.employees e on e.id = es.employee_id
  where es.organization_id = v_org_id
    and es.service_id = v_waitlist_service_id
    and e.is_active = true
  order by e.sort_order nulls last, e.first_name, e.last_name
  limit 1;

  delete from public.waitlist_entries
  where organization_id = v_org_id
    and client_id = v_lara_id
    and notes = 'Elizabeth demo: preferira raniji termin ako se oslobodi mjesto.';

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
    v_waitlist_service_id,
    v_waitlist_employee_id,
    current_date + 3,
    current_date + 14,
    '09:00'::time,
    '16:00'::time,
    'Elizabeth demo: preferira raniji termin ako se oslobodi mjesto.',
    'waiting'
  );

  ------------------------------------------------------------------------------
  -- 5. Stage Marina as a genuine CRM candidate using current salon configuration.
  --
  -- Pick an existing active service (prefer massage) and create two completed
  -- visits in free historical employee slots. The last visit remains >30 days
  -- old and Marina has no future booking, so Advanced CRM derives a real signal.
  ------------------------------------------------------------------------------
  select
    s.id,
    s.name,
    s.duration_minutes,
    s.price,
    s.currency
  into
    v_crm_service_id,
    v_crm_service_name,
    v_crm_service_duration,
    v_crm_service_price,
    v_crm_service_currency
  from public.services s
  where s.organization_id = v_org_id
    and s.is_active = true
    and s.duration_minutes between 15 and 180
  order by
    case when lower(s.name) like '%masa%' or lower(s.name) like '%massage%' then 0 else 1 end,
    s.duration_minutes,
    s.sort_order nulls last
  limit 1;

  if v_crm_service_id is null then
    raise exception 'Demo Salon has no active service suitable for the CRM demo.';
  end if;

  -- Remove previous presentation-only Marina activity so reruns stay deterministic.
  delete from public.appointments
  where organization_id = v_org_id
    and client_id = v_marina_id
    and source = 'elizabeth_demo_review';

  if to_regclass('public.crm_retention_email_deliveries') is not null then
    execute 'delete from public.crm_retention_email_deliveries where organization_id = $1 and client_id = $2'
    using v_org_id, v_marina_id;
  end if;

  if to_regclass('public.crm_retention_actions') is not null then
    execute 'delete from public.crm_retention_actions where organization_id = $1 and client_id = $2'
    using v_org_id, v_marina_id;
  end if;

  -- Ensure no future booking suppresses the retention candidate. Only rows for
  -- this dedicated presentation client are touched.
  delete from public.appointments
  where organization_id = v_org_id
    and client_id = v_marina_id
    and appointment_date >= current_date;

  -- Search two historical windows. We use the actual effective employee schedule
  -- and a free 30-minute grid slot, so the normal appointment trigger remains on.
  for v_window in 1..2 loop
    v_employee_id := null;
    v_slot_date := null;
    v_slot_start := null;
    v_slot_end := null;

    select
      candidate.employee_id,
      candidate.slot_date,
      candidate.slot_start,
      candidate.slot_end
    into
      v_employee_id,
      v_slot_date,
      v_slot_start,
      v_slot_end
    from (
      select
        e.id as employee_id,
        d.day::date as slot_date,
        slot.slot_start::time as slot_start,
        (slot.slot_start + make_interval(mins => v_crm_service_duration))::time as slot_end
      from public.employees e
      cross join lateral (
        select gs::date as day
        from generate_series(
          case when v_window = 1 then current_date - 105 else current_date - 60 end,
          case when v_window = 1 then current_date - 75 else current_date - 35 end,
          interval '1 day'
        ) gs
      ) d
      cross join lateral public.get_employee_effective_schedule(e.id, d.day::date) eff
      cross join lateral (
        select gs as slot_start
        from generate_series(
          (d.day::date + eff.start_time)::timestamp,
          (d.day::date + eff.end_time - make_interval(mins => v_crm_service_duration))::timestamp,
          interval '30 minutes'
        ) gs
      ) slot
      where e.organization_id = v_org_id
        and e.is_active = true
        and eff.is_working = true
        and eff.start_time is not null
        and eff.end_time is not null
        and eff.end_time > eff.start_time
        and not exists (
          select 1
          from public.appointments a
          where a.organization_id = v_org_id
            and a.employee_id = e.id
            and a.appointment_date = d.day::date
            and a.status in ('scheduled', 'confirmed', 'completed')
            and slot.slot_start::time < a.end_time
            and a.start_time < (slot.slot_start + make_interval(mins => v_crm_service_duration))::time
        )
      order by d.day desc, e.sort_order nulls last, e.first_name, slot.slot_start
      limit 1
    ) candidate;

    if v_employee_id is null or v_slot_date is null or v_slot_start is null or v_slot_end is null then
      raise exception 'Could not find a free historical employee slot for CRM demo window %.', v_window;
    end if;

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
      v_employee_id,
      null,
      v_slot_date,
      v_slot_start,
      v_slot_end,
      'completed'::public.appointment_status,
      trim(c.first_name || ' ' || coalesce(c.last_name, '')),
      c.phone,
      c.email,
      'Redovni dolazak — prezentacijski primjer CRM povijesti.',
      null,
      'elizabeth_demo_review',
      v_crm_service_price,
      coalesce(v_crm_service_currency, 'EUR')
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
      v_crm_service_id,
      v_crm_service_name,
      v_crm_service_duration,
      v_crm_service_price,
      coalesce(v_crm_service_currency, 'EUR'),
      0
    );

    v_created_visits := v_created_visits + 1;
  end loop;

  if v_created_visits <> 2 then
    raise exception 'Expected two CRM demo visits, created %.', v_created_visits;
  end if;

  raise notice 'Elizabeth review state prepared successfully.';
  raise notice 'Demo Salon: Pro + Active; Managed Email ON; review automation OFF; CRM automation OFF.';
  raise notice 'Client-care example: Ema Babić (elizabeth-demo-ema@demo-salon.test).';
  raise notice 'Waitlist example: Lara Božić (elizabeth-demo-lara@demo-salon.test).';
  raise notice 'CRM example: Marina Vuković (elizabeth-demo-marina@demo-salon.test).';
  raise notice 'CRM service selected from current salon configuration: %.', v_crm_service_name;
  raise notice 'Do not send Marina follow-up during the review unless her demo email is intentionally replaced by a controlled recipient.';
end $$;
