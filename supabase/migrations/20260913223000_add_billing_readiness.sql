-- SalonFlow billing-readiness metadata.
-- No payment provider is connected by this migration. Lifecycle status remains
-- the application source of truth for tenant access; Stripe fields are reserved
-- for a future integration and are only visible through Platform Admin.

alter table public.organizations
  add column if not exists billing_provider text,
  add column if not exists billing_email text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists billing_period_start timestamptz,
  add column if not exists billing_period_end timestamptz,
  add column if not exists billing_cancel_at_period_end boolean,
  add column if not exists billing_updated_at timestamptz;

update public.organizations
set
  billing_provider = coalesce(billing_provider, 'manual'),
  billing_email = coalesce(billing_email, email),
  billing_cancel_at_period_end = coalesce(billing_cancel_at_period_end, false),
  billing_updated_at = coalesce(billing_updated_at, now())
where billing_provider is null
   or billing_cancel_at_period_end is null
   or billing_updated_at is null
   or (billing_email is null and email is not null);

alter table public.organizations
  alter column billing_provider set default 'manual',
  alter column billing_cancel_at_period_end set default false,
  alter column billing_updated_at set default now();

alter table public.organizations
  alter column billing_provider set not null,
  alter column billing_cancel_at_period_end set not null,
  alter column billing_updated_at set not null;

alter table public.organizations
  drop constraint if exists organizations_billing_provider_check;
alter table public.organizations
  add constraint organizations_billing_provider_check
  check (billing_provider in ('manual', 'stripe'));

alter table public.organizations
  drop constraint if exists organizations_billing_period_check;
alter table public.organizations
  add constraint organizations_billing_period_check
  check (
    billing_period_start is null
    or billing_period_end is null
    or billing_period_start < billing_period_end
  );

create unique index if not exists organizations_stripe_customer_id_unique_idx
  on public.organizations(stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists organizations_stripe_subscription_id_unique_idx
  on public.organizations(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists organizations_billing_provider_idx
  on public.organizations(billing_provider);

create or replace function public.set_organization_billing_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if
    new.billing_provider is distinct from old.billing_provider
    or new.billing_email is distinct from old.billing_email
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
    or new.stripe_price_id is distinct from old.stripe_price_id
    or new.billing_period_start is distinct from old.billing_period_start
    or new.billing_period_end is distinct from old.billing_period_end
    or new.billing_cancel_at_period_end is distinct from old.billing_cancel_at_period_end
  then
    new.billing_updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists set_organization_billing_updated_at
  on public.organizations;
create trigger set_organization_billing_updated_at
before update on public.organizations
for each row execute function public.set_organization_billing_updated_at();

comment on column public.organizations.billing_provider is
  'Billing source. manual means SalonFlow does not currently receive provider events; stripe is reserved for the future Stripe integration.';
comment on column public.organizations.billing_email is
  'Administrative billing contact. This may differ from the salon public email.';
comment on column public.organizations.stripe_customer_id is
  'Stripe Customer id once Stripe billing is connected. Platform metadata only.';
comment on column public.organizations.stripe_subscription_id is
  'Stripe Subscription id once Stripe billing is connected. Platform metadata only.';
comment on column public.organizations.stripe_price_id is
  'Stripe Price id currently attached to the tenant subscription.';
comment on column public.organizations.billing_period_start is
  'Current provider billing period start, populated by future billing integration.';
comment on column public.organizations.billing_period_end is
  'Current provider billing period end, populated by future billing integration.';
comment on column public.organizations.billing_cancel_at_period_end is
  'Whether provider subscription is scheduled to cancel at the end of its current billing period.';
comment on column public.organizations.billing_updated_at is
  'Last time billing metadata on the organization changed.';
