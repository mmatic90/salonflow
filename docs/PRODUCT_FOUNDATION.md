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
- Track internal commercial plan (`starter`, `growth`, `pro`) and tenant lifecycle (`trial`, `active`, `past_due`, `suspended`) metadata.
- Maintain a central capability-entitlement catalog for the three commercial tiers, without enforcing feature restrictions until packaging is finalized.
- Give Trial tenants the Pro entitlement set while keeping their stored paid plan separate.
- Keep tenant suspension reversible and non-destructive.
- Store billing-readiness metadata separately from salon operational data: billing contact, provider, Stripe references, billing period, and cancel-at-period-end state.
- Keep lifecycle status as the SalonFlow access source of truth; future billing-provider events may synchronize lifecycle, but do not bypass it.

## Commercial capability source of truth

The audited feature split is documented in `docs/PLAN_CAPABILITY_MATRIX.md` and implemented centrally in `src/lib/entitlements.ts`.

Capabilities are explicitly classified as:

- `available` — implemented and suitable for current multi-tenant use;
- `partial` — meaningful implementation exists but needs tenant-hardening or completion before enforcement;
- `planned` — roadmap capability that must not be marketed as currently delivered.

The matrix currently keeps core salon operation and client care/safety in Starter, utilization/retention insights in Growth, and governance/advanced automation in Pro. Pricing is intentionally not stored in code or database yet.

## Non-goals for Phase 1

- Automated subscription billing or payment processing (Stripe checkout/webhooks are not connected yet).
- Manual editing of Stripe customer/subscription/price identifiers from Platform Admin.
- Automatic lifecycle transitions when a trial or payment period expires.
- Enforcing feature gates or hard commercial limits until pricing and packaging are finalized.
- Treating `partial` or `planned` capabilities as production-ready paid promises.
- Self-service signup.
- Multiple locations per organization.
- Native mobile applications.
- Advanced marketing automation.

## Security rules for the public repository

- Never commit `.env` files or API secrets.
- Never commit real client names, phone numbers, email addresses, appointment notes, or database dumps.
- Use fictional data in seeds and screenshots.
- Enforce tenant isolation in the database before onboarding multiple salons.
- Platform Admin may access tenant/account metadata, billing metadata, plan entitlements and feedback, but not salon clients, appointments, treatment notes, or other operational records.
- Stripe identifiers are platform metadata only and should be populated by the future Stripe integration, not by salon users.
- When capability enforcement is activated, server-side entitlement checks must be authoritative; hiding UI controls alone is not sufficient.
- Background jobs and public APIs must become tenant- and entitlement-aware before a premium capability is enforced commercially.

## Initial roadmap

1. Product rebranding and configuration.
2. Environment and developer documentation.
3. Salon-specific dependency inventory.
4. Organizations and memberships schema.
5. Tenant-aware Row Level Security policies.
6. Roles and server-side authorization.
7. Salon onboarding and tenant settings.
8. Platform Admin and tenant lifecycle foundation.
9. Billing-readiness metadata and Platform Admin visibility.
10. Three-tier plan and capability-entitlement foundation.
11. Audited Starter/Growth/Pro capability matrix.
12. Commercial pilot readiness and final pricing/package approval.
13. Server-side entitlement enforcement in controlled stages.
14. Tenant-hardening of partial background automations/reminders.
15. Stripe checkout/webhooks when pricing and subscription rules are finalized.
