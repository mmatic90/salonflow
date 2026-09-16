# SalonFlow Sales Trial readiness

This document is the release gate for sending a private SalonFlow trial to a prospective salon.

The goal is not a shared demo account. Every prospect gets an isolated organization, an owner account and a time-limited trial.

## Current Sales Trial behavior

Platform Admin can create a new private trial from:

`/platform/trials/new`

A new Sales Trial is provisioned with:

- its own `organizations` row and unique booking slug;
- a dedicated owner auth user and owner membership;
- underlying plan `starter`;
- lifecycle `trial`;
- 7-day trial window;
- effective Pro capabilities only while `trial_ends_at` is in the future;
- Google review automation OFF;
- CRM retention automation OFF;
- Managed Email tenant foundation available;
- optional localized demo data;
- a localized account activation email generated through the SalonFlow email provider.

After the trial expires, the tenant data is retained but dashboard access is locked until a paid plan is activated. The public booking page and public booking APIs are also disabled for that expired trial tenant.

## Generic demo dataset

When **Seed demo data** is enabled, SalonFlow creates an isolated dataset inside that new organization only.

The seed currently contains:

- 3 employees;
- 8 common beauty/wellness services;
- 3 rooms;
- basic equipment;
- salon opening hours;
- employee schedules;
- employee/service and service/room mappings;
- 12 fictional clients;
- a care/safety profile example;
- completed/cancelled/no-show history;
- upcoming appointments;
- a retention candidate;
- one waitlist entry;
- one pending online booking request.

Seeded clients intentionally have no real email or phone contact data. This prevents scheduled emails or manual CRM outreach from reaching an unintended recipient.

## Environment gate

Before sending a real prospect an invite, verify the deployed environment has:

- `NEXT_PUBLIC_SITE_URL` set to the real deployed SalonFlow URL, never localhost;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `RESEND_API_KEY`;
- `SALONFLOW_EMAIL_FROM_ADDRESS` using a verified SalonFlow-owned sending domain;
- optional `SALONFLOW_EMAIL_DEFAULT_REPLY_TO`;
- Managed Email monthly/global limit variables;
- `CRON_SECRET`.

Do not send external prospects invitations from `onboarding@resend.dev`; use a verified SalonFlow-owned domain first.

## Supabase Auth redirect gate

The invite action generates a Supabase Auth invite link whose redirect target is:

`<NEXT_PUBLIC_SITE_URL>/set-password`

In **Supabase Dashboard → Authentication → URL Configuration**:

1. Set Site URL to the real SalonFlow application URL.
2. Add the production `/set-password` URL to allowed Redirect URLs.
3. For local testing, allow `http://localhost:3000/**`.
4. If Netlify preview deployments are used for auth testing, explicitly allow the intended preview URL pattern.

If a redirect URL is not allowed, Supabase can fall back to the configured Site URL instead, so this must be checked before the first external trial.

## Build gate

Before deploying a Sales Trial build:

```bash
git switch feature/multi-tenant-foundation
git pull origin feature/multi-tenant-foundation
npm install
npm run lint
npm run build
```

Both commands must pass.

Apply all unapplied Supabase migrations, including:

`supabase/migrations/20260914234500_add_sales_trial_foundation.sql`

## First controlled end-to-end QA

Use an email address you own that does not already have a SalonFlow auth account.

1. Sign in as Platform Admin.
2. Open **Novi trial**.
3. Create a test salon with **Seed demo data** enabled.
4. Confirm the success card says the invitation was sent.
5. Open the received invite.
6. Confirm it lands on `/set-password`.
7. Set a password.
8. Confirm the owner lands in that salon's dashboard, not onboarding.
9. Confirm the trial banner shows Pro trial and the remaining days.
10. Check Calendar, Clients, Online bookings, Waitlist, Reports and CRM actions.
11. Confirm seeded demo clients contain no external email addresses.
12. Confirm Google review automation is OFF and uses a clear ON/OFF switch.
13. Confirm automatic CRM follow-up is OFF and uses a clear ON/OFF switch.
14. Open the public booking page for the new salon slug.
15. Confirm matching consecutive working days are grouped in the public hours display, for example `Pon–Sub 08:00–20:00`.
16. Submit one controlled public booking request and confirm it appears as pending in Online bookings.

## Trial expiry QA

For a disposable test tenant only, temporarily set `trial_ends_at` into the past.

Expected behavior:

- lifecycle may still display `trial`;
- navigating to the dashboard redirects to the dedicated trial-expired page;
- no Starter, Growth or Pro workspace features remain usable while the expired tenant is still a trial;
- tenant data remains stored and is not deleted;
- the public booking page is no longer available;
- public availability and booking submission APIs reject the expired trial;
- reminder/review/retention schedulers do not treat the expired trial as Pro.

Restore or delete the disposable test tenant afterward.

## Scheduled jobs

Current scheduled jobs are shared across tenants; they do not require one scheduler per salon.

- appointment reminder/review scheduler scans candidate rows and checks each tenant's lifecycle/plan before sending;
- CRM retention automation scans only tenants with that automation enabled and applies the same entitlement checks;
- all tenant email delivery still passes through the Managed Email quota/provider layer.

Sales Trial creation keeps outbound review and CRM automations OFF by default.

## What is intentionally not part of this foundation yet

Do not block the first prospect trial on these items:

- Stripe Checkout/subscription billing;
- automated conversion from trial to paid plan;
- self-service public signup;
- multi-location management;
- custom salon-owned email provider credentials;
- native mobile apps;
- heavy-load optimization before real usage data exists.

## Next product step after trial provisioning is validated

Once at least one private Sales Trial can be created, accepted and used end-to-end, the next platform batch should add:

1. trial-management metadata in Platform Admin;
2. resend/reissue owner access links;
3. guarded reset of demo data for Sales Trial tenants only;
4. conversion controls from trial to Starter/Growth/Pro;
5. then Stripe Billing / Customer Portal after pricing is intentionally finalized.

## Merge rule

Do not merge `feature/multi-tenant-foundation` to `main` only because the Sales Trial flow works locally. Validate the migration, real invite delivery, password setup, tenant isolation and trial expiry behavior first. Merge only after explicit approval.
