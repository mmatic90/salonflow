# SalonFlow Plan Capability Matrix

This document records the audited commercial capability split for the current SalonFlow codebase and the staged enforcement status.

## Status meanings

- **Available** — implemented and suitable for tenant use in the current multi-tenant foundation.
- **Partial** — meaningful implementation exists, but it must be finished or tenant-hardened before it is enforced or advertised as fully available.
- **Planned** — commercial roadmap capability; do not market it as currently delivered.

Entitlement enforcement is now implemented for Waitlist, CRM/attendance insights, Advanced Reports, Appointment Reminders and Audit Log. Remaining Growth/Pro capabilities stay unenforced until their dedicated batch is completed.

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
| Booking notifications | Available | Tenant-aware booking accept/reject email/SMS plus basic appointment-created/updated communication. These are operational booking messages, not the premium 24h reminder capability. |
| Basic operational overview | Available | Main dashboard counts and daily operational overview. This is the Starter reporting surface. |

### Starter enforcement note

Do **not** gate core appointment availability rules, salon hours, employee schedules, room/resource conflict validation or care/safety data separately. They are part of a reliable core booking product.

Client contact data, salon notes, upcoming/history records, treatment notes, total appointment count, completed appointment count and last/next appointment stay available in Starter. Premium CRM enforcement must not make the basic client record unusable.

## Growth

Growth adds utilization, retention and management insight on top of the Starter foundation.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Waitlist | Available | **Enforced.** `/dashboard/waitlist`, waitlist mutations and database RLS require Growth/Pro or Trial. Starter keeps existing rows but cannot read or mutate them. |
| Automatic waitlist opportunities | Available | **Covered by Waitlist enforcement.** Dashboard waitlist queries/panel are skipped entirely for Starter. Event-driven persistence remains maintained internally so waitlist state is not destroyed by plan changes. |
| CRM insights | Available | **Enforced.** Client segmentation, favorite service/employee, visit cadence and CRM warning signals are calculated and returned only for Growth/Pro or Trial. Starter sees a locked CRM-insights entry point without losing the core client profile. |
| Attendance insights | Available | **Enforced with CRM insights.** Cancelled/no-show counts and history-aware rates are returned only for Growth/Pro or Trial. Completed-count and visit-history data remain basic client information. |
| Advanced reports | Available | **Enforced.** Full `/dashboard/reports` module requires Growth/Pro or Trial through a server page guard; Starter retains only the dashboard operational overview. |
| Appointment reminders | Available | **Enforced at delivery time.** The 24h reminder job resolves tenant plan/lifecycle, locale, timezone and branding before sending. Growth/Pro and Trial are eligible; Starter and suspended tenants do not receive premium reminders. Croatian mobile numbers use SMS; other supported reminder contacts use tenant-branded email. |

### Growth enforcement notes

The sidebar and main dashboard expose clear locked states rather than silently failing. Direct URLs are protected server-side where a capability has its own page. Waitlist server actions are also guarded, and the main Starter dashboard does not execute waitlist count/opportunity queries.

CRM enforcement differs from Waitlist because Starter legitimately needs the same appointment records for client history and continuity of care. Therefore the underlying appointment rows are **not** hidden by RLS. Instead, the server query layer checks the entitlement before calculating or returning segmentation, favourites, cadence, attendance rates and CRM signals.

Appointment reminders differ again because they are a background capability rather than a dashboard page. Their authoritative entitlement check happens immediately before delivery. This prevents a reminder from leaking through after a downgrade and lets already-existing future appointments become reminder-eligible immediately after an upgrade.

## Pro

Pro is the governance/automation tier. The current product has one clearly finished Pro-specific governance capability; the rest must remain explicitly roadmap/partial until completed.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Audit log and export | Available | **Enforced.** Pro/Trial management users can read the audit page and CSV export. Audit events continue to be written for all plans so historical governance data is preserved for a later upgrade. Database RLS also protects direct audit-log reads. |
| Advanced CRM workflow | Planned | Future retention action lists, follow-up workflow and CRM-driven tasks. Existing client insights belong to Growth, not this capability. |
| Automated review requests | Partial | A prototype cron exists, but currently contains single-salon assumptions including a hardcoded Body & Soul SMS label and Google review URL and is not safe to expose as a multi-tenant Pro feature yet. |
| Advanced automations | Planned | Future follow-up and operational automations beyond existing booking flows. |
| Advanced integrations | Planned | Future third-party integrations. |
| Priority support | Planned | Commercial support entitlement; operational process still to be defined. |

## Important implementation findings

### Reports

The existing `/dashboard/reports` page is already substantially more than a basic report: monthly status quality, no-show rate, online-booking conversion, activity trends, top employees/services and busiest days. Therefore the **full Reports page belongs to Growth**. Starter uses the existing dashboard operational overview as its basic reporting surface.

### CRM

The current client profile computes segments, attendance rates, favorite service/employee, average visit cadence and warning signals. These are the real **Growth CRM insights** and are now enforced at the server-query and UI layers.

The query contract separates:

- `basic_stats` — Starter-safe completed count and last completed visit;
- `crm_insights` — Growth segmentation, favorites, cadence and CRM signals;
- `attendance_insights` — Growth cancellation/no-show counts and rates.

There is not yet a distinct finished "advanced CRM" workflow, so Pro `advanced_crm` remains planned.

### Care and safety

Client allergies/sensitivities, contraindications, treatment preferences and treatment notes are implemented. They remain Starter functionality and must not be used as an upsell boundary.

### Notifications and reminders

Booking confirmation/status communication remains a Starter operational capability. The premium reminder boundary is specifically the proactive 24h reminder.

The reminder delivery job is now tenant-aware and plan-aware. It:

- resolves each appointment's organization before delivery;
- uses the organization's current plan/lifecycle, with Trial receiving Pro-equivalent access;
- skips Starter and suspended organizations;
- uses organization locale for HR/EN/IT message language;
- converts appointment wall-clock date/time using organization timezone rather than server timezone;
- passes salon name, phone, address and logo to reminder email branding;
- sends SMS to Croatian mobile numbers and email to other contacts with an email address;
- stores separate SMS/email sent/error state to avoid duplicate delivery;
- attempts to retire legacy pre-scheduled Twilio reminder SIDs so the old scheduling path cannot duplicate the new send-time flow.

Reminder delivery state is reset only when date/time/contact target changes or a previously inactive appointment becomes active again. Routine note/resource edits therefore do not create duplicate reminders.

### Review automation

`/api/cron/review-requests` must be tenantized before commercial use. At audit time it contains a hardcoded Body & Soul SMS label and hardcoded Google review URL and processes completed appointments without tenant-specific review configuration. Treat it as Pro / Partial, not as an available feature.

### Audit log

Audit storage remains tenant-aware and immutable from the application. The first enforcement batch additionally restricts reads to Pro/Trial management users at both the application and RLS layers. Inserts remain available to all authenticated tenant members so a future upgrade does not start with an empty history.

## Enforcement order

Staged enforcement remains the rule:

1. **Navigation/upgrade states** — implemented for Waitlist, Reports and Audit Log; CRM uses an in-profile locked upgrade state because the Clients module itself remains Starter.
2. **Page/server guards** — implemented for Waitlist, Reports and Audit Log/export.
3. **Mutation/data guards** — implemented for waitlist actions and waitlist/audit RLS. CRM advanced values are guarded in the server query layer because the underlying appointment history is Starter data.
4. **CRM insight enforcement** — implemented for segmentation, favourites, cadence, attendance rates and CRM signals.
5. **Background reminder enforcement** — implemented at send time for 24h appointment reminders; tenant context and current plan/lifecycle are authoritative.
6. **Background review automation** — still requires tenant-hardening before Pro enforcement.
7. **Public booking/API behavior** — keep Starter booking stable; only gate capabilities that are explicitly premium.
8. **Regression QA across Starter, Growth, Pro and Trial** — Trial must behave as Pro entitlement without changing its stored paid plan.

## Pricing

No prices are committed in code or database yet. The working commercial discussion has considered three tiers, but final prices should be decided before Stripe Products/Prices are created.
