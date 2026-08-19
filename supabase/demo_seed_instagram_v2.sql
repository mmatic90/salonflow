-- SalonFlow Instagram demo dataset v2
-- Run manually in Supabase SQL Editor. This is NOT a migration.
-- All people/contact data below is intentionally synthetic and non-identifying.
-- Safe to rerun: demo appointments are deleted/recreated by source='instagram_demo'.

do $$
declare
  target_slug text := null;
  org_id uuid;
  org_count integer;

  emp_a uuid;
  emp_b uuid;
  emp_c uuid;
  emp_d uuid;

  room_a uuid;
  room_b uuid;
  room_c uuid;
  room_d uuid;

  srv_a uuid;
  srv_b uuid;
  srv_c uuid;
  srv_d uuid;
  srv_e uuid;
  srv_f uuid;
  srv_g uuid;
  srv_h uuid;
  srv_i uuid;
  srv_j uuid;

  client_ids uuid[] := array[]::uuid[];

  i integer;
  dow_i integer;
  c_id uuid;
  d date;
  appt_id uuid;
  s_id uuid;
  s_name text;
  s_price numeric(10,2);
  dur integer;
  st time;
  et time;
  appt_status public.appointment_status;
begin
  select count(*) into org_count
  from public.organizations
  where is_active = true;

  if target_slug is not null then
    select id into org_id
    from public.organizations
    where slug = target_slug and is_active = true
    limit 1;
  elsif org_count = 1 then
    select id into org_id
    from public.organizations
    where is_active = true
    limit 1;
  else
    raise exception 'Found % active organizations. Set target_slug at the top of supabase/demo_seed_instagram_v2.sql.', org_count;
  end if;

  if org_id is null then
    raise exception 'Target organization not found.';
  end if;

  update public.organizations set
    name = 'Demo Salon',
    phone = '+000000000000',
    email = 'salon@example.invalid',
    address_line_1 = 'Demo adresa 1',
    city = 'Demo grad',
    postal_code = '00000',
    country_code = 'HR',
    timezone = 'Europe/Zagreb',
    locale = 'hr',
    currency = 'EUR'
  where id = org_id;

  -- Fully synthetic employees.
  insert into public.employees (
    organization_id, first_name, last_name, email, phone, color,
    job_title, notes, is_active, sort_order
  ) values
    (org_id, 'Terapeut', 'A', 'employee.a@example.invalid', '+000000000001', '#7C3AED', 'Senior terapeut', 'Demo zaposlenik za tretmane lica.', true, 1),
    (org_id, 'Terapeut', 'B', 'employee.b@example.invalid', '+000000000002', '#2563EB', 'Beauty terapeut', 'Demo zaposlenik za beauty tretmane.', true, 2),
    (org_id, 'Terapeut', 'C', 'employee.c@example.invalid', '+000000000003', '#059669', 'Body terapeut', 'Demo zaposlenik za body tretmane.', true, 3),
    (org_id, 'Terapeut', 'D', 'employee.d@example.invalid', '+000000000004', '#DB2777', 'Nail terapeut', 'Demo zaposlenik za manikuru i pedikuru.', true, 4)
  on conflict (organization_id, email) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    color = excluded.color,
    job_title = excluded.job_title,
    notes = excluded.notes,
    is_active = true,
    sort_order = excluded.sort_order;

  select id into emp_a from public.employees where organization_id = org_id and email = 'employee.a@example.invalid';
  select id into emp_b from public.employees where organization_id = org_id and email = 'employee.b@example.invalid';
  select id into emp_c from public.employees where organization_id = org_id and email = 'employee.c@example.invalid';
  select id into emp_d from public.employees where organization_id = org_id and email = 'employee.d@example.invalid';

  -- Generic rooms.
  insert into public.rooms (organization_id, name, description, capacity, color, is_active, sort_order)
  values
    (org_id, 'Studio A', 'Demo prostor za tretmane lica.', 1, '#A78BFA', true, 1),
    (org_id, 'Studio B', 'Demo prostor za beauty tretmane.', 1, '#60A5FA', true, 2),
    (org_id, 'Studio C', 'Demo prostor za body tretmane.', 1, '#34D399', true, 3),
    (org_id, 'Studio D', 'Demo prostor za nail tretmane.', 1, '#F9A8D4', true, 4)
  on conflict (organization_id, name) do update set
    description = excluded.description,
    capacity = excluded.capacity,
    color = excluded.color,
    is_active = true,
    sort_order = excluded.sort_order;

  select id into room_a from public.rooms where organization_id = org_id and name = 'Studio A';
  select id into room_b from public.rooms where organization_id = org_id and name = 'Studio B';
  select id into room_c from public.rooms where organization_id = org_id and name = 'Studio C';
  select id into room_d from public.rooms where organization_id = org_id and name = 'Studio D';

  -- Generic service catalogue.
  insert into public.services (
    organization_id, name, category, description, duration_minutes,
    cleanup_minutes, price, currency, color, is_active, sort_order
  ) values
    (org_id, 'Tretman lica A', 'Njega lica', 'Demo hidratacijski tretman lica.', 60, 10, 85, 'EUR', '#8B5CF6', true, 1),
    (org_id, 'Tretman lica B', 'Njega lica', 'Demo dubinski tretman lica.', 75, 10, 78, 'EUR', '#A78BFA', true, 2),
    (org_id, 'Tretman lica C', 'Njega lica', 'Demo osvježavajući tretman lica.', 45, 10, 65, 'EUR', '#C4B5FD', true, 3),
    (org_id, 'Laser tretman A', 'Laser epilacija', 'Demo laserski tretman.', 60, 10, 120, 'EUR', '#0EA5E9', true, 4),
    (org_id, 'Body tretman A', 'Oblikovanje tijela', 'Demo tretman oblikovanja tijela.', 50, 10, 75, 'EUR', '#10B981', true, 5),
    (org_id, 'Masaža A', 'Masaže', 'Demo masaža u trajanju od 60 minuta.', 60, 10, 60, 'EUR', '#14B8A6', true, 6),
    (org_id, 'Pedikura A', 'Ruke i stopala', 'Demo pedikura.', 60, 10, 45, 'EUR', '#EC4899', true, 7),
    (org_id, 'Manikura A', 'Ruke i stopala', 'Demo manikura.', 60, 10, 38, 'EUR', '#F472B6', true, 8),
    (org_id, 'Obrve A', 'Obrve i trepavice', 'Demo tretman obrva.', 30, 5, 25, 'EUR', '#F59E0B', true, 9),
    (org_id, 'Trepavice A', 'Obrve i trepavice', 'Demo tretman trepavica.', 60, 10, 48, 'EUR', '#D97706', true, 10)
  on conflict (organization_id, name) do update set
    category = excluded.category,
    description = excluded.description,
    duration_minutes = excluded.duration_minutes,
    cleanup_minutes = excluded.cleanup_minutes,
    price = excluded.price,
    currency = 'EUR',
    color = excluded.color,
    is_active = true,
    sort_order = excluded.sort_order;

  select id into srv_a from public.services where organization_id = org_id and name = 'Tretman lica A';
  select id into srv_b from public.services where organization_id = org_id and name = 'Tretman lica B';
  select id into srv_c from public.services where organization_id = org_id and name = 'Tretman lica C';
  select id into srv_d from public.services where organization_id = org_id and name = 'Laser tretman A';
  select id into srv_e from public.services where organization_id = org_id and name = 'Body tretman A';
  select id into srv_f from public.services where organization_id = org_id and name = 'Masaža A';
  select id into srv_g from public.services where organization_id = org_id and name = 'Pedikura A';
  select id into srv_h from public.services where organization_id = org_id and name = 'Manikura A';
  select id into srv_i from public.services where organization_id = org_id and name = 'Obrve A';
  select id into srv_j from public.services where organization_id = org_id and name = 'Trepavice A';

  insert into public.equipment (organization_id, name, description, quantity_total, is_active, sort_order)
  values
    (org_id, 'Demo uređaj A', 'Sintetički demo uređaj.', 1, true, 1),
    (org_id, 'Demo uređaj B', 'Sintetički demo uređaj.', 1, true, 2),
    (org_id, 'Demo uređaj C', 'Sintetički demo uređaj.', 1, true, 3),
    (org_id, 'Demo uređaj D', 'Sintetički demo uređaj.', 2, true, 4)
  on conflict (organization_id, name) do update set
    description = excluded.description,
    quantity_total = excluded.quantity_total,
    is_active = true,
    sort_order = excluded.sort_order;

  -- 25 fully synthetic clients: Klijent 001 ... Klijent 025.
  for i in 1..25 loop
    select id into c_id
    from public.clients
    where organization_id = org_id
      and email = ('client.' || lpad(i::text, 3, '0') || '@example.invalid')
    limit 1;

    if c_id is null then
      insert into public.clients (
        organization_id, first_name, last_name, email, phone,
        date_of_birth, notes, marketing_consent, is_active, created_at
      ) values (
        org_id,
        'Klijent',
        lpad(i::text, 3, '0'),
        'client.' || lpad(i::text, 3, '0') || '@example.invalid',
        '+000000' || lpad(i::text, 6, '0'),
        date '1985-01-01' + ((i * 173) % 5000),
        case
          when i = 5 then 'Demo napomena: osjetljiva koža.'
          when i = 8 then 'Demo napomena: redovni facial tretmani.'
          when i = 12 then 'Demo napomena: preferira body tretmane.'
          when i = 17 then 'Demo napomena: preferira jutarnje termine.'
          else null
        end,
        (i % 3 <> 0),
        true,
        now() - make_interval(days => (40 - i))
      ) returning id into c_id;
    end if;

    client_ids := array_append(client_ids, c_id);
  end loop;

  -- Weekly schedules.
  delete from public.employee_default_schedule
  where organization_id = org_id
    and employee_id in (emp_a, emp_b, emp_c, emp_d);

  for dow_i in 0..6 loop
    insert into public.employee_default_schedule (
      organization_id, employee_id, day_of_week, is_working, start_time, end_time
    ) values
      (org_id, emp_a, dow_i, (dow_i between 1 and 6), case when dow_i between 1 and 6 then '09:00'::time else null end, case when dow_i between 1 and 5 then '17:00'::time when dow_i = 6 then '14:00'::time else null end),
      (org_id, emp_b, dow_i, (dow_i between 1 and 6), case when dow_i between 1 and 6 then '08:00'::time else null end, case when dow_i between 1 and 6 then '15:00'::time else null end),
      (org_id, emp_c, dow_i, (dow_i between 1 and 5), case when dow_i between 1 and 5 then '12:00'::time else null end, case when dow_i between 1 and 5 then '20:00'::time else null end),
      (org_id, emp_d, dow_i, (dow_i between 2 and 6), case when dow_i between 2 and 6 then '10:00'::time else null end, case when dow_i between 2 and 6 then '18:00'::time else null end);
  end loop;

  delete from public.employee_services
  where organization_id = org_id
    and employee_id in (emp_a, emp_b, emp_c, emp_d);

  insert into public.employee_services (organization_id, employee_id, service_id) values
    (org_id, emp_a, srv_a), (org_id, emp_a, srv_b), (org_id, emp_a, srv_c), (org_id, emp_a, srv_d), (org_id, emp_a, srv_e),
    (org_id, emp_b, srv_a), (org_id, emp_b, srv_c), (org_id, emp_b, srv_i), (org_id, emp_b, srv_j),
    (org_id, emp_c, srv_d), (org_id, emp_c, srv_e), (org_id, emp_c, srv_f),
    (org_id, emp_d, srv_g), (org_id, emp_d, srv_h), (org_id, emp_d, srv_i), (org_id, emp_d, srv_j)
  on conflict do nothing;

  delete from public.service_rooms
  where organization_id = org_id
    and service_id in (srv_a, srv_b, srv_c, srv_d, srv_e, srv_f, srv_g, srv_h, srv_i, srv_j);

  insert into public.service_rooms (organization_id, service_id, room_id) values
    (org_id, srv_a, room_a), (org_id, srv_b, room_a), (org_id, srv_c, room_a),
    (org_id, srv_a, room_b), (org_id, srv_c, room_b), (org_id, srv_i, room_b), (org_id, srv_j, room_b),
    (org_id, srv_d, room_c), (org_id, srv_e, room_c), (org_id, srv_f, room_c),
    (org_id, srv_g, room_d), (org_id, srv_h, room_d), (org_id, srv_i, room_d), (org_id, srv_j, room_d)
  on conflict do nothing;

  delete from public.appointments
  where organization_id = org_id
    and source = 'instagram_demo';

  -- Temporary overrides ensure SQL Editor seeding respects the same DB runtime rules.
  delete from public.employee_schedule_overrides
  where organization_id = org_id
    and employee_id in (emp_a, emp_b, emp_c, emp_d)
    and reason = 'instagram_demo_seed';

  for d in select generate_series(CURRENT_DATE - 28, CURRENT_DATE + 14, interval '1 day')::date loop
    dow_i := extract(dow from d)::int;

    if dow_i between 1 and 6 then
      insert into public.employee_schedule_overrides (
        organization_id, employee_id, schedule_date, is_working, start_time, end_time, reason
      ) values
        (org_id, emp_a, d, true, '08:00', '20:00', 'instagram_demo_seed'),
        (org_id, emp_b, d, true, '07:00', '20:00', 'instagram_demo_seed')
      on conflict (employee_id, schedule_date) do update set
        is_working = true,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        reason = 'instagram_demo_seed';
    end if;

    if dow_i between 1 and 5 then
      insert into public.employee_schedule_overrides (
        organization_id, employee_id, schedule_date, is_working, start_time, end_time, reason
      ) values
        (org_id, emp_c, d, true, '11:00', '21:00', 'instagram_demo_seed')
      on conflict (employee_id, schedule_date) do update set
        is_working = true,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        reason = 'instagram_demo_seed';
    end if;

    if dow_i between 2 and 6 then
      insert into public.employee_schedule_overrides (
        organization_id, employee_id, schedule_date, is_working, start_time, end_time, reason
      ) values
        (org_id, emp_d, d, true, '09:00', '19:00', 'instagram_demo_seed')
      on conflict (employee_id, schedule_date) do update set
        is_working = true,
        start_time = excluded.start_time,
        end_time = excluded.end_time,
        reason = 'instagram_demo_seed';
    end if;
  end loop;

  for d in select generate_series(CURRENT_DATE - 28, CURRENT_DATE + 14, interval '1 day')::date loop
    dow_i := extract(dow from d)::int;
    if dow_i = 0 then continue; end if;

    -- Terapeut A · Studio A
    for i in 0..3 loop
      st := (time '09:00' + make_interval(mins => i * 90))::time;
      s_id := case i when 0 then srv_a when 1 then srv_b when 2 then srv_c else srv_a end;
      select name, duration_minutes, price into s_name, dur, s_price from public.services where id = s_id;
      et := (st + make_interval(mins => dur))::time;
      c_id := client_ids[1 + ((extract(day from d)::int + i * 3) % array_length(client_ids, 1))];
      appt_status := case
        when d < CURRENT_DATE then
          (case when (extract(day from d)::int + i) % 13 = 0 then 'no_show'
                when (extract(day from d)::int + i) % 11 = 0 then 'cancelled'
                else 'completed' end)::public.appointment_status
        when d = CURRENT_DATE and st < localtime then 'completed'
        when d <= CURRENT_DATE + 2 then 'confirmed'
        else 'scheduled'
      end;

      insert into public.appointments (
        organization_id, client_id, employee_id, room_id, appointment_date,
        start_time, end_time, status, client_name, client_phone, client_email,
        notes, source, total_price, currency
      )
      select org_id, c_id, emp_a, room_a, d, st, et, appt_status,
             trim(c.first_name || ' ' || coalesce(c.last_name, '')), c.phone, c.email,
             case when d = CURRENT_DATE and i = 0 then 'Demo kontrolna napomena.' end,
             'instagram_demo', s_price, 'EUR'
      from public.clients c where c.id = c_id
      returning id into appt_id;

      insert into public.appointment_services (
        organization_id, appointment_id, service_id, service_name,
        duration_minutes, price, currency, sort_order
      ) values (org_id, appt_id, s_id, s_name, dur, s_price, 'EUR', 0);
    end loop;

    -- Terapeut B · Studio B
    for i in 0..3 loop
      st := (time '08:00' + make_interval(mins => i * 90))::time;
      s_id := case i when 0 then srv_j when 1 then srv_a when 2 then srv_i else srv_c end;
      select name, duration_minutes, price into s_name, dur, s_price from public.services where id = s_id;
      et := (st + make_interval(mins => dur))::time;
      c_id := client_ids[1 + ((extract(day from d)::int + i * 4 + 5) % array_length(client_ids, 1))];
      appt_status := case
        when d < CURRENT_DATE then 'completed'
        when d = CURRENT_DATE and st < localtime then 'completed'
        when d <= CURRENT_DATE + 3 then 'confirmed'
        else 'scheduled'
      end;

      insert into public.appointments (
        organization_id, client_id, employee_id, room_id, appointment_date,
        start_time, end_time, status, client_name, client_phone, client_email,
        source, total_price, currency
      )
      select org_id, c_id, emp_b, room_b, d, st, et, appt_status,
             trim(c.first_name || ' ' || coalesce(c.last_name, '')), c.phone, c.email,
             'instagram_demo', s_price, 'EUR'
      from public.clients c where c.id = c_id
      returning id into appt_id;

      insert into public.appointment_services (
        organization_id, appointment_id, service_id, service_name,
        duration_minutes, price, currency, sort_order
      ) values (org_id, appt_id, s_id, s_name, dur, s_price, 'EUR', 0);
    end loop;

    if dow_i between 1 and 5 then
      -- Terapeut C · Studio C
      for i in 0..3 loop
        st := (time '12:00' + make_interval(mins => i * 105))::time;
        s_id := case i when 0 then srv_f when 1 then srv_e when 2 then srv_d else srv_e end;
        select name, duration_minutes, price into s_name, dur, s_price from public.services where id = s_id;
        et := (st + make_interval(mins => dur))::time;
        c_id := client_ids[1 + ((extract(day from d)::int + i * 5 + 9) % array_length(client_ids, 1))];
        appt_status := case
          when d < CURRENT_DATE then
            (case when (extract(day from d)::int + i) % 17 = 0 then 'no_show' else 'completed' end)::public.appointment_status
          when d <= CURRENT_DATE + 2 then 'confirmed'
          else 'scheduled'
        end;

        insert into public.appointments (
          organization_id, client_id, employee_id, room_id, appointment_date,
          start_time, end_time, status, client_name, client_phone, client_email,
          source, total_price, currency
        )
        select org_id, c_id, emp_c, room_c, d, st, et, appt_status,
               trim(c.first_name || ' ' || coalesce(c.last_name, '')), c.phone, c.email,
               'instagram_demo', s_price, 'EUR'
        from public.clients c where c.id = c_id
        returning id into appt_id;

        insert into public.appointment_services (
          organization_id, appointment_id, service_id, service_name,
          duration_minutes, price, currency, sort_order
        ) values (org_id, appt_id, s_id, s_name, dur, s_price, 'EUR', 0);
      end loop;
    end if;

    if dow_i between 2 and 6 then
      -- Terapeut D · Studio D
      for i in 0..3 loop
        st := (time '10:00' + make_interval(mins => i * 105))::time;
        s_id := case when i % 2 = 0 then srv_g else srv_h end;
        select name, duration_minutes, price into s_name, dur, s_price from public.services where id = s_id;
        et := (st + make_interval(mins => dur))::time;
        c_id := client_ids[1 + ((extract(day from d)::int + i * 2 + 14) % array_length(client_ids, 1))];
        appt_status := case
          when d < CURRENT_DATE then 'completed'
          when d <= CURRENT_DATE + 2 then 'confirmed'
          else 'scheduled'
        end;

        insert into public.appointments (
          organization_id, client_id, employee_id, room_id, appointment_date,
          start_time, end_time, status, client_name, client_phone, client_email,
          source, total_price, currency
        )
        select org_id, c_id, emp_d, room_d, d, st, et, appt_status,
               trim(c.first_name || ' ' || coalesce(c.last_name, '')), c.phone, c.email,
               'instagram_demo', s_price, 'EUR'
        from public.clients c where c.id = c_id
        returning id into appt_id;

        insert into public.appointment_services (
          organization_id, appointment_id, service_id, service_name,
          duration_minutes, price, currency, sort_order
        ) values (org_id, appt_id, s_id, s_name, dur, s_price, 'EUR', 0);
      end loop;
    end if;
  end loop;

  -- Restore the normal weekly schedule after demo appointments are created.
  delete from public.employee_schedule_overrides
  where organization_id = org_id
    and employee_id in (emp_a, emp_b, emp_c, emp_d)
    and reason = 'instagram_demo_seed';

  raise notice 'SalonFlow synthetic Instagram demo seed complete. Organization: %', org_id;
  raise notice '4 synthetic employees · 4 rooms · 10 services · 4 equipment items · 25 synthetic clients · 43-day appointment window';
end $$;
