# SalonFlow Plan Entitlements

This document summarizes the current three-tier commercial entitlement model. Detailed capability status and implementation notes live in `docs/PLAN_CAPABILITY_MATRIX.md`.

## Plans

- **Starter** — complete core salon operations.
- **Growth** — utilization, retention, CRM insight and automation features for growing salons.
- **Pro** — governance plus future advanced CRM, integrations and automation.

Pricing is intentionally not encoded yet.

## Trial rule

A tenant with lifecycle status `trial` receives the **Pro entitlement set** for the duration of the trial, regardless of its stored paid `plan_code`. This lets a new salon evaluate the complete currently available product before selecting a paid tier.

## Capability matrix

| Capability | Starter | Growth | Pro | Delivery / enforcement |
| --- | :---: | :---: | :---: | --- |
| Calendar | ✓ | ✓ | ✓ | Available |
| Appointment management | ✓ | ✓ | ✓ | Available |
| Clients and history | ✓ | ✓ | ✓ | Available |
| Care and safety | ✓ | ✓ | ✓ | Available; intentionally not paywalled |
| Services, rooms and equipment | ✓ | ✓ | ✓ | Available |
| Employee schedules | ✓ | ✓ | ✓ | Available |
| Appearance and branding | ✓ | ✓ | ✓ | Available |
| Online booking | ✓ | ✓ | ✓ | Available |
| Booking notifications | ✓ | ✓ | ✓ | Available |
| Basic operational overview | ✓ | ✓ | ✓ | Available |
| Waitlist | — | ✓ | ✓ | Available; enforced |
| Automatic waitlist matching | — | ✓ | ✓ | Available; covered by waitlist enforcement |
| CRM insights | — | ✓ | ✓ | Available; enforced |
| No-show/cancellation insights | — | ✓ | ✓ | Available; enforced |
| Advanced reports | — | ✓ | ✓ | Available; enforced |
| 24h appointment reminders | — | ✓ | ✓ | Available; enforced at delivery time |
| Audit log and export | — | — | ✓ | Available; enforced |
| Advanced CRM workflow | — | — | ✓ | Planned |
| Automated review requests | — | — | ✓ | Partial; not commercially enforced yet |
| Advanced automations | — | — | ✓ | Planned |
| Advanced integrations | — | — | ✓ | Planned |
| Priority support | — | — | ✓ | Planned |

## Implementation source of truth

The application source of truth is `src/lib/entitlements.ts`.

- `minimumPlan` defines the minimum paid tier for a capability.
- `availability` distinguishes `available`, `partial` and `planned` functionality.
- `getEffectiveEntitlementPlan()` implements the Pro-trial rule.
- `planHasCapability()` and `organizationHasCapability()` implement plan capability checks.
- `CurrentUserPermissions` exposes tenant plan, lifecycle and effective entitlement plan for server-side authorization.

## Current enforcement state

Commercial enforcement is active in controlled stages:

- Growth Waitlist: navigation/page/actions and database RLS.
- Growth CRM/attendance insights: server query calculation/return plus in-profile upgrade state.
- Growth Reports: server page guard and navigation state.
- Growth 24h Appointment Reminders: current tenant plan/lifecycle is checked by the background delivery job immediately before sending.
- Pro Audit Log: page/export guards plus database read RLS.

Starter retains all core salon operation, client history, care/safety and treatment-note functionality. Downgrading does not delete premium data; access/derived premium behavior becomes available again after an eligible upgrade.

Capabilities marked `partial` or `planned` must not be presented as finished paid functionality and remain outside enforcement until their dedicated implementation/hardening stage.

## Limits

Employee, service, client and appointment hard limits are intentionally not active. The plan catalog keeps a limits structure for future use, but all current values remain unlimited until commercial rules are finalized.
