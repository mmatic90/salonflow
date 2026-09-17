-- SalonFlow extra Instagram demo appointments
-- Run AFTER supabase/demo_seed_instagram_v3.sql
-- Safe to rerun: only rows with source='instagram_demo_extra' are recreated.
-- Clients 1-23 are female; clients 24-25 are the only male demo clients.
-- Male clients are used only for Relax massage / Spa pedicure.

do $$
declare
  target_slug text := null;
  v_org_id uuid; v_org_count integer;
  v_emp_ana uuid; v_emp_luka uuid; v_emp_ivan uuid; v_emp_petra uuid;
  v_room_1 uuid; v_room_2 uuid; v_room_3 uuid; v_room_4 uuid;
  v_srv_hydra uuid; v_srv_deep uuid; v_srv_oxy uuid; v_srv_laser uuid; v_srv_body uuid; v_srv_massage uuid; v_srv_pedi uuid; v_srv_mani uuid; v_srv_brows uuid; v_srv_lashes uuid;
  v_client_ids uuid[]; v_female_client_ids uuid[]; v_male_client_ids uuid[]; v_female_count integer;
  v_date date; v_dow integer; v_density integer; v_idx integer; v_client_id uuid; v_appointment_id uuid; v_service_id uuid; v_service_name text; v_service_price numeric(10,2); v_service_duration integer; v_start time; v_end time; v_status public.appointment_status; v_notes text;
begin
  select count(*) into v_org_count from public.organizations o where o.is_active=true;
  if target_slug is not null then select o.id into v_org_id from public.organizations o where o.slug=target_slug and o.is_active=true limit 1;
  elsif v_org_count=1 then select o.id into v_org_id from public.organizations o where o.is_active=true limit 1;
  else raise exception 'Found % active organizations. Set target_slug at the top of demo_seed_instagram_extra.sql.',v_org_count; end if;
  if v_org_id is null then raise exception 'Target organization not found.'; end if;

  select e.id into v_emp_ana from public.employees e where e.organization_id=v_org_id and e.email='ana.anic@demo-salon.test';
  select e.id into v_emp_luka from public.employees e where e.organization_id=v_org_id and e.email='luka.lukic@demo-salon.test';
  select e.id into v_emp_ivan from public.employees e where e.organization_id=v_org_id and e.email='ivan.ivic@demo-salon.test';
  select e.id into v_emp_petra from public.employees e where e.organization_id=v_org_id and e.email='petra.peric@demo-salon.test';
  select r.id into v_room_1 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 1'; select r.id into v_room_2 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 2'; select r.id into v_room_3 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 3'; select r.id into v_room_4 from public.rooms r where r.organization_id=v_org_id and r.name='Soba 4';
  select s.id into v_srv_hydra from public.services s where s.organization_id=v_org_id and s.name='Hydra Glow tretman lica'; select s.id into v_srv_deep from public.services s where s.organization_id=v_org_id and s.name='Dubinsko čišćenje lica'; select s.id into v_srv_oxy from public.services s where s.organization_id=v_org_id and s.name='Oxy tretman lica'; select s.id into v_srv_laser from public.services s where s.organization_id=v_org_id and s.name='Laser epilacija nogu'; select s.id into v_srv_body from public.services s where s.organization_id=v_org_id and s.name='Body Sculpt'; select s.id into v_srv_massage from public.services s where s.organization_id=v_org_id and s.name='Relax masaža 60 min'; select s.id into v_srv_pedi from public.services s where s.organization_id=v_org_id and s.name='Spa pedikura'; select s.id into v_srv_mani from public.services s where s.organization_id=v_org_id and s.name='Gel manikura'; select s.id into v_srv_brows from public.services s where s.organization_id=v_org_id and s.name='Oblikovanje i bojenje obrva'; select s.id into v_srv_lashes from public.services s where s.organization_id=v_org_id and s.name='Lash Lift';

  select array_agg(c.id order by c.created_at,c.id) into v_client_ids from public.clients c where c.organization_id=v_org_id and c.is_active=true;
  if coalesce(array_length(v_client_ids,1),0)<25 then raise exception 'Expected 25 demo clients from v3 seed. Run demo_seed_instagram_v3.sql first.'; end if;
  v_female_client_ids:=v_client_ids[1:23]; v_male_client_ids:=v_client_ids[24:25]; v_female_count:=23;

  delete from public.appointments a where a.organization_id=v_org_id and a.source='instagram_demo_extra';
  delete from public.employee_schedule_overrides eso where eso.organization_id=v_org_id and eso.reason='instagram_demo_extra_seed';
  for v_date in select generate_series(current_date-35,current_date+21,interval '1 day')::date loop
    v_dow:=extract(dow from v_date)::int;
    if v_dow between 1 and 6 then insert into public.employee_schedule_overrides (organization_id,employee_id,schedule_date,is_working,start_time,end_time,reason) values (v_org_id,v_emp_ana,v_date,true,'08:00','20:00','instagram_demo_extra_seed'),(v_org_id,v_emp_luka,v_date,true,'08:00','20:00','instagram_demo_extra_seed'),(v_org_id,v_emp_ivan,v_date,true,'08:00','20:00','instagram_demo_extra_seed'),(v_org_id,v_emp_petra,v_date,true,'08:00','20:00','instagram_demo_extra_seed') on conflict do nothing; end if;
  end loop;

  for v_date in select generate_series(current_date-35,current_date+21,interval '1 day')::date loop
    v_dow:=extract(dow from v_date)::int; if v_dow=0 then continue; end if;
    v_density:=case when extract(day from v_date)::int%7 in(0,1) then 1 when extract(day from v_date)::int%7 in(2,3,4) then 2 else 3 end;
    if v_date<current_date then v_status:=case when extract(day from v_date)::int%17=0 then 'no_show'::public.appointment_status when extract(day from v_date)::int%13=0 then 'cancelled'::public.appointment_status else 'completed'::public.appointment_status end;
    elsif v_date=current_date then v_status:='confirmed'::public.appointment_status;
    else v_status:=case when extract(day from v_date)::int%3=0 then 'confirmed'::public.appointment_status else 'scheduled'::public.appointment_status end; end if;

    -- ANA: face care, female clients only.
    for v_idx in 1..v_density loop
      v_client_id:=v_female_client_ids[((extract(day from v_date)::int+v_idx*3)%v_female_count)+1]; v_service_id:=case v_idx when 1 then v_srv_oxy when 2 then v_srv_hydra else v_srv_deep end; v_start:=case v_idx when 1 then '10:30'::time when 2 then '13:00'::time else '15:00'::time end;
      select s.name,s.price,s.duration_minutes into v_service_name,v_service_price,v_service_duration from public.services s where s.id=v_service_id; v_end:=v_start+make_interval(mins=>v_service_duration); v_notes:=case when v_idx=1 and extract(day from v_date)::int%4=0 then 'Klijentica navodi osjetljivost kože nakon posljednjeg tretmana.' when v_idx=2 and extract(day from v_date)::int%5=0 then 'Provjeriti hidrataciju i preporučiti kućnu njegu.' when v_idx=3 and extract(day from v_date)::int%6=0 then 'Klijentica dolazi prije važnog događaja; želi naglasak na glow efektu.' else null end;
      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,notes,source,total_price,currency) select v_org_id,c.id,v_emp_ana,v_room_1,v_date,v_start,v_end,v_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,v_notes,'instagram_demo_extra',v_service_price,'EUR' from public.clients c where c.id=v_client_id returning id into v_appointment_id;
      insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values(v_org_id,v_appointment_id,v_service_id,v_service_name,v_service_duration,v_service_price,'EUR',0);
    end loop;

    -- LUKA: lashes/brows/oxy, female clients only.
    for v_idx in 1..v_density loop
      v_client_id:=v_female_client_ids[((extract(day from v_date)::int+7+v_idx*2)%v_female_count)+1]; v_service_id:=case v_idx when 1 then v_srv_lashes when 2 then v_srv_brows else v_srv_oxy end; v_start:=case v_idx when 1 then '08:00'::time when 2 then '09:00'::time else '13:30'::time end;
      select s.name,s.price,s.duration_minutes into v_service_name,v_service_price,v_service_duration from public.services s where s.id=v_service_id; v_end:=v_start+make_interval(mins=>v_service_duration); v_notes:=case when v_idx=1 and extract(day from v_date)::int%3=0 then 'Prvi Lash Lift; objasniti njegu prvih 24 sata.' when v_idx=2 and extract(day from v_date)::int%4=0 then 'Klijentica želi prirodan oblik obrva.' else null end;
      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,notes,source,total_price,currency) select v_org_id,c.id,v_emp_luka,v_room_2,v_date,v_start,v_end,v_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,v_notes,'instagram_demo_extra',v_service_price,'EUR' from public.clients c where c.id=v_client_id returning id into v_appointment_id;
      insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values(v_org_id,v_appointment_id,v_service_id,v_service_name,v_service_duration,v_service_price,'EUR',0);
    end loop;

    -- IVAN: mostly female; a male client appears occasionally and ONLY for Relax masaža.
    if v_dow between 1 and 5 then for v_idx in 1..v_density loop
      v_service_id:=case v_idx when 1 then v_srv_massage when 2 then v_srv_body else v_srv_laser end;
      if v_idx=1 and extract(day from v_date)::int%8=0 then v_client_id:=v_male_client_ids[(extract(day from v_date)::int%2)+1]; else v_client_id:=v_female_client_ids[((extract(day from v_date)::int+12+v_idx*4)%v_female_count)+1]; end if;
      v_start:=case v_idx when 1 then '12:00'::time when 2 then '16:00'::time else '18:00'::time end; select s.name,s.price,s.duration_minutes into v_service_name,v_service_price,v_service_duration from public.services s where s.id=v_service_id; v_end:=v_start+make_interval(mins=>v_service_duration); v_notes:=case when v_idx=1 and extract(day from v_date)::int%3=0 then 'Naglasak na leđa i ramena; klijent radi sjedeći posao.' when v_idx=2 and extract(day from v_date)::int%5=0 then 'Izmjeriti napredak prije tretmana.' when v_idx=3 and extract(day from v_date)::int%6=0 then 'Kontrolni tretman; provjeriti reakciju kože.' else null end;
      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,notes,source,total_price,currency) select v_org_id,c.id,v_emp_ivan,v_room_3,v_date,v_start,v_end,v_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,v_notes,'instagram_demo_extra',v_service_price,'EUR' from public.clients c where c.id=v_client_id returning id into v_appointment_id; insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values(v_org_id,v_appointment_id,v_service_id,v_service_name,v_service_duration,v_service_price,'EUR',0);
    end loop; end if;

    -- PETRA: female nail/brow clients; a male client appears occasionally and ONLY for Spa pedikura.
    if v_dow between 2 and 6 then for v_idx in 1..v_density loop
      v_service_id:=case v_idx when 1 then v_srv_mani when 2 then v_srv_pedi else v_srv_brows end;
      if v_idx=2 and extract(day from v_date)::int%10=0 then v_client_id:=v_male_client_ids[(extract(day from v_date)::int%2)+1]; else v_client_id:=v_female_client_ids[((extract(day from v_date)::int+17+v_idx*5)%v_female_count)+1]; end if;
      v_start:=case v_idx when 1 then '10:00'::time when 2 then '12:00'::time else '14:30'::time end; select s.name,s.price,s.duration_minutes into v_service_name,v_service_price,v_service_duration from public.services s where s.id=v_service_id; v_end:=v_start+make_interval(mins=>v_service_duration); v_notes:=case when v_idx=1 and extract(day from v_date)::int%4=0 then 'Klijentica želi neutralnu nude nijansu.' when v_idx=2 and extract(day from v_date)::int%5=0 then 'Obratiti pažnju na osjetljivost lijevog stopala.' when v_idx=3 and extract(day from v_date)::int%7=0 then 'Brzo oblikovanje prije putovanja.' else null end;
      insert into public.appointments (organization_id,client_id,employee_id,room_id,appointment_date,start_time,end_time,status,client_name,client_phone,client_email,notes,source,total_price,currency) select v_org_id,c.id,v_emp_petra,v_room_4,v_date,v_start,v_end,v_status,trim(c.first_name||' '||coalesce(c.last_name,'')),c.phone,c.email,v_notes,'instagram_demo_extra',v_service_price,'EUR' from public.clients c where c.id=v_client_id returning id into v_appointment_id; insert into public.appointment_services (organization_id,appointment_id,service_id,service_name,duration_minutes,price,currency,sort_order) values(v_org_id,v_appointment_id,v_service_id,v_service_name,v_service_duration,v_service_price,'EUR',0);
    end loop; end if;
  end loop;

  delete from public.employee_schedule_overrides eso where eso.organization_id=v_org_id and eso.reason='instagram_demo_extra_seed';
  raise notice 'Extra SalonFlow demo appointments created successfully with female-heavy clientele.';
end $$;