# SalonFlow Managed Email Foundation

SalonFlow tenant communication is email-only. SMS/Twilio delivery is intentionally not part of the reusable SaaS foundation.

## Architecture

Tenant emails do not call Resend directly from feature code. Active booking confirmations, booking rejections, manual appointment confirmations/updates and 24h appointment reminders route through:

1. `src/lib/email/tenant-notifications.ts` for localized tenant-facing templates;
2. `src/lib/email/managed-email.ts` for tenant entitlement, provider choice and quota enforcement;
3. `src/lib/email/provider.ts` for the concrete provider implementation.

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

## Sender strategy

Local Resend testing may use `onboarding@resend.dev` when allowed by Resend testing rules. Production should use a verified domain owned by the SalonFlow SaaS product, not a personal or M.i.T. Informatika sender domain.

The intended production pattern is:

`Salon name <notifications@managed-salonflow-domain>`

with Reply-To pointing to the tenant salon's own contact email.

## Entitlements

The managed email layer checks the capability associated with the email before quota reservation and provider delivery:

- booking confirmation/rejection/create/update emails use `booking_notifications`;
- 24h reminders use `appointment_reminders`;
- future review-request delivery must use `review_requests`.

`booking_notifications` is now a **Growth** capability. Growth, Pro and Trial tenants can use SalonFlow Managed Email for operational client notifications. Starter keeps online booking and normal appointment management, but automatic client email delivery is not included.

`appointment_reminders` remains a **Growth** capability. This means Growth/Pro/Trial receive both managed operational notifications and proactive 24h reminders, while Starter remains a complete manual/core booking product without platform-paid outbound email.

The Settings card is locked for Starter and routes to the existing upgrade explanation. The public booking success copy is plan-neutral so Starter never promises an automatic email that its plan does not include.

Entitlement checks happen before quota reservation, so blocked Starter sends do not consume tenant or global managed-email usage.

## Future custom provider

A future Pro/BYOP option may allow a salon to use its own provider account/domain. Before implementation, SalonFlow needs a credential-safe design such as encrypted secrets or an external secret store. Plain API keys must never be stored in tenant-readable database columns.

When implemented, provider choice should remain behind the same notification interface so booking, appointment and reminder features do not need provider-specific code.