# SalonFlow Product Foundation

## Goal

Transform the existing single-salon Body & Soul application into a reusable commercial salon-management platform.

## Phase 1 scope

- Remove hardcoded Body & Soul branding from shared application metadata and reusable UI.
- Centralize product-level configuration.
- Document local setup and required environment variables.
- Inventory salon-specific data and assumptions.
- Prepare the database model for organizations and tenant isolation.
- Define application roles: owner, manager, receptionist, and employee.
- Replace production-like data with fictional demo data.
- Provide a private Platform Admin surface for tenant metadata and central feedback without exposing salon operational data.
- Track internal commercial plan (`starter`, `pro`) and tenant lifecycle (`trial`, `active`, `past_due`, `suspended`) metadata.
- Keep tenant suspension reversible and non-destructive.

## Non-goals for Phase 1

- Automated subscription billing or payment processing (Stripe/webhooks are not connected yet).
- Automatic lifecycle transitions when a trial or payment period expires.
- Hard commercial limits by plan until pricing and packaging are finalized.
- Self-service signup.
- Multiple locations per organization.
- Native mobile applications.
- Advanced marketing automation.

## Security rules for the public repository

- Never commit `.env` files or API secrets.
- Never commit real client names, phone numbers, email addresses, appointment notes, or database dumps.
- Use fictional data in seeds and screenshots.
- Enforce tenant isolation in the database before onboarding multiple salons.
- Platform Admin may access tenant/account metadata and feedback, but not salon clients, appointments, treatment notes, or other operational records.

## Initial roadmap

1. Product rebranding and configuration.
2. Environment and developer documentation.
3. Salon-specific dependency inventory.
4. Organizations and memberships schema.
5. Tenant-aware Row Level Security policies.
6. Roles and server-side authorization.
7. Salon onboarding and tenant settings.
8. Platform Admin and tenant lifecycle foundation.
9. Commercial pilot readiness.
10. Billing integration when pricing and subscription rules are finalized.
