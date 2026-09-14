# SalonFlow Plan Entitlements

This document summarizes the current three-tier commercial entitlement model. Detailed capability status and implementation notes live in `docs/PLAN_CAPABILITY_MATRIX.md`.

## Plans

- **Starter** — complete core salon operations without SalonFlow-paid outbound automation.
- **Growth** — managed client email, utilization, retention and CRM insight for growing salons.
- **Pro** — governance plus finished/premium automation and future advanced CRM/integrations.

Pricing is intentionally not encoded yet.

## Trial rule

A tenant with lifecycle status `trial` receives the **Pro entitlement set** for the duration of the trial, regardless of its stored paid `plan_code`. This lets a new salon evaluate the complete currently available product before selecting a paid tier.

## Communication rule

SalonFlow automated client communication is **email-only**. Phone numbers remain available as salon/client contact data, but the product has no SMS/Twilio delivery path.

SalonFlow Managed Email for booking acceptance/rejection and appointment create/change notifications starts at Growth. The proactive 24h appointment reminder is also Growth. Automated Google review requests after eligible completed appointments are Pro.

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
| Basic operational overview | ✓ | ✓ | ✓ | Available |
| Managed email booking notifications | — | ✓ | ✓ | Available; enforced before quota reservation |
| Waitlist | — | ✓ | ✓ | Available; enforced |
| Automatic waitlist matching | — | ✓ | ✓ | Available; covered by waitlist enforcement |
| CRM insights | — | ✓ | ✓ | Available; enforced |
| No-show/cancellation insights | — | ✓ | ✓ | Available; enforced |
| Advanced reports | — | ✓ | ✓ | Available; enforced |
| 24h email appointment reminders | — | ✓ | ✓ | Available; enforced at delivery time |
| Audit log and export | — | — | ✓ | Available; enforced |
| Automated Google review requests | — | — | ✓ | Available; tenant-configured and enforced at delivery time |
| Advanced CRM workflow | — | — | ✓ | Planned |
| Custom email provider/domain | — | — | ✓ | Planned; requires credential-safe secret storage |
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

- Growth Managed Email: booking acceptance/rejection and appointment create/change notifications are gated centrally before quota reservation/provider delivery.
- Growth Waitlist: navigation/page/actions and database RLS.
- Growth CRM/attendance insights: server query calculation/return plus in-profile upgrade state.
- Growth Reports: server page guard and navigation state.
- Growth 24h Appointment Reminders: current tenant plan/lifecycle is checked immediately before delivery.
- Pro Audit Log: page/export guards plus database read RLS.
- Pro Automated Google Review Requests: settings/action guards plus current entitlement check immediately before managed-email delivery; tenant URL, activation boundary and per-appointment delivery state prevent cross-tenant or retroactive automation.

Starter retains all core salon operation, online booking, client history, care/safety and treatment-note functionality. Downgrading does not delete premium data; access/derived premium behavior becomes available again after an eligible upgrade.

Capabilities marked `partial` or `planned` must not be presented as finished paid functionality and remain outside enforcement until their dedicated implementation/hardening stage.

## Limits

Employee, service, client and appointment hard limits are intentionally not active. Managed email is the exception: per-tenant and global monthly safety quotas are enforced to control shared provider cost. Commercial email allowances are not final pricing yet and can be overridden per tenant by Platform Admin.
