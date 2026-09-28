-- SalonFlow three-tier commercial plan foundation.
-- Adds Growth between Starter and Pro without changing any existing tenant plan.

alter table public.organizations
  drop constraint if exists organizations_plan_code_check;

alter table public.organizations
  add constraint organizations_plan_code_check
  check (plan_code in ('starter', 'growth', 'pro'));

comment on column public.organizations.plan_code is
  'Internal SalonFlow commercial plan identifier. Supported values: starter, growth, pro.';
