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
- Maintain a central capability-entitlement catalog for the three commercial tiers and enforce finished premium capabilities in controlled stages.
- Give Trial tenants the Pro entitlement set while keeping their stored paid plan separate.
- Keep tenant suspension reversible and non-destructive.
- Store billing-readiness metadata separately from salon operational data: billing contact, provider, Stripe references, billing period, and cancel-at-period-end state.
- Keep lifecycle status as the SalonFlow access source of truth; future billing-provider events may synchronize lifecycle, but do not bypass it.
- Keep automated client communication provider-neutral and cross-market by using email rather than country-specific SMS delivery.
- Protect shared email cost with per-tenant and global usage quotas before scaling to multiple salons.
- Turn Growth CRM signals into a distinct Pro retention action workflow without hiding core client history from lower plans.
- Keep client marketing/retention preferences as core client data, separate from operational appointment communication and separate from premium automation eligibility.

## Commercial capability source of truth

The audited feature split is documented in `docs/PLAN_CAPABILITY_MATRIX.md` and implemented centrally in `src/lib/entitlements.ts`.

Capabilities are explicitly classified as:

- `available` — implemented and suitable for current multi-tenant use;
- `partial` — meaningful implementation exists but needs tenant-hardening or completion before enforcement;
- `planned` — roadmap capability that must not be marketed as currently delivered.

The matrix keeps core salon operation, client care/safety and communication preferences in Starter, managed operational email/retention insight in Growth, and governance/action/automation workflows in Pro. Pricing is intentionally not stored in code or database yet.

Enforcement currently covers Growth Managed Email notifications, Waitlist, CRM/attendance insights, Reports and 24h email Appointment Reminders, plus Pro Audit Log, CRM Retention workflow and automated Google review requests.

## Communication model

SalonFlow automated client communication is email-only:

- online booking acceptance/rejection emails belong to Growth;
- manual appointment confirmation and scheduled date/time-change emails belong to Growth;
- proactive 24h appointment reminder emails belong to Growth;
- automated Google review requests after eligible completed appointments belong to Pro;
- future retention/promotional email must additionally pass the client's marketing-email preference gate.

Operational appointment communication is intentionally separated from marketing/retention preference. Setting a client's marketing status to `not_allowed` does not cancel appointment confirmations or reminders. Conversely, having an email address or receiving operational email never implies marketing consent.

All tenant-facing automated email routes through the managed-email layer, which applies current plan/lifecycle entitlement, tenant/global quota protection, provider abstraction and tenant Reply-To resolution immediately before provider delivery. Future marketing/retention delivery has an additional required precondition: `getMarketingEmailDeliveryContext()` must return an eligible target and unsubscribe URL before Managed Email delivery is attempted.

Phone numbers remain normal salon/client contact data. SalonFlow does not contain an SMS/Twilio delivery path.

## Marketing communication preferences

Every client has a marketing email status:

- `unknown` — no explicit preference is recorded;
- `allowed` — explicit permission is recorded;
- `not_allowed` — the client explicitly declined or unsubscribed.

`unknown` fails closed for future marketing automation and must never be treated as consent.

Preference metadata stores the time/source of consent, the source of the latest change and the authenticated user responsible for a manual update when applicable. Explicit status transitions are recorded in append-only `client_marketing_preference_events` history. Tenant users can read this history but cannot update/delete history rows.

The legacy boolean `marketing_consent` remains temporarily for backwards compatibility. Legacy `true` migrates to `allowed`; the old default `false` migrates to `unknown`, because a historical default is not evidence of an explicit refusal.

The client edit profile exposes the current status and recent preference history to all normal salon users, while only salon administrators may change the status. `allowed` cannot be selected for a client without an email address.

Changing a client's email address resets an existing `allowed` status to `unknown`. Permission recorded for one address is not silently transferred to a different email address.

The public online-booking form includes an optional unchecked HR/EN/IT marketing opt-in. Checked opt-in is stored with the booking request and becomes `allowed / online_booking` only if the request is accepted and a CRM client is created. Unchecked remains `unknown`. Rejected booking requests do not create a CRM marketing contact merely because the checkbox was selected.

Every client has an opaque public unsubscribe token inaccessible to tenant users through RLS. `/unsubscribe/[token]` can only move the matching client's marketing status to `not_allowed`; it cannot opt in, expose profile/appointment data or mutate operational salon data. Repeated unsubscribe is idempotent.

Detailed implementation rules live in `docs/MARKETING_COMMUNICATION_PREFERENCES.md`.

## Advanced CRM retention workflow

Pro and Trial management users have a dedicated `/dashboard/retention` action queue. It is intentionally separate from Growth CRM insights: Growth explains client behavior, while Pro turns those signals into a repeatable operating workflow.

The queue is derived from current tenant data rather than persisted as a second copy of CRM state. Initial candidate rules cover:

- a client who is late compared with their own average visit cadence;
- a client inactive for more than 120 days without a future booking;
- a returning client with completed visits but no future appointment;
- a client with meaningful cancellation/no-show attendance risk and no future booking.

Only the strongest current signal per client is shown. Each candidate includes priority, contact shortcuts, direct client profile access and a rebook shortcut. Operators may mark the signal `contacted`, `resolved`, `ignored` or snooze it for 7/14/30 days.

Operator decisions are stored in append-only `crm_retention_actions`. The queue uses a deterministic signal-generation key so handling one generation does not permanently hide future behavior changes. A new completed visit, new future appointment or new attendance event can produce a new signal generation without deleting old history.

The server recalculates the queue before recording an action, preventing stale/fabricated browser payloads from becoming current CRM decisions. Database RLS also requires a management role and current Pro-equivalent entitlement. Downgrading preserves action history but lower plans cannot read or append it until the tenant returns to Pro/Trial.

The first Advanced CRM batch is deliberately manual: it does **not** automatically send follow-up marketing emails. Future automated follow-up must additionally use the marketing preference gate and include the returned unsubscribe URL.

## Automated Google review requests

Pro and Trial tenants may opt in to review automation by storing their own Google review URL and selecting a supported delay of 2 or 24 hours after the scheduled end of a completed appointment.

Review automation is deliberately non-retroactive. The tenant activation timestamp is stored server-side and preserved by a database trigger so old visits cannot be pulled into a campaign by changing request payloads directly.

A review request is eligible only when:

- the tenant currently has Pro-equivalent entitlement;
- the automation is enabled and has a tenant-specific Google review URL;
- the appointment status is `completed`;
- the appointment has a client email address;
- the appointment ended after the latest automation activation boundary;
- the configured delay has elapsed;
- the appointment has not already received a review request.

Delivery state is stored per appointment. An atomic claim protects against overlapping cron runs. Provider failures retry at most three times with at least one hour between attempts; managed-email deferrals such as exhausted quota do not consume the provider-failure retry budget. If an unsent appointment's client email changes, retry state is reset.

Netlify invokes the reminder and review routes hourly through a thin scheduled function using `CRON_SECRET`. Business rules remain in the tenant-aware Next API routes.

## Non-goals for Phase 1

- Automated subscription billing or payment processing (Stripe checkout/webhooks are not connected yet).
- Manual editing of Stripe customer/subscription/price identifiers from Platform Admin.
- Automatic lifecycle transitions when a trial or payment period expires.
- Hard employee/service/location commercial limits until pricing and packaging are finalized.
- Treating `partial` or `planned` capabilities as production-ready paid promises.
- Self-service signup.
- Multiple locations per organization.
- Native mobile applications.
- Advanced marketing automation beyond the currently finished appointment/reminder/review email flows and manual CRM retention queue.
- Claiming regulatory/legal compliance solely from technical consent controls; legal/policy review remains separate.
- SMS provider integration.

## Security rules for the public repository

- Never commit `.env` files or API secrets.
- Never commit real client names, phone numbers, email addresses, appointment notes, or database dumps.
- Use fictional data in seeds and screenshots.
- Enforce tenant isolation in the database before onboarding multiple salons.
- Platform Admin may access tenant/account metadata, billing metadata, plan entitlements, aggregate email usage and automation configuration state, but not salon clients, appointments, treatment notes, message contents, marketing preference tokens or tenant CRM action details.
- Stripe identifiers are platform metadata only and should be populated by the future Stripe integration, not by salon users.
- Server-side entitlement checks are authoritative; hiding or locking UI controls alone is not sufficient.
- Premium data surfaces should use database/RLS enforcement where direct tenant data access could otherwise bypass application guards.
- Background jobs and public APIs must be tenant- and entitlement-aware before a premium capability is enforced commercially.
- Background entitlements should be checked at delivery/execution time where possible so upgrades and downgrades apply without destructive cleanup.
- Future marketing email must fail closed unless the server-side marketing eligibility helper returns `allowed` plus an unsubscribe URL.

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
12. First staged enforcement: Growth Waitlist/Reports and Pro Audit Log.
13. Growth CRM/attendance insight enforcement.
14. Tenant-aware managed email, quota protection and Growth appointment reminders.
15. Platform Admin tenant/global email usage and quota controls.
16. Pro tenant-aware automated Google review requests.
17. Pro Advanced CRM retention action queue and append-only action history.
18. Client marketing communication preferences, public opt-in/unsubscribe and future delivery gate.
19. Commercial pilot readiness, repeat-client deduplication and final pricing/package approval.
20. Consent-gated Pro CRM follow-up automation and remaining planned integrations.
21. Stripe checkout/webhooks when pricing and subscription rules are finalized.
