# SalonFlow

SalonFlow is a salon management and appointment scheduling platform built with Next.js, TypeScript and Supabase.

The project is being evolved from a single-salon application into a reusable multi-tenant SaaS product for beauty, wellness and similar service businesses.

## Current capabilities

- appointment calendar and scheduling
- employee shifts and availability
- clients, services, rooms and equipment
- online booking requests
- SMS and email notifications
- reports and operational dashboards
- role-based administration

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Resend
- Twilio

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

The existing codebase currently contains lint debt inherited from the original single-salon application. New work should avoid introducing additional lint errors, while existing findings will be handled incrementally.

## Product direction

The first product-foundation phase covers:

- centralized SalonFlow product identity
- removal of hardcoded single-salon assumptions
- multi-tenant organization architecture
- tenant-aware permissions and database access
- onboarding and subscription foundations

See [`docs/PRODUCT_FOUNDATION.md`](docs/PRODUCT_FOUNDATION.md) for the current implementation roadmap.

## Security

- Never commit `.env` files or real credentials.
- Do not expose Supabase service-role, Resend, Twilio or cron secrets to the browser.
- Keep production customer data out of the repository.

## Status

SalonFlow is under active development and is not yet ready for general production use as a multi-tenant SaaS product.
