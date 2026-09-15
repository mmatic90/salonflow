# SalonFlow Managed Email Foundation

SalonFlow tenant communication is email-only. SMS/Twilio delivery is intentionally not part of the reusable SaaS foundation.

## Architecture

Tenant emails do not call Resend directly from feature code. Active booking confirmations, booking rejections, manual appointment confirmations/updates, 24h appointment reminders and automated Google review requests route through the managed tenant email layer:

1. `src/lib/email/tenant-notifications.ts` for booking/reminder tenant-facing templates;
2. `src/lib/email/review-request-email.ts` for the Pro Google review request template;
3. `src/lib/email/managed-email.ts` for tenant entitlement, provider choice and quota enforcement;
4. `src/lib/email/provider.ts` for the concrete provider implementation.

Resend is currently the only managed provider implementation. The application model reserves `custom` as a future provider mode, but custom credentials are deliberately not stored yet. A custom provider must not be enabled until credential encryption/secrets handling is designed.

Platform/internal feedback email is not tenant usage and remains outside this managed tenant quota path.

## Tenant settings

`organization_email_settings` stores non-secret tenant configuration:

- `provider` — `salonflow` today; `custom` reserved for future use;
- `managed_email_enabled`;
- optional sender display name;
- optional Reply-To address;
- optional per-tenant monthly limit override.

Existing organizations are backfilled. New organizations receive a settings row automatically.

The dashboard exposes a read-only `Settings -> Email & notifications` page for eligible tenants. It shows provider state, sender/Reply-To information and current monthly usage. It intentionally does not expose provider credentials.

Reply-To resolution prefers:

1. the explicit tenant email setting;
2. the organization's own contact email;
3. the SalonFlow environment fallback.

This keeps replies directed to the salon rather than to the platform operator by default.

## Usage and quota protection

`organization_email_usage` stores monthly counts per tenant:

- attempted sends;
- successful sends;
- failed sends.

A database function reserves an email attempt atomically before provider delivery. The reservation checks both the tenant monthly limit and a global SalonFlow managed-email limit. This prevents one tenant from consuming the entire provider allowance and also provides a global emergency ceiling.

Failed provider attempts remain counted as attempts. This is intentional: repeated invalid/failing requests must not be usable to bypass the safety cap.

Production requires explicit environment limits:

- `SALONFLOW_MANAGED_EMAIL_MONTHLY_LIMIT`
- `SALONFLOW_MANAGED_EMAIL_GLOBAL_MONTHLY_LIMIT`

Development has small safety fallbacks only. Production fails closed when the limits are absent or invalid.

The current default limit is configuration, not finalized commercial pricing. Per-tenant overrides are stored in the database so future plan/contract-specific quotas can be introduced without redesigning delivery.

Platform Admin has a dedicated per-salon managed-email screen. It shows the current UTC-month usage, effective tenant limit, remaining quota, provider state, sender and Reply-To context. Usage counters are intentionally read-only. Platform Admin can only set a positive per-tenant `monthly_limit_override` or return the salon to the platform default. A tenant override never bypasses the global SalonFlow safety ceiling.

The Platform Admin usage card surfaces warning states at 80% utilization and at quota exhaustion. Manual usage reset is intentionally not supported because it would undermine cost protection and usage accounting.

Platform Admin also has a global `Managed email` dashboard. It aggregates current-month attempted, sent and failed counts across all tenants, compares total attempts with `SALONFLOW_MANAGED_EMAIL_GLOBAL_MONTHLY_LIMIT`, and surfaces global warning states at 80% and 100%. The per-salon table shows plan/lifecycle, provider state, effective tenant quota, remaining quota and utilization percentage, sorted by highest utilization so high-risk tenants are visible first. Each row links to the existing per-salon quota screen.

The global dashboard is read-only. It does not expose client records, appointments, message contents or other salon operational data, and it cannot edit or reset global or tenant usage counters.

## Sender strategy

Local Resend testing may use `onboarding@resend.dev` when allowed by Resend testing rules. Production should use a verified domain owned by the SalonFlow SaaS product, not a personal or M.i.T. Informatika sender domain.

The intended production pattern is:

`Salon name <notifications@managed-salonflow-domain>`

with Reply-To pointing to the tenant salon's own contact email.

## Entitlements

The managed email layer checks the capability associated with the email before quota reservation and provider delivery:

- booking confirmation/rejection/create/update emails use `booking_notifications`;
- 24h reminders use `appointment_reminders`;
- Google review request emails use `review_requests`.

`booking_notifications` is a **Growth** capability. Growth, Pro and Trial tenants can use SalonFlow Managed Email for operational client notifications. Starter keeps online booking and normal appointment management, but automatic client email delivery is not included.

`appointment_reminders` is a **Growth** capability. Growth/Pro/Trial receive proactive 24h reminders in addition to managed operational notifications.

`review_requests` is a **Pro** capability. Pro/Trial tenants can opt in, store their own Google review URL, choose a 2h or 24h delay and send one managed review request after an eligible `completed` appointment. Starter and Growth see a locked settings entry and cannot consume quota for review delivery.

Entitlement checks happen before quota reservation, so blocked plan sends do not consume tenant or global managed-email usage.

## Scheduled delivery

Netlify `netlify/functions/email-automations.mjs` runs hourly and calls both `/api/cron/email-reminders` and `/api/cron/review-requests` with `CRON_SECRET` bearer authorization.

The scheduler is intentionally thin. Tenant configuration, plan/lifecycle checks, timezone handling, quota reservation, delivery state and retry rules remain inside the application routes.

Review-request delivery additionally uses an atomic appointment claim, a maximum of three attempts and a one-hour retry interval. The tenant activation timestamp prevents historical appointments from receiving retroactive review requests.

## Future custom provider

A future Pro/BYOP option may allow a salon to use its own provider account/domain. Before implementation, SalonFlow needs a credential-safe design such as encrypted secrets or an external secret store. Plain API keys must never be stored in tenant-readable database columns.

When implemented, provider choice should remain behind the same notification interface so booking, appointment, reminder and review features do not need provider-specific code.
