-- SalonFlow Instagram demo dataset v2
-- Run manually in Supabase SQL Editor. This is NOT a migration.
-- Designed to respect runtime appointment validation rules.
-- Safe to rerun: demo appointments are deleted/recreated by source='instagram_demo'.

do $$
declare
  target_slug text := null;
  org_id uuid;
  org_count integer;

  emp_elizabeth uuid;
  emp_lea uuid;
  emp_vita uuid;
  emp_mia uuid;

  room_glow uuid;
  room_beauty uuid;
  room_body uuid;
  room_nails uuid;

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

  names text[] := array[
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
  client_ids uuid[] := array[]::uuid[];

  i integer;
  dow_i integer;
  first_name text;
  last_name text;
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
  select count(*) into org_count from public.organizations where is_active=true;

  if target_slug is not null then
    select id into org_id from public.organizations where slug=target_slug and is_active=true limit 1;
  elsif org_count = 1 then
    select id into org_id from public.organizations where is_active=true limit 1;
  else
    raise exception 'Found % active organizations. Set target_slug at the top of supabase/demo_seed_instagram_v2.sql.', org_count;
  end if;

  if org_id is null then raise exception 'Target organization not found.'; end if;

  update public.organizations set
    name='Atelier Beauty & Wellness',
    phone='+385 52 555 410',
    email='hello@atelier-beauty.hr',
    address_line_1='Ulica Grisia 18',
    city='Rovinj',
    postal_code='52210',
    country_code='HR',
    timezone='Europe/Zagreb',
    locale='hr',
    currency='EUR'
  where id=org_id;

  insert into public.employees (organization_id,first_name,last_name,email,phone,color,job_title,notes,is_active,sort_order)
  values
    (org_id,'Elizabeth','Dobrović','elizabeth@atelier-beauty.hr','+385 91 552 1100','#7C3AED','Vlasnica · senior terapeut','Specijalizirana za tretmane lica i napredne uređaje.',true,1),
    (org_id,'Lea','Marić','lea@atelier-beauty.hr','+385 98 331 442','#2563EB','Kozmetičarka','Njega lica, obrve i trepavice.',true,2),
    (org_id,'Vita','Jurić','vita@atelier-beauty.hr','+385 99 221 880','#059669','Body terapeut','Masaže, oblikovanje tijela i aparativni tretmani.',true,3),
    (org_id,'Mia','Rossi','mia@atelier-beauty.hr','+385 95 443 221','#DB2777','Nail & beauty terapeut','Pedikura i manikura.',true,4)
  on conflict (organization_id,email) do update set
    first_name=excluded.first_name,last_name=excluded.last_name,phone=excluded.phone,color=excluded.color,
    job_title=excluded.job_title,notes=excluded.notes,is_active=true,sort_order=excluded.sort_order;

  select id into emp_elizabeth from public.employees where organization_id=org_id and email='elizabeth@atelier-beauty.hr';
  select id into emp_lea from public.employees where organization_id=org_id and email='lea@atelier-beauty.hr';
  select id into emp_vita from public.employees where organization_id=org_id and email='vita@atelier-beauty.hr';
  select id into emp_mia from public.employees where organization_id=org_id and email='mia@atelier-beauty.hr';

  insert into public.rooms (organization_id,name,description,capacity,color,is_active,sort_order)
  values
    (org_id,'Studio Glow','Premium tretmani lica i napredni facial protokoli.',1,'#A78BFA',true,1),
    (org_id,'Beauty Bar','Obrve, trepavice i brzi beauty tretmani.',1,'#60A5FA',true,2),
    (org_id,'Studio Body','Masaže, laser i oblikovanje tijela.',1,'#34D399',true,3),
    (org_id,'Nail Lounge','Manikura i pedikura.',1,'#F9A8D4',true,4)
  on conflict (organization_id,name) do update set
    description=excluded.description,capacity=excluded.capacity,color=excluded.color,is_active=true,sort_order=excluded.sort_order;

  select id into room_glow from public.rooms where organization_id=org_id and name='Studio Glow';
  select id into room_beauty from public.rooms where organization_id=org_id and name='Beauty Bar';
  select id into room_body from public.rooms where organization_id=org_id and name='Studio Body';
  select id into room_nails from public.rooms where organization_id=org_id and name='Nail Lounge';

  insert into public.services (organization_id,name,category,description,duration_minutes,cleanup_minutes,price,currency,color,is_active,sort_order)
  values
    (org_id,'Hydra Glow Ritual','Njega lica','Dubinsko čišćenje, hidratacija i glow završnica.',60,10,85,'EUR','#8B5CF6',true,1),
    (org_id,'Deep Clean Facial','Njega lica','Dubinsko čišćenje prilagođeno stanju kože.',75,10,78,'EUR','#A78BFA',true,2),
    (org_id,'Oxy Infusion','Njega lica','Oksigenacija i intenzivna hidratacija kože.',45,10,65,'EUR','#C4B5FD',true,3),
    (org_id,'Laser epilacija · noge','Laser epilacija','Laserska epilacija cijelih nogu.',60,10,120,'EUR','#0EA5E9',true,4),
    (org_id,'Body Sculpt Pro','Oblikovanje tijela','Aparativni tretman oblikovanja i toniranja tijela.',50,10,75,'EUR','#10B981',true,5),
    (org_id,'Relax masaža 60','Masaže','Opuštajuća masaža cijelog tijela.',60,10,60,'EUR','#14B8A6',true,6),
    (org_id,'Spa pedikura','Ruke i stopala','Kompletna estetska pedikura s njegom.',60,10,45,'EUR','#EC4899',true,7),
    (org_id,'Gel manikura','Ruke i stopala','Uređivanje noktiju i trajni lak.',60,10,38,'EUR','#F472B6',true,8),
    (org_id,'Brow Design','Obrve i trepavice','Oblikovanje i bojenje obrva.',30,5,25,'EUR','#F59E0B',true,9),
    (org_id,'Lash Lift','Obrve i trepavice','Podizanje i bojenje prirodnih trepavica.',60,10,48,'EUR','#D97706',true,10)
  on conflict (organization_id,name) do update set
    category=excluded.category,description=excluded.description,duration_minutes=excluded.duration_minutes,
    cleanup_minutes=excluded.cleanup_minutes,price=excluded.price,currency='EUR',color=excluded.color,is_active=true,sort_order=excluded.sort_order;

  select id into srv_hydra from public.services where organization_id=org_id and name='Hydra Glow Ritual';
  select id into srv_deep from public.services where organization_id=org_id and name='Deep Clean Facial';
  select id into srv_oxy from public.services where organization_id=org_id and name='Oxy Infusion';
  select id into srv_laser from public.services where organization_id=org_id and name='Laser epilacija · noge';
  select id into srv_body from public.services where organization_id=org_id and name='Body Sculpt Pro';
  select id into srv_massage from public.services where organization_id=org_id and name='Relax masaža 60';
  select id into srv_pedi from public.services where organization_id=org_id and name='Spa pedikura';
  select id into srv_mani from public.services where organization_id=org_id and name='Gel manikura';
  select id into srv_brows from public.services where organization_id=org_id and name='Brow Design';
  select id into srv_lashes from public.services where organization_id=org_id and name='Lash Lift';

  insert into public.equipment (organization_id,name,description,quantity_total,is_active,sort_order)
  values
    (org_id,'Diode Laser 808','Profesionalni diode laser za epilaciju.',1,true,1),
    (org_id,'Body Sculpt uređaj','Uređaj za oblikovanje i toniranje tijela.',1,true,2),
    (org_id,'Oxy Infusion uređaj','Uređaj za oksigenaciju i infuziju aktivnih sastojaka.',1,true,3),
    (org_id,'LED maska','LED terapija kao dodatak facial tretmanima.',2,true,4)
  on conflict (organization_id,name) do update set
    description=excluded.description,quantity_total=excluded.quantity_total,is_active=true,sort_order=excluded.sort_order;

  for i in 1..array_length(names,1) loop
    first_name := split_part(names[i],' ',1);
    last_name := substring(names[i] from position(' ' in names[i])+1);
    select id into c_id from public.clients where organization_id=org_id and phone=phones[i] limit 1;
    if c_id is null then
      insert into public.clients (organization_id,first_name,last_name,email,phone,date_of_birth,notes,marketing_consent,is_active,created_at)
      values (
        org_id,first_name,last_name,
        lower(regexp_replace(first_name||'.'||last_name,'[^a-zA-Z0-9.]','','g'))||'@example.com',
        phones[i],date '1983-01-01'+((i*311)%6500),
        case when i=5 then 'Osjetljiva koža · izbjegavati agresivne pilinge.'
             when i=8 then 'Redovna klijentica za facial tretmane.'
             when i=12 then 'Najčešće rezervira masažu i body tretmane.'
             when i=17 then 'Preferira jutarnje termine.' else null end,
        (i%3<>0),true,now()-make_interval(days=>(40-i))
      ) returning id into c_id;
    end if;
    client_ids := array_append(client_ids,c_id);
  end loop;

  -- Realistic weekly schedules used in normal UI after seeding.
  if to_regclass('public.employee_default_schedule') is not null then
    delete from public.employee_default_schedule where organization_id=org_id and employee_id in (emp_elizabeth,emp_lea,emp_vita,emp_mia);
    for dow_i in 0..6 loop
      insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time) values
        (org_id,emp_elizabeth,dow_i,(dow_i between 1 and 6),case when dow_i between 1 and 6 then '09:00'::time else null end,case when dow_i between 1 and 5 then '17:00'::time when dow_i=6 then '14:00'::time else null end),
        (org_id,emp_lea,dow_i,(dow_i between 1 and 6),case when dow_i between 1 and 6 then '08:00'::time else null end,case when dow_i between 1 and 6 then '15:00'::time else null end),
        (org_id,emp_vita,dow_i,(dow_i between 1 and 5),case when dow_i between 1 and 5 then '12:00'::time else null end,case when dow_i between 1 and 5 then '20:00'::time else null end),
        (org_id,emp_mia,dow_i,(dow_i between 2 and 6),case when dow_i between 2 and 6 then '10:00'::time else null end,case when dow_i between 2 and 6 then '18:00'::time else null end);
    end loop;
  end if;

  if to_regclass('public.employee_services') is not null then
    delete from public.employee_services where organization_id=org_id and employee_id in (emp_elizabeth,emp_lea,emp_vita,emp_mia);
    insert into public.employee_services (organization_id,employee_id,service_id) values
      (org_id,emp_elizabeth,srv_hydra),(org_id,emp_elizabeth,srv_deep),(org_id,emp_elizabeth,srv_oxy),(org_id,emp_elizabeth,srv_laser),(org_id,emp_elizabeth,srv_body),
      (org_id,emp_lea,srv_hydra),(org_id,emp_lea,srv_oxy),(org_id,emp_lea,srv_brows),(org_id,emp_lea,srv_lashes),
      (org_id,emp_vita,srv_laser),(org_id,emp_vita,srv_body),(org_id,emp_vita,srv_massage),
      (org_id,emp_mia,srv_pedi),(org_id,emp_mia,srv_mani),(org_id,emp_mia,srv_brows),(org_id,emp_mia,srv_lashes)
    on conflict do nothing;
  end if;

  if to_regclass('public.service_rooms') is not null then
    delete from public.service_rooms where organization_id=org_id and service_id in (srv_hydra,srv_deep,srv_oxy,srv_laser,srv_body,srv_massage,srv_pedi,srv_mani,srv_brows,srv_lashes);
    insert into public.service_rooms (organization_id,service_id,room_id) values
      (org_id,srv_hydra,room_glow),(org_id,srv_deep,room_glow),(org_id,srv_oxy,room_glow),
      (org_id,srv_hydra,room_beauty),(org_id,srv_oxy,room_beauty),(org_id,srv_brows,room_beauty),(org_id,srv_lashes,room_beauty),
      (org_id,srv_laser,room_body),(org_id,srv_body,room_body),(org_id,srv_massage,room_body),
      (org_id,srv_pedi,room_nails),(org_id,srv_mani,room_nails),(org_id,srv_brows,room_nails),(org_id,srv_lashes,room_nails)
    on conflict do nothing;
  end if;

  delete from public.appointments where organization_id=org_id and source='instagram_demo';

  -- Temporary exact-date working overrides make the seed compatible with the same runtime
  -- validator used by normal appointment creation. They are removed again at the end.
  if to_regclass('public.employee_schedule_overrides') is not null then
    delete from public.employee_schedule_overrides
    where organization_id=org_id
      and employee_id in (emp_elizabeth,emp_lea,emp_vita,emp_mia)
      and reason='instagram_demo_seed';

    for d in select generate_series(CURRENT_DATE-28,CURRENT_DATE+14,interval '1 day')::date loop
      dow_i := extract(dow from d)::int;
      if dow_i between 1 and 6 then
        insert into public.employee_schedule_overrides (organization_id,employee_id,schedule_date,is_working,start_time,end_time,reason)
        values
          (org_id,emp_elizabeth,d,true,'08:00','20:00','instagram_demo_seed'),
          (org_id,emp_lea,d,true,'07:00','20:00','instagram_demo_seed')
        on conflict (employee_id,schedule_date) do update set is_working=true,start_time=excluded.start_time,end_time=excluded.end_time,reason='instagram_demo_seed';
      end if;
      if dow_i between 1 and 5 then
        insert into public.employee_schedule_overrides (organization_id,employee_id,schedule_date,is_working,start_time,end_time,reason)
        values (org_id,emp_vita,d,true,'11:00','21:00','instagram_demo_seed')
        on conflict (employee_id,schedule_date) do update set is_working=true,start_time=excluded.start_time,end_time=excluded.end_time,reason='instagram_demo_seed';
      end if;
      if dow_i between 2 and 6 then
        insert into public.employee_schedule_overrides (organization_id,employee_id,schedule_date,is_working,start_time,end_time,reason)
        values (org_id,emp_mia,d,true,'09:00','19:00','instagram_demo_seed')
        on conflict (employee_id,schedule_date) do update set is_working=true,start_time=excluded.start_time,end_time=excluded.end_time,reason='instagram_demo_seed';
      end if;
    end loop;
  end if;

  for d in select generate_series(CURRENT_DATE-28,CURRENT_DATE+14,interval '1 day')::date loop
    dow_i := extract(dow from d)::int;
    if dow_i=0 then continue; end if;

    -- Elizabeth · Studio Glow
    for i in 0..3 loop
      st := (time '09:00'+make_interval(mins=>i*90))::time;
      s_id := case i when 0 then srv_hydra when 1 then srv_deep when 2 then srv_oxy else srv_hydra end;
      select name,duration_minutes,price into s_name,dur,s_price from public.services where id=s_id;
      et := (st+make_interval(mins=>dur))::time;
      c_id := client_ids[1+((extract(day from d)::int+i*3)%array_length(client_ids,1))];
      appt_status := case when d<CURRENT_DATE then (case when (extract(day from d)::int+i)%13=0 then 'no_show' when (extract(day from d)::int+i)%11=0 then 'cancelled' else 'completed' end)::public.appointment_status when d=CURRENT_DATE and st<localtime then 'completed' when d<=CURRENT_DATE+2 then 'confirmed' else 'scheduled' end;
      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,notes,source,total_price,currency)
      select org_id,c_id,emp_elizabeth,room_glow,d,st,et,appt_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,case when d=CURRENT_DATE and i=0 then 'Kontrola hidratacije i preporuka kućne njege.' end,'instagram_demo',s_price,'EUR' from public.clients c where c.id=c_id returning id into appt_id;
      insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values (org_id,appt_id,s_id,s_name,dur,s_price,'EUR',0);
    end loop;

    -- Lea · Beauty Bar
    for i in 0..3 loop
      st := (time '08:00'+make_interval(mins=>i*90))::time;
      s_id := case i when 0 then srv_lashes when 1 then srv_hydra when 2 then srv_brows else srv_oxy end;
      select name,duration_minutes,price into s_name,dur,s_price from public.services where id=s_id;
      et := (st+make_interval(mins=>dur))::time;
      c_id := client_ids[1+((extract(day from d)::int+i*4+5)%array_length(client_ids,1))];
      appt_status := case when d<CURRENT_DATE then 'completed' when d=CURRENT_DATE and st<localtime then 'completed' when d<=CURRENT_DATE+3 then 'confirmed' else 'scheduled' end;
      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,source,total_price,currency)
      select org_id,c_id,emp_lea,room_beauty,d,st,et,appt_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,'instagram_demo',s_price,'EUR' from public.clients c where c.id=c_id returning id into appt_id;
      insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values (org_id,appt_id,s_id,s_name,dur,s_price,'EUR',0);
    end loop;

    if dow_i between 1 and 5 then
      -- Vita · Studio Body
      for i in 0..3 loop
        st := (time '12:00'+make_interval(mins=>i*105))::time;
        s_id := case i when 0 then srv_massage when 1 then srv_body when 2 then srv_laser else srv_body end;
        select name,duration_minutes,price into s_name,dur,s_price from public.services where id=s_id;
        et := (st+make_interval(mins=>dur))::time;
        c_id := client_ids[1+((extract(day from d)::int+i*5+9)%array_length(client_ids,1))];
        appt_status := case when d<CURRENT_DATE then (case when (extract(day from d)::int+i)%17=0 then 'no_show' else 'completed' end)::public.appointment_status when d<=CURRENT_DATE+2 then 'confirmed' else 'scheduled' end;
        insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,source,total_price,currency)
        select org_id,c_id,emp_vita,room_body,d,st,et,appt_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,'instagram_demo',s_price,'EUR' from public.clients c where c.id=c_id returning id into appt_id;
        insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values (org_id,appt_id,s_id,s_name,dur,s_price,'EUR',0);
      end loop;
    end if;

    if dow_i between 2 and 6 then
      -- Mia · Nail Lounge
      for i in 0..3 loop
        st := (time '10:00'+make_interval(mins=>i*105))::time;
        s_id := case when i%2=0 then srv_pedi else srv_mani end;
        select name,duration_minutes,price into s_name,dur,s_price from public.services where id=s_id;
        et := (st+make_interval(mins=>dur))::time;
        c_id := client_ids[1+((extract(day from d)::int+i*2+14)%array_length(client_ids,1))];
        appt_status := case when d<CURRENT_DATE then 'completed' when d<=CURRENT_DATE+2 then 'confirmed' else 'scheduled' end;
        insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,source,total_price,currency)
        select org_id,c_id,emp_mia,room_nails,d,st,et,appt_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,'instagram_demo',s_price,'EUR' from public.clients c where c.id=c_id returning id into appt_id;
        insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values (org_id,appt_id,s_id,s_name,dur,s_price,'EUR',0);
      end loop;
    end if;
  end loop;

  -- Restore normal weekly schedule behaviour after appointments are created.
  if to_regclass('public.employee_schedule_overrides') is not null then
    delete from public.employee_schedule_overrides
    where organization_id=org_id
      and employee_id in (emp_elizabeth,emp_lea,emp_vita,emp_mia)
      and reason='instagram_demo_seed';
  end if;

  raise notice 'SalonFlow Instagram demo seed v2 complete. Organization: %',org_id;
  raise notice '4 employees · 4 rooms · 10 services · 4 equipment items · 25 clients · 43-day appointment window';
end $$;
