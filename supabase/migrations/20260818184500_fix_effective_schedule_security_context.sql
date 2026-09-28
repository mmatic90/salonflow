-- Allow the effective-schedule helper to work correctly for both authenticated
-- application requests and privileged maintenance/seed sessions (such as the
-- Supabase SQL Editor).
--
-- Security remains tenant-safe for normal application users because the function
-- is SECURITY INVOKER and the employees/schedule tables keep their existing RLS.
-- The previous explicit is_organization_member() predicate made the helper return
-- no rows in SQL Editor sessions where auth.uid() is null, which in turn caused
-- the appointment runtime trigger to raise EMPLOYEE_NOT_WORKING for valid demo data.

create or replace function public.get_employee_effective_schedule(
  p_employee_id uuid,
  p_date date
)
returns table (
  is_working boolean,
  start_time time,
  end_time time,
  schedule_source text
)
language sql
stable
security invoker
set search_path = public
as $$
  with employee_org as (
    select organization_id
    from public.employees
    where id = p_employee_id
  ),
  override_row as (
    select
      o.is_working,
      o.start_time,
      o.end_time,
      'override'::text as schedule_source
    from public.employee_schedule_overrides o
    join employee_org eo on eo.organization_id = o.organization_id
    where o.employee_id = p_employee_id
      and o.schedule_date = p_date
    limit 1
  ),
  default_row as (
    select
      d.is_working,
      d.start_time,
      d.end_time,
      'default'::text as schedule_source
    from public.employee_default_schedule d
    join employee_org eo on eo.organization_id = d.organization_id
    where d.employee_id = p_employee_id
      and d.day_of_week = extract(dow from p_date)::integer
    limit 1
  )
  select * from override_row
  union all
  select * from default_row
  where not exists (select 1 from override_row)
  limit 1;
$$;

grant execute on function public.get_employee_effective_schedule(uuid, date) to authenticated;
