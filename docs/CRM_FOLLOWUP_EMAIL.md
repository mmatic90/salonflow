# CRM follow-up email

This is the first consent-gated email action built on the Pro Advanced CRM retention queue.

## Scope

The current batch is deliberately manual. A Pro/Trial admin may click **Send follow-up email** for a current `/dashboard/retention` candidate. There is no scheduled/background CRM marketing send yet.

A successful send:

1. revalidates that the retention signal is still current;
2. atomically claims the deterministic signal generation;
3. checks the client marketing-email preference server-side;
4. requires `marketing_email_status = allowed`;
5. obtains the opaque unsubscribe URL through `getMarketingEmailDeliveryContext()`;
6. sends through SalonFlow Managed Email with the `advanced_crm` capability;
7. records the delivery as `sent`;
8. inserts the existing CRM `contacted` action for the same signal generation.

This removes the candidate from the active queue using the same suppression logic as a manual contacted action.

## Fail-closed consent rules

`unknown`, `not_allowed`, missing email and missing/inactive client never reach Managed Email quota reservation/provider delivery. The attempt is recorded as `skipped` in the CRM delivery ledger.

The browser cannot opt a client in or mark a delivery as sent through this flow. Consent is re-read server-side at send time, and delivery claim/outcome RPCs are executable by service role only.

Operational appointment communication remains independent from marketing/retention consent.

## Delivery state and deduplication

`crm_retention_email_deliveries` stores one row per `(organization_id, signal_key)` with:

- `processing`
- `sent`
- `failed`
- `skipped`

A successful `sent` state is permanent for that signal generation. Repeated clicks therefore cannot send the same CRM follow-up twice.

Failed and skipped states may be manually retried later. This is required because an unknown preference may later become allowed, a missing email may be added, or a temporary provider/quota failure may be resolved.

Claims use a transaction advisory lock and a ten-minute processing lease so overlapping requests do not normally double-send. The current provider abstraction does not yet expose provider-level idempotency keys; if delivery succeeds but the database becomes unavailable before the sent outcome is recorded, exactly-once delivery cannot be mathematically guaranteed. This edge remains a hardening item before high-volume automation.

## Content

Templates are available in HR/EN/IT using the tenant locale. The wording is deliberately friendly and non-judgmental. Attendance-risk clients are not told that they are being targeted because of no-show/cancellation behavior.

The message contains:

- salon branding;
- a neutral reason-aware return message;
- a link to the tenant public booking page;
- a clear marketing/retention context note;
- the client-specific unsubscribe link.

No discount or promotional offer is invented by SalonFlow.

## Plan boundary

Manual CRM follow-up email is part of the existing `advanced_crm` Pro capability. Trial receives Pro-equivalent entitlement.

The future **automatic scheduled CRM follow-up** remains separate planned automation work and must not be enabled until this manual flow is validated.
