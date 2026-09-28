# SalonFlow

SalonFlow is a salon management and appointment scheduling platform built with Next.js, TypeScript and Supabase.

The project is being evolved from a single-salon application into a reusable multi-tenant SaaS product for beauty, wellness and similar service businesses.

## Current capabilities

- appointment calendar and scheduling
- employee shifts and availability
- clients, services, rooms and equipment
- online booking requests
- tenant-aware email booking notifications
- client marketing/retention communication preferences with opt-in and unsubscribe foundation
- Growth 24h email appointment reminders
- Pro CRM retention action queue with snooze/history workflow
- Pro automated Google review requests after completed appointments
- reports and operational dashboards
- role-based administration

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Resend
- Netlify Scheduled Functions for recurring email automation triggers

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment variable template:

```bash
cp .env.example .env.local
```

3. Add the required values to `.env.local`.

4. Start the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Validation

```bash
npm run lint
npm run build
```

New work should avoid introducing lint or build errors. Validate meaningful implementation batches before merging them toward production.

## Scheduled email automations

The Next API routes `/api/cron/email-reminders` and `/api/cron/review-requests` require `CRON_SECRET` bearer authorization.

On Netlify, `netlify/functions/email-automations.mjs` runs hourly and triggers both tenant-aware routes. The scheduler contains no salon-specific business logic; entitlement, quota, timezone, delivery state and tenant configuration remain inside the application routes.

## Product direction

The product foundation covers:

- centralized SalonFlow product identity
- removal of hardcoded single-salon assumptions
- multi-tenant organization architecture
- tenant-aware permissions and database access
- onboarding, commercial-plan and billing foundations
- email-only automated client communication so the product remains portable across markets
- derived Pro CRM action workflows without duplicating core client/appointment data
- separation of operational appointment communication from optional marketing/retention communication preferences

See [`docs/PRODUCT_FOUNDATION.md`](docs/PRODUCT_FOUNDATION.md) for the current implementation roadmap and [`docs/MARKETING_COMMUNICATION_PREFERENCES.md`](docs/MARKETING_COMMUNICATION_PREFERENCES.md) for the marketing-email preference model.

## Security

- Never commit `.env` files or real credentials.
- Do not expose Supabase service-role, Resend or cron secrets to the browser.
- Keep production customer data out of the repository.
- Marketing/retention email must fail closed unless the server-side preference gate returns an eligible client and unsubscribe URL.

## Status

SalonFlow is under active development and is not yet ready for general production use as a multi-tenant SaaS product.
