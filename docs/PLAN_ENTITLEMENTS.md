# SalonFlow Plan Entitlements

This document describes the current three-tier commercial capability model. It is a product foundation, not yet an enforcement policy.

## Plans

- **Starter** — core salon operations.
- **Growth** — automation and insight features for growing salons.
- **Pro** — highest tier for advanced CRM, integrations and automation.

Pricing is intentionally not encoded yet.

## Trial rule

A tenant with lifecycle status `trial` receives the **Pro entitlement set** for the duration of the trial, regardless of its stored paid `plan_code`. This lets a new salon evaluate the complete product before selecting a paid tier.

## Capability matrix

| Capability | Starter | Growth | Pro | Delivery |
| --- | :---: | :---: | :---: | --- |
| Calendar | ✓ | ✓ | ✓ | Available |
| Appointment management | ✓ | ✓ | ✓ | Available |
| Clients | ✓ | ✓ | ✓ | Available |
| Services, rooms and equipment | ✓ | ✓ | ✓ | Available |
| Employee schedules | ✓ | ✓ | ✓ | Available |
| Online booking | ✓ | ✓ | ✓ | Available |
| Basic notifications | ✓ | ✓ | ✓ | Available |
| Basic reports | ✓ | ✓ | ✓ | Available |
| Waitlist | — | ✓ | ✓ | Available |
| Automatic waitlist matching | — | ✓ | ✓ | Available |
| CRM insights | — | ✓ | ✓ | Available |
| No-show and cancellation insights | — | ✓ | ✓ | Available |
| Advanced reports | — | ✓ | ✓ | Available |
| Advanced CRM | — | — | ✓ | Available |
| Advanced automations | — | — | ✓ | Planned |
| Advanced integrations | — | — | ✓ | Planned |
| Priority support | — | — | ✓ | Planned |

## Implementation source of truth

The application source of truth is `src/lib/entitlements.ts`.

- `minimumPlan` defines the minimum paid tier for a capability.
- `availability` distinguishes currently available functionality from planned functionality.
- `getEffectiveEntitlementPlan()` implements the Pro-trial rule.
- `planHasCapability()` and `organizationHasCapability()` are the future enforcement helpers.
- `CurrentUserPermissions` exposes tenant plan, lifecycle and effective entitlement plan for server-side authorization.

## Current enforcement state

**Capability enforcement is intentionally disabled.**

Changing a tenant from Pro to Starter or Growth currently changes metadata and the Platform Admin preview only. It does not hide navigation items, reject API calls or remove access to existing salon features.

Enforcement should only be activated after the final packaging and pricing decision is approved. When enforcement is activated, server-side checks must be the source of truth; UI hiding alone is not sufficient.

## Limits

Employee, service, client and appointment hard limits are intentionally not active. The plan catalog keeps a limits structure for future use, but all current values remain unlimited until commercial rules are finalized.
