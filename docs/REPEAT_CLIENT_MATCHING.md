# Repeat-client matching for online booking

When a pending public online-booking request is accepted, SalonFlow should reuse an existing active CRM client when the identity signal is strong enough instead of creating a duplicate client row.

## Matching order

1. Normalize the booking email with trim + lowercase.
2. If exactly one active client in the organization has the same normalized email, reuse that client.
3. If multiple active clients share that email, first try to narrow them with the same normalized phone. If that produces exactly one client, reuse it.
4. If email is still ambiguous, compare the booking full name with the candidate's stored first + last name after Unicode normalization, lowercase and whitespace normalization. Reuse only when that produces exactly one client.
5. If no email match exists, normalize the phone to digits only. Phone values shorter than seven digits are not identity signals.
6. If exactly one active client has the same normalized phone, reuse it only when that client has no email or has the same normalized email as the booking request.
7. If multiple clients share the same phone, the same exact normalized full name may disambiguate them. A phone candidate that already has a different non-empty email is still not auto-linked.
8. If more than one plausible client remains after these tie-breakers, stop acceptance and show an ambiguity error. SalonFlow must not pick an arbitrary record.

Matching never crosses `organization_id` and ignores inactive/soft-deleted clients.

The tie-breakers are deliberately conservative. Name is never used as the primary identity signal on its own; it only narrows an already matched email/phone candidate set.

## Existing-client enrichment

Reusing an existing client does not overwrite established CRM data from a public booking request.

SalonFlow may only fill:

- a missing email address;
- a missing phone number;
- an `unknown` marketing-email preference when the accepted public booking carries a verified explicit marketing opt-in.

Existing names, notes and non-empty contact fields are not replaced automatically.

A stored `not_allowed` marketing preference is sticky and is not changed by repeat-client matching. Staff can change that preference explicitly from the client profile when appropriate.

## Marketing consent

The database guard accepts `unknown -> allowed` for an existing client from an online booking only when the pending request proves the opt-in:

- same organization;
- same normalized email;
- `marketing_email_opt_in = true`;
- a stored opt-in timestamp;
- the client consent timestamp equals the request opt-in timestamp;
- request is still pending while the client update is performed.

This lets either an admin or employee accept a legitimate repeat-client booking without weakening the general marketing-preference mutation rules.

`not_allowed -> allowed` is deliberately excluded from this exception.

## Rollback safety

The accept flow tracks whether it created a new CRM client. If appointment creation fails, SalonFlow deletes only a client created by that same acceptance attempt. A reused existing client is never deleted as rollback cleanup.

## Current limitations

- Existing historical duplicate clients are not automatically merged by this feature.
- Matching currently derives normalized values server-side from active client rows rather than indexed normalized identity columns. This is appropriate for the current pilot scale but should be optimized before very large tenant datasets.
- Two truly concurrent acceptance requests for the same brand-new person can still race before either newly created client becomes visible to the other request. A later scaling hardening step can add an advisory-lock or database-level find-or-create primitive.
- Phone normalization is intentionally country-neutral and compares digits exactly. SalonFlow does not assume a Croatian or other market-specific country code when matching.
