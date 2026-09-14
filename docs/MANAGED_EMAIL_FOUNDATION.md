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

## Sender strategy

Local Resend testing may use `onboarding@resend.dev` when allowed by Resend testing rules. Production should use a verified domain owned by the SalonFlow SaaS product, not a personal or M.i.T. Informatika sender domain.

The intended production pattern is:

`Salon name <notifications@managed-salonflow-domain>`

with Reply-To pointing to the tenant salon's own contact email.

## Entitlements

The managed email layer checks the capability associated with the email before delivery:

- booking confirmation/rejection/update emails use `booking_notifications`;
- 24h reminders use `appointment_reminders`;
- future review-request delivery must use `review_requests`.

The current plan allocation is intentionally unchanged by this infrastructure batch. Booking notifications remain Starter while 24h reminders remain Growth. If managed booking email becomes a paid-only feature, that plan change should be introduced together with visible settings/upgrade UX so Starter does not silently lose notifications.

## Future custom provider

A future Pro/BYOP option may allow a salon to use its own provider account/domain. Before implementation, SalonFlow needs a credential-safe design such as encrypted secrets or an external secret store. Plain API keys must never be stored in tenant-readable database columns.
