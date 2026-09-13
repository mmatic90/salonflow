# SalonFlow Plan Capability Matrix

This document records the audited commercial capability split for the current SalonFlow codebase before plan enforcement is enabled.

## Status meanings

- **Available** — implemented and suitable for tenant use in the current multi-tenant foundation.
- **Partial** — meaningful implementation exists, but it must be finished or tenant-hardened before it is enforced or advertised as fully available.
- **Planned** — commercial roadmap capability; do not market it as currently delivered.

Plan enforcement is intentionally **not enabled yet**. The matrix is the source for the next implementation phase.

## Trial rule

A tenant in `trial` lifecycle receives the effective **Pro entitlement set** for the duration of the trial, regardless of the stored paid-plan choice. Trial expiration does not yet transition the tenant automatically.

## Starter

Starter must remain a complete day-to-day salon-management product. Safety-related client information is intentionally not paywalled.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Calendar | Available | `/dashboard/calendar`, week and time-grid views. |
| Appointment management | Available | Create/edit appointments, multi-service appointments, statuses and availability validation. |
| Clients and history | Available | Client CRUD, appointment history/upcoming visits and rebook flow. |
| Care and safety | Available | Allergies/sensitivities, contraindications, treatment preferences and per-visit treatment notes. Keep in Starter because it is safety/continuity-of-care data. |
| Services, rooms and equipment | Available | Service/resource CRUD plus employee/service, service/room and service/equipment mappings. |
| Employees and schedules | Available | Employees, default schedules, quick ranges, breaks and date overrides. |
| Appearance and basic branding | Available | Theme, logo and tenant presentation settings. |
| Online booking | Available | Public tenant booking page/API, availability and dashboard request handling. |
| Booking notifications | Available | Tenant-aware booking accept/reject email/SMS plus appointment-created/updated SMS flows. |
| Basic operational overview | Available | Main dashboard counts and daily operational overview. This is the Starter reporting surface. |

### Starter enforcement note

Do **not** gate core appointment availability rules, salon hours, employee schedules, room/resource conflict validation or care/safety data separately. They are part of a reliable core booking product.

## Growth

Growth adds utilization, retention and management insight on top of the Starter foundation.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Waitlist | Available | `/dashboard/waitlist`, waiting/history lifecycle and booking prefill. |
| Automatic waitlist opportunities | Available | Event-driven freed-slot matching plus dashboard opportunity panel. |
| CRM insights | Available | Client segmentation, favorite service/employee, visit cadence and CRM signals. |
| Attendance insights | Available | Completed/cancelled/no-show counts and history-aware rates. |
| Advanced reports | Available | Full `/dashboard/reports` module: status mix, online conversion, trends, employees, services and busiest days. |
| Appointment reminders | Partial | Tenant-aware SMS scheduling exists. The separate email reminder cron still needs full tenant context/branding and per-tenant commercial enforcement before this capability should be considered fully ready. |

### Growth enforcement targets

When enforcement is enabled, at minimum guard both navigation/UI **and server-side actions/queries** for waitlist, smart waitlist, CRM-derived insights and the full Reports module. Hiding links alone is not sufficient.

The main dashboard must remain functional on Starter; Growth-only waitlist queries/panels should be skipped rather than queried and hidden afterward.

## Pro

Pro is the governance/automation tier. The current product has one clearly finished Pro-specific governance capability; the rest must remain explicitly roadmap/partial until completed.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Audit log and export | Available | Tenant-scoped immutable `audit_logs`, filtered dashboard view and export route. Strong fit for larger multi-user salons. |
| Advanced CRM workflow | Planned | Future retention action lists, follow-up workflow and CRM-driven tasks. Existing client insights belong to Growth, not this capability. |
| Automated review requests | Partial | A prototype cron exists, but currently contains single-salon assumptions including a hardcoded Body & Soul SMS label and Google review URL and is not safe to expose as a multi-tenant Pro feature yet. |
| Advanced automations | Planned | Future follow-up and operational automations beyond existing booking flows. |
| Advanced integrations | Planned | Future third-party integrations. |
| Priority support | Planned | Commercial support entitlement; operational process still to be defined. |

## Important implementation findings

### Reports

The existing `/dashboard/reports` page is already substantially more than a basic report: monthly status quality, no-show rate, online-booking conversion, activity trends, top employees/services and busiest days. Therefore the **full Reports page belongs to Growth**. Starter uses the existing dashboard operational overview as its basic reporting surface.

### CRM

The current client profile already computes segments, attendance rates, favorite service/employee, average visit cadence and warning signals. These are the real **Growth CRM insights**. There is not yet a distinct finished "advanced CRM" workflow, so Pro `advanced_crm` remains planned.

### Care and safety

Client allergies/sensitivities, contraindications, treatment preferences and treatment notes are implemented. They remain Starter functionality and must not be used as an upsell boundary.

### Notifications and reminders

Booking accept/reject communication is tenant-aware and reusable. Appointment-created/updated SMS and scheduled SMS reminders also include the tenant salon name. However, the standalone email-reminder cron currently scans appointments globally and does not resolve/push full tenant branding into the reminder email. For this reason:

- `booking_notifications` = Starter / Available
- `appointment_reminders` = Growth / Partial until tenant-hardening is complete

### Review automation

`/api/cron/review-requests` must be tenantized before commercial use. At audit time it contains a hardcoded Body & Soul SMS label and hardcoded Google review URL and processes completed appointments without tenant-specific review configuration. Treat it as Pro / Partial, not as an available feature.

### Audit log

Audit storage is tenant-aware through RLS, entries are immutable from the application, and export already exists. This is a legitimate current Pro differentiator rather than a placeholder roadmap feature.

## Enforcement order

When plan enforcement begins, use this order to reduce regression risk:

1. **Read-only/navigation gating first** — plan badges, upgrade states and hiding Growth/Pro navigation while preserving clear upgrade messaging.
2. **Page/server guards** — prevent direct URL access to premium pages.
3. **Mutation/action guards** — protect server actions and API routes; never rely only on UI hiding.
4. **Background jobs** — make cron/reminder/review jobs tenant- and entitlement-aware before commercial enforcement.
5. **Public booking/API behavior** — keep Starter booking stable; only gate capabilities that are explicitly premium.
6. **Regression QA across Starter, Growth, Pro and Trial** — Trial must behave as Pro entitlement without changing its stored paid plan.

## Pricing

No prices are committed in code or database yet. The working commercial discussion has considered three tiers, but final prices should be decided before Stripe Products/Prices are created.
