-- SalonFlow realistic demo data for screenshots / Instagram recordings.
-- IMPORTANT: This is intentionally NOT a migration. Run manually in Supabase SQL Editor.
-- Safe to run repeatedly: records are matched by deterministic names / contact data before inserts.
--
-- Target organization selection:
-- 1) If you have exactly one active organization, it is selected automatically.
-- 2) If you have more than one, set target_slug below to the salon you want to populate.
--
-- Example:
--   target_slug text := 'body-and-soul-demo';
--
-- The script creates realistic data around CURRENT_DATE, so Dashboard / Calendar / Reports
-- remain useful whenever you run it.

do $$
declare
  target_slug text := null; -- SET THIS ONLY IF YOU HAVE MORE THAN ONE ACTIVE ORGANIZATION.
  org_id uuid;
  active_org_count integer;

  emp_elizabeth uuid;
  emp_lea uuid;
  emp_vita uuid;
  emp_mia uuid;

  room_face uuid;
  room_body uuid;
  room_pedi uuid;

  srv_hydra uuid;
  srv_deep_face uuid;
  srv_oxy uuid;
  srv_laser uuid;
  srv_vela uuid;
  srv_massage uuid;
  srv_pedi uuid;
  srv_mani uuid;
  srv_brows uuid;
  srv_lashes uuid;

  client_ids uuid[] := array[]::uuid[];
  client_names text[] := array[
    'Ana Horvat','Marija Kovač','Ivana Jurić','Petra Radić','Lucija Babić',
    'Martina Novak','Sara Grgić','Nina Pavletić','Tea Marić','Karla Perić',
    'Ema Vuković','Lana Šarić','Mia Barišić','Andrea Kralj','Iva Tomić',
    'Maja Knežević','Lea Božić','Helena Matić','Dora Lovrić','Tina Flego',
    'Paola Benussi','Elena Rocco','Chiara Degrassi','Sofia Bianchi','Laura Rossi'
  ];
  phones text[] := array[
    '+385 91 555 0101','+385 98 420 115','+385 99 231 880','+385 91 602 441','+385 95 771 024',
    '+385 98 334 908','+385 91 449 661','+385 99 808 272','+385 95 123 754','+385 98 700 331',
    '+385 91 240 965','+385 99 536 123','+385 95 660 872','+385 98 440 219','+385 91 725 540',
    '+385 99 307 118','+385 95 880 226','+385 98 991 014','+385 91 410 733','+385 99 610 842',
    '+39 347 550 1180','+39 340 721 6642','+39 333 892 1114','+39 348 412 0910','+39 339 551 7204'
  ];
  i integer;
  first_part text;
  last_part text;
  c_id uuid;
  d date;
  appt_id uuid;
  employee_id uuid;
  room_id uuid;
  service_id uuid;
  service_name text;
  duration_min integer;
  start_t time;
  end_t time;
  status_text text;
  price_value numeric(10,2);
  day_index integer;
begin
  select count(*) into active_org_count from public.organizations where is_active = true;

  if target_slug is not null then
    select id into org_id
    from public.organizations
    where slug = target_slug and is_active = true
    limit 1;

    if org_id is null then
      raise exception 'No active organization found for slug: %', target_slug;
    end if;
  elsif active_org_count = 1 then
    select id into org_id from public.organizations where is_active = true limit 1;
  else
    raise exception 'Found % active organizations. Set target_slug at the top of supabase/demo_seed_instagram.sql before running it.', active_org_count;
  end if;

  -- Give the selected organization presentation-ready salon details without changing its slug.
  update public.organizations
  set
    name = 'Atelier Beauty & Wellness',
    phone = '+385 52 555 410',
    email = 'hello@atelier-beauty.hr',
    address_line_1 = 'Ulica Grisia 18',
    city = 'Rovinj',
    postal_code = '52210',
    country_code = 'HR',
    timezone = 'Europe/Zagreb',
    locale = 'hr',
    currency = 'EUR'
  where id = org_id;

  -- EMPLOYEES ---------------------------------------------------------------
  insert into public.employees (organization_id, first_name, last_name, email, phone, color, job_title, notes, is_active, sort_order)
  values
    (org_id,'Elizabeth','Dobrović','elizabeth@atelier-beauty.hr','+385 91 552 1100','#7C3AED','Vlasnica · senior terapeut','Specijalizirana za tretmane lica i napredne uređaje.',true,1),
    (org_id,'Lea','Marić','lea@atelier-beauty.hr','+385 98 331 442','#2563EB','Kozmetičarka','Njega lica, manikura, obrve i trepavice.',true,2),
    (org_id,'Vita','Jurić','vita@atelier-beauty.hr','+385 99 221 880','#059669','Body terapeut','Masaže, oblikovanje tijela i aparativni tretmani.',true,3),
    (org_id,'Mia','Rossi','mia@atelier-beauty.hr','+385 95 443 221','#DB2777','Nail & beauty terapeut','Pedikura, manikura i beauty tretmani.',true,4)
  on conflict (organization_id, email) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    phone = excluded.phone,
    color = excluded.color,
    job_title = excluded.job_title,
    notes = excluded.notes,
    is_active = true,
    sort_order = excluded.sort_order;

  select id into emp_elizabeth from public.employees where organization_id=org_id and email='elizabeth@atelier-beauty.hr';
  select id into emp_lea from public.employees where organization_id=org_id and email='lea@atelier-beauty.hr';
  select id into emp_vita from public.employees where organization_id=org_id and email='vita@atelier-beauty.hr';
  select id into emp_mia from public.employees where organization_id=org_id and email='mia@atelier-beauty.hr';

  -- ROOMS -------------------------------------------------------------------
  insert into public.rooms (organization_id, name, description, capacity, color, is_active, sort_order)
  values
    (org_id,'Studio Glow','Tretmani lica, obrve i premium facial protokoli.',1,'#A78BFA',true,1),
    (org_id,'Studio Body','Masaže, laser i tretmani oblikovanja tijela.',1,'#34D399',true,2),
    (org_id,'Nail Lounge','Manikura i pedikura u izdvojenom beauty prostoru.',1,'#F9A8D4',true,3)
  on conflict (organization_id, name) do update set
    description=excluded.description, capacity=excluded.capacity, color=excluded.color, is_active=true, sort_order=excluded.sort_order;

  select id into room_face from public.rooms where organization_id=org_id and name='Studio Glow';
  select id into room_body from public.rooms where organization_id=org_id and name='Studio Body';
  select id into room_pedi from public.rooms where organization_id=org_id and name='Nail Lounge';

  -- SERVICES ----------------------------------------------------------------
  insert into public.services (organization_id,name,category,description,duration_minutes,cleanup_minutes,price,currency,color,is_active,sort_order)
  values
    (org_id,'Hydra Glow Ritual','Njega lica','Dubinsko čišćenje, hidratacija i završni glow protokol.',60,10,85,'EUR','#8B5CF6',true,1),
    (org_id,'Deep Clean Facial','Njega lica','Dubinsko čišćenje prilagođeno stanju kože.',75,10,78,'EUR','#A78BFA',true,2),
    (org_id,'Oxy Infusion','Njega lica','Oksigenacija i intenzivna hidratacija kože.',45,10,65,'EUR','#C4B5FD',true,3),
    (org_id,'Laser epilacija · noge','Laser epilacija','Laserska epilacija cijelih nogu.',60,10,120,'EUR','#0EA5E9',true,4),
    (org_id,'Body Sculpt Pro','Oblikovanje tijela','Aparativni tretman oblikovanja i toniranja tijela.',50,10,75,'EUR','#10B981',true,5),
    (org_id,'Relax masaža 60','Masaže','Opuštajuća masaža cijelog tijela.',60,10,60,'EUR','#14B8A6',true,6),
    (org_id,'Spa pedikura','Ruke i stopala','Kompletna estetska pedikura s njegom.',60,10,45,'EUR','#EC4899',true,7),
    (org_id,'Gel manikura','Ruke i stopala','Uređivanje noktiju i trajni lak.',60,10,38,'EUR','#F472B6',true,8),
    (org_id,'Brow Design','Obrve i trepavice','Oblikovanje i bojenje obrva.',30,5,25,'EUR','#F59E0B',true,9),
    (org_id,'Lash Lift','Obrve i trepavice','Podizanje i bojenje prirodnih trepavica.',60,10,48,'EUR','#D97706',true,10)
  on conflict (organization_id, name) do update set
    category=excluded.category, description=excluded.description, duration_minutes=excluded.duration_minutes,
    cleanup_minutes=excluded.cleanup_minutes, price=excluded.price, currency='EUR', color=excluded.color, is_active=true, sort_order=excluded.sort_order;

  select id into srv_hydra from public.services where organization_id=org_id and name='Hydra Glow Ritual';
  select id into srv_deep_face from public.services where organization_id=org_id and name='Deep Clean Facial';
  select id into srv_oxy from public.services where organization_id=org_id and name='Oxy Infusion';
  select id into srv_laser from public.services where organization_id=org_id and name='Laser epilacija · noge';
  select id into srv_vela from public.services where organization_id=org_id and name='Body Sculpt Pro';
  select id into srv_massage from public.services where organization_id=org_id and name='Relax masaža 60';
  select id into srv_pedi from public.services where organization_id=org_id and name='Spa pedikura';
  select id into srv_mani from public.services where organization_id=org_id and name='Gel manikura';
  select id into srv_brows from public.services where organization_id=org_id and name='Brow Design';
  select id into srv_lashes from public.services where organization_id=org_id and name='Lash Lift';

  -- EQUIPMENT ---------------------------------------------------------------
  insert into public.equipment (organization_id,name,description,quantity_total,is_active,sort_order)
  values
    (org_id,'Diode Laser 808','Profesionalni diode laser za epilaciju.',1,true,1),
    (org_id,'Body Sculpt uređaj','Aparat za oblikovanje i toniranje tijela.',1,true,2),
    (org_id,'Oxy Infusion uređaj','Uređaj za oksigenaciju i infuziju aktivnih sastojaka.',1,true,3),
    (org_id,'LED maska','LED terapija kao dodatak facial protokolima.',2,true,4)
  on conflict (organization_id,name) do update set description=excluded.description, quantity_total=excluded.quantity_total, is_active=true, sort_order=excluded.sort_order;

  -- CLIENTS -----------------------------------------------------------------
  for i in 1..array_length(client_names,1) loop
    first_part := split_part(client_names[i], ' ', 1);
    last_part := substring(client_names[i] from position(' ' in client_names[i]) + 1);

    select id into c_id
    from public.clients
    where organization_id = org_id and phone = phones[i]
    limit 1;

    if c_id is null then
      insert into public.clients (
        organization_id, first_name, last_name, email, phone, date_of_birth, notes,
        marketing_consent, is_active, created_at
      ) values (
        org_id,
        first_part,
        last_part,
        lower(regexp_replace(first_part || '.' || last_part, '[^a-zA-Z0-9.]', '', 'g')) || '@example.com',
        phones[i],
        date '1982-01-01' + ((i * 347) % 7000),
        case
          when i=2 then 'Preferira nježnije tretmane i termin poslije 16 h.'
          when i=5 then 'Osjetljiva koža. Izbjegavati agresivne pilinge.'
          when i=8 then 'Redovna klijentica za facial tretmane.'
          when i=12 then 'Najčešće rezervira masažu i body tretmane.'
          else null
        end,
        (i % 3 <> 0),
        true,
        now() - make_interval(days => (35 - i))
      ) returning id into c_id;
    end if;

    client_ids := array_append(client_ids, c_id);
  end loop;

  -- DEFAULT EMPLOYEE SCHEDULES ---------------------------------------------
  if to_regclass('public.employee_default_schedule') is not null then
    -- Sunday (0) closed for everyone.
    insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
    select org_id, e, 0, false, null, null
    from unnest(array[emp_elizabeth,emp_lea,emp_vita,emp_mia]) e
    on conflict (employee_id,day_of_week) do update set is_working=false,start_time=null,end_time=null;

    -- Elizabeth Mon-Fri 09-17, Sat 09-14
    for day_index in 1..5 loop
      insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
      values (org_id,emp_elizabeth,day_index,true,'09:00','17:00')
      on conflict (employee_id,day_of_week) do update set is_working=true,start_time='09:00',end_time='17:00';
    end loop;
    insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
    values (org_id,emp_elizabeth,6,true,'09:00','14:00')
    on conflict (employee_id,day_of_week) do update set is_working=true,start_time='09:00',end_time='14:00';

    -- Lea Mon-Sat 08-15
    for day_index in 1..6 loop
      insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
      values (org_id,emp_lea,day_index,true,'08:00','15:00')
      on conflict (employee_id,day_of_week) do update set is_working=true,start_time='08:00',end_time='15:00';
    end loop;

    -- Vita Mon-Fri 12-20, Sat off
    for day_index in 1..5 loop
      insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
      values (org_id,emp_vita,day_index,true,'12:00','20:00')
      on conflict (employee_id,day_of_week) do update set is_working=true,start_time='12:00',end_time='20:00';
    end loop;
    insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
    values (org_id,emp_vita,6,false,null,null)
    on conflict (employee_id,day_of_week) do update set is_working=false,start_time=null,end_time=null;

    -- Mia Tue-Sat 10-18; Monday off.
    insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
    values (org_id,emp_mia,1,false,null,null)
    on conflict (employee_id,day_of_week) do update set is_working=false,start_time=null,end_time=null;
    for day_index in 2..6 loop
      insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time)
      values (org_id,emp_mia,day_index,true,'10:00','18:00')
      on conflict (employee_id,day_of_week) do update set is_working=true,start_time='10:00',end_time='18:00';
    end loop;
  end if;

  -- SERVICE ↔ EMPLOYEE mappings (only if the table exists in this installation).
  if to_regclass('public.employee_services') is not null then
    execute format($sql$
      insert into public.employee_services (organization_id,employee_id,service_id)
      values
        (%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),
        (%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),
        (%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),
        (%L,%L,%L),(%L,%L,%L)
      on conflict do nothing
    $sql$,
      org_id,emp_elizabeth,srv_hydra, org_id,emp_elizabeth,srv_deep_face, org_id,emp_elizabeth,srv_oxy,
      org_id,emp_elizabeth,srv_laser, org_id,emp_elizabeth,srv_vela,
      org_id,emp_lea,srv_hydra, org_id,emp_lea,srv_deep_face, org_id,emp_lea,srv_oxy, org_id,emp_lea,srv_brows, org_id,emp_lea,srv_lashes,
      org_id,emp_vita,srv_laser, org_id,emp_vita,srv_vela, org_id,emp_vita,srv_massage,
      org_id,emp_mia,srv_pedi, org_id,emp_mia,srv_mani, org_id,emp_mia,srv_brows, org_id,emp_mia,srv_lashes
    );
  end if;

  -- SERVICE ↔ ROOM mappings.
  if to_regclass('public.service_rooms') is not null then
    execute format($sql$
      insert into public.service_rooms (organization_id,service_id,room_id)
      values
        (%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),
        (%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L),(%L,%L,%L)
      on conflict do nothing
    $sql$,
      org_id,srv_hydra,room_face, org_id,srv_deep_face,room_face, org_id,srv_oxy,room_face,
      org_id,srv_brows,room_face, org_id,srv_lashes,room_face,
      org_id,srv_laser,room_body, org_id,srv_vela,room_body, org_id,srv_massage,room_body,
      org_id,srv_pedi,room_pedi, org_id,srv_mani,room_pedi
    );
  end if;

  -- APPOINTMENTS ------------------------------------------------------------
  -- Remove only appointments previously generated by this demo seed.
  delete from public.appointments
  where organization_id = org_id and source = 'instagram_demo';

  -- Generate approximately 4 weeks of history + today + 2 future weeks.
  -- Each employee uses a dedicated room/time pattern, avoiding conflicts.
  for d in select generate_series(CURRENT_DATE - 28, CURRENT_DATE + 14, interval '1 day')::date loop
    if extract(dow from d)::int = 0 then
      continue;
    end if;

    -- Elizabeth: facial-focused morning/day schedule.
    for i in 0..3 loop
      if (d < CURRENT_DATE and (extract(day from d)::int + i) % 5 = 0) then
        continue;
      end if;

      start_t := (time '09:00' + make_interval(mins => i * 105))::time;
      duration_min := case when i=1 then 75 else 60 end;
      end_t := (start_t + make_interval(mins => duration_min))::time;
      service_id := case i when 0 then srv_hydra when 1 then srv_deep_face when 2 then srv_oxy else srv_hydra end;
      select name, price into service_name, price_value from public.services where id=service_id;
      c_id := client_ids[1 + ((extract(day from d)::int + i*3) % array_length(client_ids,1))];
      status_text := case
        when d < CURRENT_DATE then case when (extract(day from d)::int+i)%11=0 then 'no_show' when (extract(day from d)::int+i)%9=0 then 'cancelled' else 'completed' end
        when d = CURRENT_DATE and start_t < localtime then 'completed'
        when d <= CURRENT_DATE + 2 then 'confirmed'
        else 'scheduled'
      end;

      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,notes,source,total_price,currency)
      select org_id,c_id,emp_elizabeth,room_face,d,start_t,end_t,status_text::public.appointment_status,
             trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,
             case when i=0 and d=CURRENT_DATE then 'Kontrola hidratacije i preporuka kućne njege.' else null end,
             'instagram_demo',price_value,'EUR'
      from public.clients c where c.id=c_id
      returning id into appt_id;

      insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order)
      values (org_id,appt_id,service_id,service_name,duration_min,price_value,'EUR',0);
    end loop;

    -- Lea: early shift; every weekday and Saturday.
    for i in 0..3 loop
      start_t := (time '08:00' + make_interval(mins => i * 90))::time;
      duration_min := case i when 2 then 30 else 60 end;
      end_t := (start_t + make_interval(mins => duration_min))::time;
      service_id := case i when 0 then srv_lashes when 1 then srv_hydra when 2 then srv_brows else srv_oxy end;
      select name, price into service_name, price_value from public.services where id=service_id;
      c_id := client_ids[1 + ((extract(day from d)::int + i*4 + 5) % array_length(client_ids,1))];
      status_text := case when d < CURRENT_DATE then 'completed' when d=CURRENT_DATE and start_t<localtime then 'completed' when d<=CURRENT_DATE+3 then 'confirmed' else 'scheduled' end;

      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,source,total_price,currency)
      select org_id,c_id,emp_lea,room_face,d,start_t,end_t,status_text::public.appointment_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,'instagram_demo',price_value,'EUR'
      from public.clients c where c.id=c_id
      returning id into appt_id;
      insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order)
      values (org_id,appt_id,service_id,service_name,duration_min,price_value,'EUR',0);
    end loop;

    -- Vita Mon-Fri, afternoon body room.
    if extract(dow from d)::int between 1 and 5 then
      for i in 0..3 loop
        start_t := (time '12:00' + make_interval(mins => i * 105))::time;
        duration_min := case i when 0 then 60 when 1 then 50 when 2 then 60 else 50 end;
        end_t := (start_t + make_interval(mins => duration_min))::time;
        service_id := case i when 0 then srv_massage when 1 then srv_vela when 2 then srv_laser else srv_vela end;
        select name, price into service_name, price_value from public.services where id=service_id;
        c_id := client_ids[1 + ((extract(day from d)::int + i*5 + 9) % array_length(client_ids,1))];
        status_text := case when d < CURRENT_DATE then case when (extract(day from d)::int+i)%13=0 then 'no_show' else 'completed' end when d<=CURRENT_DATE+2 then 'confirmed' else 'scheduled' end;

        insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,source,total_price,currency)
        select org_id,c_id,emp_vita,room_body,d,start_t,end_t,status_text::public.appointment_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,'instagram_demo',price_value,'EUR'
        from public.clients c where c.id=c_id
        returning id into appt_id;
        insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order)
        values (org_id,appt_id,service_id,service_name,duration_min,price_value,'EUR',0);
      end loop;
    end if;

    -- Mia Tue-Sat in Nail Lounge.
    if extract(dow from d)::int between 2 and 6 then
      for i in 0..3 loop
        start_t := (time '10:00' + make_interval(mins => i * 105))::time;
        duration_min := 60;
        end_t := (start_t + interval '60 minutes')::time;
        service_id := case when i%2=0 then srv_pedi else srv_mani end;
        select name, price into service_name, price_value from public.services where id=service_id;
        c_id := client_ids[1 + ((extract(day from d)::int + i*2 + 14) % array_length(client_ids,1))];
        status_text := case when d < CURRENT_DATE then 'completed' when d<=CURRENT_DATE+2 then 'confirmed' else 'scheduled' end;

        insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,source,total_price,currency)
        select org_id,c_id,emp_mia,room_pedi,d,start_t,end_t,status_text::public.appointment_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,'instagram_demo',price_value,'EUR'
        from public.clients c where c.id=c_id
        returning id into appt_id;
        insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order)
        values (org_id,appt_id,service_id,service_name,duration_min,price_value,'EUR',0);
      end loop;
    end if;
  end loop;

  raise notice 'Instagram demo seed completed for organization %.', org_id;
  raise notice 'Employees: 4 | Services: 10 | Rooms: 3 | Clients: % | Appointment window: % to %', array_length(client_ids,1), CURRENT_DATE-28, CURRENT_DATE+14;
end $$;
