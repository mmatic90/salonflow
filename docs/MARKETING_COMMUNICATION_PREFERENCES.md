# Marketing Communication Preferences

SalonFlow keeps operational appointment communication separate from optional marketing/retention communication.

This foundation is intentionally conservative. It provides technical controls for recording and enforcing communication preferences, but it is not by itself a legal-compliance certification.

## Communication categories

Operational appointment email is not controlled by the marketing preference. Current examples include booking acceptance/rejection, appointment create/change notifications and appointment reminders. Existing Google review automation also remains a separate product automation until its policy classification is reviewed explicitly.

Future retention/promotional email must use the marketing preference gate described below.

## Client marketing status

Each client has one marketing-email status:

- `unknown` — no explicit marketing preference is recorded;
- `allowed` — explicit permission to receive marketing/retention email is recorded;
- `not_allowed` — the client explicitly declined or unsubscribed.

`unknown` must never be treated as consent.

The legacy `clients.marketing_consent` boolean remains temporarily for backwards compatibility. The richer status is authoritative. During migration, legacy `true` becomes `allowed`; the old default `false` becomes `unknown`, not an explicit refusal.

## Preference metadata

`clients` stores:

- status;
- consent timestamp when status is `allowed`;
- consent source;
- source of the latest preference change;
- latest preference-change timestamp;
- authenticated user responsible for a manual change when applicable.

Supported sources are currently:

- `manual`;
- `online_booking`;
- `unsubscribe`;
- `import`;
- `legacy`.

Changing a client email address resets an existing `allowed` status to `unknown`. Permission recorded for one email address is not silently transferred to a replacement address.

## Append-only history

`client_marketing_preference_events` records explicit status transitions. Tenant members can read this history through RLS, but tenant users cannot update or delete event rows.

The database trigger records transitions atomically with the client preference update, so preference history does not depend on a best-effort UI audit call.

The standard SalonFlow audit log additionally records manual administrator preference changes.

## Online booking opt-in

The public booking form contains an optional, unchecked marketing checkbox in HR/EN/IT.

The checkbox is not required for booking. A checked request stores `marketing_email_opt_in = true` plus its timestamp on `online_booking_requests`.

When the request is accepted and the CRM client is created:

- checked opt-in -> client status `allowed`, source `online_booking`;
- unchecked -> client status `unknown`.

A rejected booking request does not create a CRM client merely for marketing purposes.

## Manual profile management

The client edit profile shows `Communication preferences` with the current status and recent append-only history.

Only salon administrators can change the marketing preference from the UI. `allowed` cannot be selected unless the client currently has an email address.

This preference is part of core client data and is not plan-gated. Starter, Growth and Pro can record it; only future premium automation is plan-gated.

## Unsubscribe

Every client receives an opaque UUID unsubscribe token stored in `client_marketing_unsubscribe_tokens`.

Tenant users cannot read this token table through RLS. Server-side/service-role code uses the token only to build a public unsubscribe URL.

`/unsubscribe/[token]` can only move the matching client's marketing status to `not_allowed`. It cannot opt a client in, read salon operational data, modify appointments or expose the client profile.

Unsubscribe is idempotent. Reusing a valid link after the client is already opted out remains a successful no-op.

## Authoritative delivery gate

Future marketing/retention email must call:

`getMarketingEmailDeliveryContext({ organizationId, clientId })`

from `src/lib/marketing/marketing-email.ts` before provider delivery.

The helper returns an eligible email target and unsubscribe URL only when:

- the client exists in the requested organization;
- the client is active;
- the client has an email address;
- `marketing_email_status = 'allowed'`.

`unknown`, `not_allowed`, missing email and missing client all fail closed.

A future Pro CRM follow-up automation must use this gate before Managed Email quota reservation/provider delivery and include the returned unsubscribe URL in every marketing message.

## Known follow-up before automated retention campaigns

Online-booking acceptance currently creates a new client record rather than matching an existing CRM client. Before broad automated retention campaigns are enabled, repeat-client matching/deduplication should be hardened so one real person cannot accidentally receive duplicate campaign messages through duplicate CRM records.
