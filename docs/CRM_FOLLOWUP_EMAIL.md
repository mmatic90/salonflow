# CRM follow-up email

SalonFlow supports consent-gated retention email on top of the Pro Advanced CRM queue.

## Manual follow-up

A Pro/Trial admin may click **Send follow-up email** for a current `/dashboard/retention` candidate.

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

## Automatic daily follow-up

The `automations` Pro capability adds an opt-in daily CRM follow-up job.

Automation is **disabled by default** for every organization. Pro/Trial management users configure it under `Settings -> Automatic CRM follow-up` by choosing:

- enabled / disabled;
- daily send limit (1-20, with UI presets for 3/5/10/20).

The settings page includes a dry-run preview. The preview never sends email and shows the current retention candidates that already have an explicit marketing-email opt-in.

The production scheduler calls `/api/cron/retention-followups` once per day. A service-role daily claim is stored per organization/local date so the same tenant is not normally processed twice on the same day. A stale `processing` run may be reclaimed after two hours; the per-signal delivery ledger remains the final duplicate-send guard.

For an enabled eligible tenant, the job:

1. resolves the tenant's current plan/lifecycle and local date;
2. derives current CRM candidates through the same retention engine used by `/dashboard/retention`;
3. filters to candidates that currently advertise `marketing_email_status = allowed` and have an email;
4. applies the tenant daily limit;
5. rechecks consent again immediately before each send through `getMarketingEmailDeliveryContext()`;
6. uses the same `deliverRetentionFollowup()` pipeline as the manual button;
7. sends through Managed Email, records delivery state and creates `contacted` only after a successful send;
8. stores aggregate last-run metadata only.

Clients with `unknown`, `not_allowed` or missing email do not consume Managed Email quota. They remain eligible to appear in the CRM queue and may become send-eligible later if their preference/contact data legitimately changes.

## Fail-closed consent rules

`unknown`, `not_allowed`, missing email and missing/inactive client never reach Managed Email quota reservation/provider delivery.

The browser cannot opt a client in or mark a delivery as sent through this flow. Consent is re-read server-side at send time, and delivery claim/outcome RPCs are executable by service role only.

Operational appointment communication remains independent from marketing/retention consent.

## Delivery state and deduplication

`crm_retention_email_deliveries` stores one row per `(organization_id, signal_key)` with:

- `processing`
- `sent`
- `failed`
- `skipped`

A successful `sent` state is permanent for that signal generation. Manual and automatic delivery share this same ledger, so switching between the two paths does not permit the same CRM signal to be sent twice.

Failed and skipped states may be retried later. This is required because an unknown preference may later become allowed, a missing email may be added, or a temporary provider/quota failure may be resolved.

Claims use a transaction advisory lock and a ten-minute processing lease so overlapping requests do not normally double-send. The current provider abstraction does not expose provider-level idempotency keys; if delivery succeeds but the database becomes unavailable before the sent outcome is recorded, exactly-once delivery cannot be mathematically guaranteed. This remains a hardening item before high-volume operation.

## Content

Templates are available in HR/EN/IT using the tenant locale. The wording is deliberately friendly and non-judgmental. Attendance-risk clients are not told that they are being targeted because of no-show/cancellation behavior.

The message contains:

- salon branding;
- a neutral reason-aware return message;
- a link to the tenant public booking page;
- a clear marketing/retention context note;
- the client-specific unsubscribe link.

No discount or promotional offer is invented by SalonFlow.

## Platform Admin boundary

Platform Admin may see only automation configuration and aggregate delivery/run metadata: enabled state, daily limit, last run status/counts and aggregate sent/failed/skipped ledger counts.

Platform Admin does **not** receive client names, CRM reason details, email targets, unsubscribe tokens or message content through this surface.

## Plan boundary

Manual CRM follow-up email belongs to `advanced_crm` and automatic daily CRM follow-up belongs to `automations`. Both are Pro capabilities. Trial receives Pro-equivalent entitlement.
