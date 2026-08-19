-- SalonFlow clean Instagram demo dataset v3
-- Run manually in Supabase SQL Editor. This is NOT a migration.
-- WARNING: clears operational data for the selected demo organization.
-- Demo clientele intentionally reflects a beauty salon: predominantly female clients,
-- with only two male clients reserved for massage / pedicure examples.

do $$
declare
  target_slug text := null;
  v_org_id uuid;
  v_org_count integer;

  v_emp_ana uuid;
  v_emp_luka uuid;
  v_emp_ivan uuid;
  v_emp_petra uuid;

  v_room_1 uuid;
  v_room_2 uuid;
  v_room_3 uuid;
  v_room_4 uuid;

  v_srv_hydra uuid;
  v_srv_deep uuid;
  v_srv_oxy uuid;
  v_srv_laser uuid;
  v_srv_body uuid;
  v_srv_massage uuid;
  v_srv_pedi uuid;
  v_srv_mani uuid;
  v_srv_brows uuid;
  v_srv_lashes uuid;

  v_client_names text[] := array[
    'Sara Marić','Nina Kovačić','Dora Jurić','Ema Babić','Maja Novak',
    'Iva Radić','Rita Pavlić','Lara Božić','Tea Horvat','Klara Matić',
    'Sanja Perić','Marina Vuković','Elena Grgić','Lucija Barišić','Petra Kralj',
    'Ana Rukavina','Ivana Blažević','Martina Šarić','Nikolina Lončar','Andrea Knežević',
    'Lorena Marković','Mia Petrović','Katarina Vidović','Marko Jurić','Ivan Novak'
  ];
  v_client_ids uuid[] := array[]::uuid[];

  v_i integer;
  v_dow integer;
  v_first_name text;
  v_last_name text;
  v_client_id uuid;
  v_date date;
  v_appointment_id uuid;
  v_service_id uuid;
  v_service_name text;
  v_service_price numeric(10,2);
  v_service_duration integer;
  v_start time;
  v_end time;
  v_status public.appointment_status;
begin
  select count(*) into v_org_count
  from public.organizations o
  where o.is_active = true;

  if target_slug is not null then
    select o.id into v_org_id from public.organizations o where o.slug=target_slug and o.is_active=true limit 1;
  elsif v_org_count=1 then
    select o.id into v_org_id from public.organizations o where o.is_active=true limit 1;
  else
    raise exception 'Found % active organizations. Set target_slug at the top of demo_seed_instagram_v3.sql.',v_org_count;
  end if;
  if v_org_id is null then raise exception 'Target organization not found.'; end if;

  if to_regclass('public.appointment_services') is not null then execute 'delete from public.appointment_services where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.appointments') is not null then execute 'delete from public.appointments where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.service_equipment') is not null then execute 'delete from public.service_equipment where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.service_rooms') is not null then execute 'delete from public.service_rooms where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.employee_services') is not null then execute 'delete from public.employee_services where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.service_group_limits') is not null then execute 'delete from public.service_group_limits where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.employee_schedule_overrides') is not null then execute 'delete from public.employee_schedule_overrides where organization_id = $1' using v_org_id; end if;
  if to_regclass('public.employee_default_schedule') is not null then execute 'delete from public.employee_default_schedule where organization_id = $1' using v_org_id; end if;
  delete from public.employees e where e.organization_id=v_org_id;
  delete from public.clients c where c.organization_id=v_org_id;
  delete from public.rooms r where r.organization_id=v_org_id;
  delete from public.equipment eq where eq.organization_id=v_org_id;
  delete from public.services s where s.organization_id=v_org_id;

  update public.organizations o set name='Demo Salon',phone='+385 91 000 0000',email='info@demo-salon.test',address_line_1='Primjer ulica 1',city='Rovinj',postal_code='52210',country_code='HR',timezone='Europe/Zagreb',locale='hr',currency='EUR' where o.id=v_org_id;

  insert into public.employees (organization_id,first_name,last_name,email,phone,color,job_title,notes,is_active,sort_order) values
    (v_org_id,'Ana','Anić','ana.anic@demo-salon.test','+385 91 000 0101','#7C3AED','Senior kozmetičarka','Tretmani lica i napredna njega kože.',true,1),
    (v_org_id,'Luka','Lukić','luka.lukic@demo-salon.test','+385 91 000 0102','#2563EB','Beauty terapeut','Obrve, trepavice i beauty tretmani.',true,2),
    (v_org_id,'Ivan','Ivić','ivan.ivic@demo-salon.test','+385 91 000 0103','#059669','Body terapeut','Masaže, oblikovanje tijela i laser.',true,3),
    (v_org_id,'Petra','Perić','petra.peric@demo-salon.test','+385 91 000 0104','#DB2777','Nail terapeut','Manikura i pedikura.',true,4);
  select e.id into v_emp_ana from public.employees e where e.organization_id=v_org_id and e.email='ana.anic@demo-salon.test';
  select e.id into v_emp_luka from public.employees e where e.organization_id=v_org_id and e.email='luka.lukic@demo-salon.test';
  select e.id into v_emp_ivan from public.employees e where e.organization_id=v_org_id and e.email='ivan.ivic@demo-salon.test';
  select e.id into v_emp_petra from public.employees e where e.organization_id=v_org_id and e.email='petra.peric@demo-salon.test';

  insert into public.rooms (organization_id,name,description,capacity,color,is_active,sort_order) values
    (v_org_id,'Soba 1','Tretmani lica i njega kože.',1,'#A78BFA',true,1),(v_org_id,'Soba 2','Beauty tretmani, obrve i trepavice.',1,'#60A5FA',true,2),(v_org_id,'Soba 3','Masaže, body tretmani i laser.',1,'#34D399',true,3),(v_org_id,'Soba 4','Manikura i pedikura.',1,'#F9A8D4',true,4);
  select r.id into v_room_1 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 1'; select r.id into v_room_2 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 2'; select r.id into v_room_3 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 3'; select r.id into v_room_4 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 4';

  insert into public.services (organization_id,name,category,description,duration_minutes,cleanup_minutes,price,currency,color,is_active,sort_order) values
    (v_org_id,'Hydra Glow tretman lica','Njega lica','Dubinsko čišćenje, hidratacija i završna njega kože.',60,10,85,'EUR','#8B5CF6',true,1),(v_org_id,'Dubinsko čišćenje lica','Njega lica','Profesionalno dubinsko čišćenje prilagođeno stanju kože.',75,10,78,'EUR','#A78BFA',true,2),(v_org_id,'Oxy tretman lica','Njega lica','Oksigenacija i intenzivna hidratacija kože.',45,10,65,'EUR','#C4B5FD',true,3),(v_org_id,'Laser epilacija nogu','Laser epilacija','Laserska epilacija cijelih nogu.',60,10,120,'EUR','#0EA5E9',true,4),(v_org_id,'Body Sculpt','Oblikovanje tijela','Aparativni tretman oblikovanja i toniranja tijela.',50,10,75,'EUR','#10B981',true,5),(v_org_id,'Relax masaža 60 min','Masaže','Opuštajuća masaža cijelog tijela.',60,10,60,'EUR','#14B8A6',true,6),(v_org_id,'Spa pedikura','Ruke i stopala','Kompletna estetska pedikura s njegom.',60,10,45,'EUR','#EC4899',true,7),(v_org_id,'Gel manikura','Ruke i stopala','Uređivanje noktiju i trajni lak.',60,10,38,'EUR','#F472B6',true,8),(v_org_id,'Oblikovanje i bojenje obrva','Obrve i trepavice','Oblikovanje i bojenje obrva.',30,5,25,'EUR','#F59E0B',true,9),(v_org_id,'Lash Lift','Obrve i trepavice','Podizanje i bojenje prirodnih trepavica.',60,10,48,'EUR','#D97706',true,10);
  select s.id into v_srv_hydra from public.services s where s.organization_id=v_org_id and s.name='Hydra Glow tretman lica'; select s.id into v_srv_deep from public.services s where s.organization_id=v_org_id and s.name='Dubinsko čišćenje lica'; select s.id into v_srv_oxy from public.services s where s.organization_id=v_org_id and s.name='Oxy tretman lica'; select s.id into v_srv_laser from public.services s where s.organization_id=v_org_id and s.name='Laser epilacija nogu'; select s.id into v_srv_body from public.services s where s.organization_id=v_org_id and s.name='Body Sculpt'; select s.id into v_srv_massage from public.services s where s.organization_id=v_org_id and s.name='Relax masaža 60 min'; select s.id into v_srv_pedi from public.services s where s.organization_id=v_org_id and s.name='Spa pedikura'; select s.id into v_srv_mani from public.services s where s.organization_id=v_org_id and s.name='Gel manikura'; select s.id into v_srv_brows from public.services s where s.organization_id=v_org_id and s.name='Oblikovanje i bojenje obrva'; select s.id into v_srv_lashes from public.services s where s.organization_id=v_org_id and s.name='Lash Lift';

  insert into public.equipment (organization_id,name,description,quantity_total,is_active,sort_order) values (v_org_id,'Diode Laser 808 nm','Profesionalni uređaj za lasersku epilaciju.',1,true,1),(v_org_id,'Body Sculpt uređaj','Uređaj za oblikovanje i toniranje tijela.',1,true,2),(v_org_id,'Oxy uređaj','Uređaj za oksigenaciju kože.',1,true,3),(v_org_id,'LED maska','LED terapija kao dodatak tretmanima lica.',2,true,4);

  for v_i in 1..array_length(v_client_names,1) loop
    v_first_name:=split_part(v_client_names[v_i],' ',1); v_last_name:=substring(v_client_names[v_i] from position(' ' in v_client_names[v_i])+1);
    insert into public.clients (organization_id,first_name,last_name,email,phone,date_of_birth,notes,marketing_consent,is_active,created_at) values (v_org_id,v_first_name,v_last_name,'client'||lpad(v_i::text,3,'0')||'@demo-salon.test','+385 91 100 '||lpad(v_i::text,4,'0'),date '1982-01-01'+((v_i*211)%7000),case when v_i=4 then 'Osjetljiva koža; preferira blaže tretmane.' when v_i=8 then 'Redovna klijentica za tretmane lica.' when v_i=12 then 'Najčešće rezervira masažu i body tretmane.' when v_i=17 then 'Preferira jutarnje termine.' when v_i=22 then 'Preferira termine nakon 16:00.' when v_i=24 then 'Povremeno rezervira relax masažu.' when v_i=25 then 'Dolazi na masažu ili pedikuru.' else null end,(v_i%3<>0),true,now()-make_interval(days=>50-v_i)) returning id into v_client_id;
    v_client_ids:=array_append(v_client_ids,v_client_id);
  end loop;

  for v_dow in 0..6 loop
    insert into public.employee_default_schedule (organization_id,employee_id,day_of_week,is_working,start_time,end_time) values
      (v_org_id,v_emp_ana,v_dow,v_dow between 1 and 6,case when v_dow between 1 and 6 then '09:00'::time else null end,case when v_dow between 1 and 5 then '17:00'::time when v_dow=6 then '14:00'::time else null end),
      (v_org_id,v_emp_luka,v_dow,v_dow between 1 and 6,case when v_dow between 1 and 6 then '08:00'::time else null end,case when v_dow between 1 and 6 then '15:00'::time else null end),
      (v_org_id,v_emp_ivan,v_dow,v_dow between 1 and 5,case when v_dow between 1 and 5 then '12:00'::time else null end,case when v_dow between 1 and 5 then '20:00'::time else null end),
      (v_org_id,v_emp_petra,v_dow,v_dow between 2 and 6,case when v_dow between 2 and 6 then '09:00'::time else null end,case when v_dow between 2 and 6 then '17:00'::time else null end);
  end loop;

  insert into public.employee_services (organization_id,employee_id,service_id,is_active) values (v_org_id,v_emp_ana,v_srv_hydra,true),(v_org_id,v_emp_ana,v_srv_deep,true),(v_org_id,v_emp_ana,v_srv_oxy,true),(v_org_id,v_emp_luka,v_srv_brows,true),(v_org_id,v_emp_luka,v_srv_lashes,true),(v_org_id,v_emp_luka,v_srv_oxy,true),(v_org_id,v_emp_ivan,v_srv_laser,true),(v_org_id,v_emp_ivan,v_srv_body,true),(v_org_id,v_emp_ivan,v_srv_massage,true),(v_org_id,v_emp_petra,v_srv_pedi,true),(v_org_id,v_emp_petra,v_srv_mani,true),(v_org_id,v_emp_petra,v_srv_brows,true);
  insert into public.service_rooms (organization_id,service_id,room_id,is_active) values (v_org_id,v_srv_hydra,v_room_1,true),(v_org_id,v_srv_deep,v_room_1,true),(v_org_id,v_srv_oxy,v_room_1,true),(v_org_id,v_srv_oxy,v_room_2,true),(v_org_id,v_srv_brows,v_room_2,true),(v_org_id,v_srv_lashes,v_room_2,true),(v_org_id,v_srv_laser,v_room_3,true),(v_org_id,v_srv_body,v_room_3,true),(v_org_id,v_srv_massage,v_room_3,true),(v_org_id,v_srv_pedi,v_room_4,true),(v_org_id,v_srv_mani,v_room_4,true),(v_org_id,v_srv_brows,v_room_4,true);

  -- The richer appointment history is intentionally generated by demo_seed_instagram_extra.sql.
  -- Keep v3 focused on a clean, reusable base dataset.
  raise notice 'SalonFlow demo base created. Run demo_seed_instagram_extra.sql next for rich appointment history.';
end $$;