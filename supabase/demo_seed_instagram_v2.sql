-- SalonFlow clean Instagram demo dataset
-- Run manually in Supabase SQL Editor. This is NOT a migration.
--
-- IMPORTANT: this script intentionally removes existing operational/demo data
-- for the selected organization (appointments, employees, clients, rooms,
-- services, equipment, schedules and mappings), but it does NOT delete the
-- organization, auth users, profiles or organization_members.
--
-- Use this only for a dedicated demo/test salon.

do $$
declare
  target_slug text := null;
  org_id uuid;
  org_count integer;

  emp_ana uuid;
  emp_luka uuid;
  emp_ivan uuid;
  emp_petra uuid;

  room_1 uuid;
  room_2 uuid;
  room_3 uuid;
  room_4 uuid;

  srv_hydra uuid;
  srv_deep uuid;
  srv_oxy uuid;
  srv_laser uuid;
  srv_body uuid;
  srv_massage uuid;
  srv_pedi uuid;
  srv_mani uuid;
  srv_brows uuid;
  srv_lashes uuid;

  client_names text[] := array[
    'Marko Markić','Sara Sarić','Nina Ninić','Karlo Karlić','Dora Dorić',
    'Tomislav Tomić','Ema Emić','Filip Filipić','Maja Majić','Niko Nikić',
    'Iva Ivić','Leo Leić','Rita Ritić','Toni Tonić','Lara Larić',
    'Dino Dinić','Tea Teić','Borna Bornić','Klara Klarić','Vito Vitić',
    'Sanja Sanjić','Renato Renić','Marina Marinić','Paolo Paolić','Elena Elenić'
  ];
  client_ids uuid[] := array[]::uuid[];

  i integer;
  dow_i integer;
  first_name text;
  last_name text;
  c_id uuid;
  d date;
  appt_id uuid;
  service_id uuid;
  service_name text;
  service_price numeric(10,2);
  duration_minutes integer;
  start_at time;
  end_at time;
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

  ---------------------------------------------------------------------------
  -- 1. CLEAN ALL OLD DEMO / OPERATIONAL DATA FOR THIS SALON
  ---------------------------------------------------------------------------

  if to_regclass('public.appointment_services') is not null then
    execute 'delete from public.appointment_services where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.appointments') is not null then
    execute 'delete from public.appointments where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.service_equipment') is not null then
    execute 'delete from public.service_equipment where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.service_rooms') is not null then
    execute 'delete from public.service_rooms where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.employee_services') is not null then
    execute 'delete from public.employee_services where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.service_group_limits') is not null then
    execute 'delete from public.service_group_limits where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.employee_schedule_overrides') is not null then
    execute 'delete from public.employee_schedule_overrides where organization_id = $1' using org_id;
  end if;

  if to_regclass('public.employee_default_schedule') is not null then
    execute 'delete from public.employee_default_schedule where organization_id = $1' using org_id;
  end if;

  delete from public.employees where organization_id = org_id;
  delete from public.clients where organization_id = org_id;
  delete from public.rooms where organization_id = org_id;
  delete from public.equipment where organization_id = org_id;
  delete from public.services where organization_id = org_id;

  ---------------------------------------------------------------------------
  -- 2. SALON + GENERIC EMPLOYEES + ROOMS + REAL SERVICES
  ---------------------------------------------------------------------------

  update public.organizations set
    name = 'Demo Salon',
    phone = '+385 91 000 0000',
    email = 'info@demo-salon.test',
    address_line_1 = 'Primjer ulica 1',
    city = 'Rovinj',
    postal_code = '52210',
    country_code = 'HR',
    timezone = 'Europe/Zagreb',
    locale = 'hr',
    currency = 'EUR'
  where id = org_id;

  insert into public.employees (
    organization_id, first_name, last_name, email, phone, color,
    job_title, notes, is_active, sort_order
  ) values
    (org_id, 'Ana', 'Anić', 'ana.anic@demo-salon.test', '+385 91 000 0101', '#7C3AED', 'Senior kozmetičarka', 'Tretmani lica i napredna njega kože.', true, 1),
    (org_id, 'Luka', 'Lukić', 'luka.lukic@demo-salon.test', '+385 91 000 0102', '#2563EB', 'Beauty terapeut', 'Obrve, trepavice i beauty tretmani.', true, 2),
    (org_id, 'Ivan', 'Ivić', 'ivan.ivic@demo-salon.test', '+385 91 000 0103', '#059669', 'Body terapeut', 'Masaže, oblikovanje tijela i laser.', true, 3),
    (org_id, 'Petra', 'Perić', 'petra.peric@demo-salon.test', '+385 91 000 0104', '#DB2777', 'Nail terapeut', 'Manikura i pedikura.', true, 4);

  select id into emp_ana from public.employees where organization_id = org_id and email = 'ana.anic@demo-salon.test';
  select id into emp_luka from public.employees where organization_id = org_id and email = 'luka.lukic@demo-salon.test';
  select id into emp_ivan from public.employees where organization_id = org_id and email = 'ivan.ivic@demo-salon.test';
  select id into emp_petra from public.employees where organization_id = org_id and email = 'petra.peric@demo-salon.test';

  insert into public.rooms (organization_id, name, description, capacity, color, is_active, sort_order)
  values
    (org_id, 'Soba 1', 'Tretmani lica i njega kože.', 1, '#A78BFA', true, 1),
    (org_id, 'Soba 2', 'Beauty tretmani, obrve i trepavice.', 1, '#60A5FA', true, 2),
    (org_id, 'Soba 3', 'Masaže, body tretmani i laser.', 1, '#34D399', true, 3),
    (org_id, 'Soba 4', 'Manikura i pedikura.', 1, '#F9A8D4', true, 4);

  select id into room_1 from public.rooms where organization_id = org_id and name = 'Soba 1';
  select id into room_2 from public.rooms where organization_id = org_id and name = 'Soba 2';
  select id into room_3 from public.rooms where organization_id = org_id and name = 'Soba 3';
  select id into room_4 from public.rooms where organization_id = org_id and name = 'Soba 4';

  insert into public.services (
    organization_id, name, category, description, duration_minutes,
    cleanup_minutes, price, currency, color, is_active, sort_order
  ) values
    (org_id, 'Hydra Glow tretman lica', 'Njega lica', 'Dubinsko čišćenje, hidratacija i završna njega kože.', 60, 10, 85, 'EUR', '#8B5CF6', true, 1),
    (org_id, 'Dubinsko čišćenje lica', 'Njega lica', 'Profesionalno dubinsko čišćenje prilagođeno stanju kože.', 75, 10, 78, 'EUR', '#A78BFA', true, 2),
    (org_id, 'Oxy tretman lica', 'Njega lica', 'Oksigenacija i intenzivna hidratacija kože.', 45, 10, 65, 'EUR', '#C4B5FD', true, 3),
    (org_id, 'Laser epilacija nogu', 'Laser epilacija', 'Laserska epilacija cijelih nogu.', 60, 10, 120, 'EUR', '#0EA5E9', true, 4),
    (org_id, 'Body Sculpt', 'Oblikovanje tijela', 'Aparativni tretman oblikovanja i toniranja tijela.', 50, 10, 75, 'EUR', '#10B981', true, 5),
    (org_id, 'Relax masaža 60 min', 'Masaže', 'Opuštajuća masaža cijelog tijela.', 60, 10, 60, 'EUR', '#14B8A6', true, 6),
    (org_id, 'Spa pedikura', 'Ruke i stopala', 'Kompletna estetska pedikura s njegom.', 60, 10, 45, 'EUR', '#EC4899', true, 7),
    (org_id, 'Gel manikura', 'Ruke i stopala', 'Uređivanje noktiju i trajni lak.', 60, 10, 38, 'EUR', '#F472B6', true, 8),
    (org_id, 'Oblikovanje i bojenje obrva', 'Obrve i trepavice', 'Oblikovanje i bojenje obrva.', 30, 5, 25, 'EUR', '#F59E0B', true, 9),
    (org_id, 'Lash Lift', 'Obrve i trepavice', 'Podizanje i bojenje prirodnih trepavica.', 60, 10, 48, 'EUR', '#D97706', true, 10);

  select id into srv_hydra from public.services where organization_id = org_id and name = 'Hydra Glow tretman lica';
  select id into srv_deep from public.services where organization_id = org_id and name = 'Dubinsko čišćenje lica';
  select id into srv_oxy from public.services where organization_id = org_id and name = 'Oxy tretman lica';
  select id into srv_laser from public.services where organization_id = org_id and name = 'Laser epilacija nogu';
  select id into srv_body from public.services where organization_id = org_id and name = 'Body Sculpt';
  select id into srv_massage from public.services where organization_id = org_id and name = 'Relax masaža 60 min';
  select id into srv_pedi from public.services where organization_id = org_id and name = 'Spa pedikura';
  select id into srv_mani from public.services where organization_id = org_id and name = 'Gel manikura';
  select id into srv_brows from public.services where organization_id = org_id and name = 'Oblikovanje i bojenje obrva';
  select id into srv_lashes from public.services where organization_id = org_id and name = 'Lash Lift';

  insert into public.equipment (organization_id, name, description, quantity_total, is_active, sort_order)
  values
    (org_id, 'Diode Laser 808 nm', 'Profesionalni uređaj za lasersku epilaciju.', 1, true, 1),
    (org_id, 'Body Sculpt uređaj', 'Uređaj za oblikovanje i toniranje tijela.', 1, true, 2),
    (org_id, 'Oxy uređaj', 'Uređaj za oksigenaciju kože.', 1, true, 3),
    (org_id, 'LED maska', 'LED terapija kao dodatak tretmanima lica.', 2, true, 4);

  ---------------------------------------------------------------------------
  -- 3. GENERIC CLIENTS
  ---------------------------------------------------------------------------

  for i in 1..array_length(client_names, 1) loop
    first_name := split_part(client_names[i], ' ', 1);
    last_name := substring(client_names[i] from position(' ' in client_names[i]) + 1);

    insert into public.clients (
      organization_id, first_name, last_name, email, phone,
      date_of_birth, notes, marketing_consent, is_active, created_at
    ) values (
      org_id,
      first_name,
      last_name,
      'client' || lpad(i::text, 3, '0') || '@demo-salon.test',
      '+385 91 100 ' || lpad(i::text, 4, '0'),
      date '1982-01-01' + ((i * 211) % 7000),
      case
        when i = 4 then 'Osjetljiva koža; preferira blaže tretmane.'
        when i = 8 then 'Redovni klijent za tretmane lica.'
        when i = 12 then 'Najčešće rezervira masažu i body tretmane.'
        when i = 17 then 'Preferira jutarnje termine.'
        when i = 22 then 'Preferira termine nakon 16:00.'
        else null
      end,
      (i % 3 <> 0),
      true,
      now() - make_interval(days => 50 - i)
    ) returning id into c_id;

    client_ids := array_append(client_ids, c_id);
  end loop;

  ---------------------------------------------------------------------------
  -- 4. SCHEDULES AND MAPPINGS
  ---------------------------------------------------------------------------

  for dow_i in 0..6 loop
    insert into public.employee_default_schedule (
      organization_id, employee_id, day_of_week, is_working, start_time, end_time
    ) values
      (org_id, emp_ana, dow_i, dow_i between 1 and 6,
        case when dow_i between 1 and 6 then '09:00'::time else null end,
        case when dow_i between 1 and 5 then '17:00'::time when dow_i = 6 then '14:00'::time else null end),
      (org_id, emp_luka, dow_i, dow_i between 1 and 6,
        case when dow_i between 1 and 6 then '08:00'::time else null end,
        case when dow_i between 1 and 6 then '15:00'::time else null end),
      (org_id, emp_ivan, dow_i, dow_i between 1 and 5,
        case when dow_i between 1 and 5 then '12:00'::time else null end,
        case when dow_i between 1 and 5 then '20:00'::time else null end),
      (org_id, emp_petra, dow_i, dow_i between 2 and 6,
        case when dow_i between 2 and 6 then '10:00'::time else null end,
        case when dow_i between 2 and 6 then '18:00'::time else null end);
  end loop;

  insert into public.employee_services (organization_id, employee_id, service_id) values
    (org_id, emp_ana, srv_hydra), (org_id, emp_ana, srv_deep), (org_id, emp_ana, srv_oxy),
    (org_id, emp_luka, srv_hydra), (org_id, emp_luka, srv_oxy), (org_id, emp_luka, srv_brows), (org_id, emp_luka, srv_lashes),
    (org_id, emp_ivan, srv_laser), (org_id, emp_ivan, srv_body), (org_id, emp_ivan, srv_massage),
    (org_id, emp_petra, srv_pedi), (org_id, emp_petra, srv_mani), (org_id, emp_petra, srv_brows), (org_id, emp_petra, srv_lashes)
  on conflict do nothing;

  insert into public.service_rooms (organization_id, service_id, room_id) values
    (org_id, srv_hydra, room_1), (org_id, srv_deep, room_1), (org_id, srv_oxy, room_1),
    (org_id, srv_hydra, room_2), (org_id, srv_oxy, room_2), (org_id, srv_brows, room_2), (org_id, srv_lashes, room_2),
    (org_id, srv_laser, room_3), (org_id, srv_body, room_3), (org_id, srv_massage, room_3),
    (org_id, srv_pedi, room_4), (org_id, srv_mani, room_4), (org_id, srv_brows, room_4), (org_id, srv_lashes, room_4)
  on conflict do nothing;

  ---------------------------------------------------------------------------
  -- 5. REALISTIC APPOINTMENT HISTORY + TODAY + FUTURE
  ---------------------------------------------------------------------------

  for d in select generate_series(CURRENT_DATE - 28, CURRENT_DATE + 14, interval '1 day')::date loop
    dow_i := extract(dow from d)::int;

    if dow_i between 1 and 6 then
      insert into public.employee_schedule_overrides (
        organization_id, employee_id, schedule_date, is_working, start_time, end_time, reason
      ) values
        (org_id, emp_ana, d, true, '08:00', '20:00', 'instagram_demo_seed'),
        (org_id, emp_luka, d, true, '08:00', '20:00', 'instagram_demo_seed'),
        (org_id, emp_ivan, d, true, '08:00', '20:00', 'instagram_demo_seed'),
        (org_id, emp_petra, d, true, '08:00', '20:00', 'instagram_demo_seed')
      on conflict do nothing;
    end if;
  end loop;

  for d in select generate_series(CURRENT_DATE - 28, CURRENT_DATE + 14, interval '1 day')::date loop
    dow_i := extract(dow from d)::int;
    if dow_i = 0 then
      continue;
    end if;

    if d < CURRENT_DATE then
      appt_status := case
        when extract(day from d)::int % 13 = 0 then 'no_show'::public.appointment_status
        when extract(day from d)::int % 11 = 0 then 'cancelled'::public.appointment_status
        else 'completed'::public.appointment_status
      end;
    elsif d = CURRENT_DATE then
      appt_status := 'confirmed'::public.appointment_status;
    else
      appt_status := case
        when extract(day from d)::int % 3 = 0 then 'confirmed'::public.appointment_status
        else 'scheduled'::public.appointment_status
      end;
    end if;

    -- Ana / Soba 1
    c_id := client_ids[((extract(day from d)::int + 2) % array_length(client_ids,1)) + 1];
    service_id := case when extract(day from d)::int % 2 = 0 then srv_hydra else srv_deep end;
    select name, price, duration_minutes into service_name, service_price, duration_minutes from public.services where id = service_id;
    start_at := '09:00';
    end_at := start_at + make_interval(mins => duration_minutes);

    insert into public.appointments (
      organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,
      status,client_name,client_phone,client_email,notes,source,total_price,currency
    )
    select org_id,c.id,emp_ana,room_1,d,start_at,end_at,appt_status,
      trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,null,
      'instagram_demo',service_price,'EUR'
    from public.clients c where c.id = c_id
    returning id into appt_id;

    insert into public.appointment_services (
      organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order
    ) values (org_id,appt_id,service_id,service_name,duration_minutes,service_price,'EUR',0);

    -- Luka / Soba 2
    c_id := client_ids[((extract(day from d)::int + 7) % array_length(client_ids,1)) + 1];
    service_id := case when extract(day from d)::int % 2 = 0 then srv_brows else srv_lashes end;
    select name, price, duration_minutes into service_name, service_price, duration_minutes from public.services where id = service_id;
    start_at := '11:00';
    end_at := start_at + make_interval(mins => duration_minutes);

    insert into public.appointments (
      organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,
      status,client_name,client_phone,client_email,notes,source,total_price,currency
    )
    select org_id,c.id,emp_luka,room_2,d,start_at,end_at,appt_status,
      trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,null,
      'instagram_demo',service_price,'EUR'
    from public.clients c where c.id = c_id
    returning id into appt_id;

    insert into public.appointment_services (
      organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order
    ) values (org_id,appt_id,service_id,service_name,duration_minutes,service_price,'EUR',0);

    -- Ivan / Soba 3
    if dow_i between 1 and 5 then
      c_id := client_ids[((extract(day from d)::int + 12) % array_length(client_ids,1)) + 1];
      service_id := case when extract(day from d)::int % 2 = 0 then srv_massage else srv_body end;
      select name, price, duration_minutes into service_name, service_price, duration_minutes from public.services where id = service_id;
      start_at := '14:00';
      end_at := start_at + make_interval(mins => duration_minutes);

      insert into public.appointments (
        organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,
        status,client_name,client_phone,client_email,notes,source,total_price,currency
      )
      select org_id,c.id,emp_ivan,room_3,d,start_at,end_at,appt_status,
        trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,
        case when d = CURRENT_DATE then 'Klijent preferira laganiji intenzitet tretmana.' end,
        'instagram_demo',service_price,'EUR'
      from public.clients c where c.id = c_id
      returning id into appt_id;

      insert into public.appointment_services (
        organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order
      ) values (org_id,appt_id,service_id,service_name,duration_minutes,service_price,'EUR',0);
    end if;

    -- Petra / Soba 4
    if dow_i between 2 and 6 then
      c_id := client_ids[((extract(day from d)::int + 17) % array_length(client_ids,1)) + 1];
      service_id := case when extract(day from d)::int % 2 = 0 then srv_mani else srv_pedi end;
      select name, price, duration_minutes into service_name, service_price, duration_minutes from public.services where id = service_id;
      start_at := '16:00';
      end_at := start_at + make_interval(mins => duration_minutes);

      insert into public.appointments (
        organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,
        status,client_name,client_phone,client_email,notes,source,total_price,currency
      )
      select org_id,c.id,emp_petra,room_4,d,start_at,end_at,appt_status,
        trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,null,
        'instagram_demo',service_price,'EUR'
      from public.clients c where c.id = c_id
      returning id into appt_id;

      insert into public.appointment_services (
        organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order
      ) values (org_id,appt_id,service_id,service_name,duration_minutes,service_price,'EUR',0);
    end if;
  end loop;

  delete from public.employee_schedule_overrides
  where organization_id = org_id
    and reason = 'instagram_demo_seed';

  raise notice 'SalonFlow clean demo seed complete for organization %.', org_id;
  raise notice 'Created: Ana Anić, Luka Lukić, Ivan Ivić, Petra Perić; Soba 1-4; 10 real services; 25 generic clients; 43 days of appointments.';
end $$;
