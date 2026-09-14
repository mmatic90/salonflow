# SalonFlow Plan Capability Matrix

This document records the audited commercial capability split for the current SalonFlow codebase and the staged enforcement status.

## Status meanings

- **Available** — implemented and suitable for tenant use in the current multi-tenant foundation.
- **Partial** — meaningful implementation exists, but it must be finished or tenant-hardened before it is enforced or advertised as fully available.
- **Planned** — commercial roadmap capability; do not market it as currently delivered.

Entitlement enforcement is now implemented for Managed Email notifications, Waitlist, CRM/attendance insights, Advanced Reports, Appointment Reminders, Audit Log and Automated Review Requests. Remaining Growth/Pro capabilities stay unenforced until their dedicated batch is completed.

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
| Online booking | Available | Public tenant booking page/API, availability and dashboard request handling. Starter can receive, accept and reject booking requests even though managed outbound email is a Growth capability. |
| Basic operational overview | Available | Main dashboard counts and daily operational overview. This is the Starter reporting surface. |

### Starter enforcement note

Do **not** gate core appointment availability rules, salon hours, employee schedules, room/resource conflict validation or care/safety data separately. They are part of a reliable core booking product.

Client contact data, salon notes, upcoming/history records, treatment notes, total appointment count, completed appointment count and last/next appointment stay available in Starter. Phone numbers remain normal contact data even though SalonFlow does not send SMS.

Starter does not receive SalonFlow-paid automatic client email delivery. Booking and appointment mutations still complete normally; only the outbound managed notification is unavailable. The public booking success message is intentionally channel-neutral so it does not promise an email on Starter.

## Growth

Growth adds managed client communication, utilization, retention and management insight on top of the Starter foundation.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Managed email notifications | Available | **Enforced.** Booking acceptance/rejection, manual appointment creation and schedule-change emails use the managed tenant email layer. Growth/Pro and Trial are eligible. Starter is blocked before quota reservation. Settings exposes provider state and monthly usage. |
| Waitlist | Available | **Enforced.** `/dashboard/waitlist`, waitlist mutations and database RLS require Growth/Pro or Trial. Starter keeps existing rows but cannot read or mutate them. |
| Automatic waitlist opportunities | Available | **Covered by Waitlist enforcement.** Dashboard waitlist queries/panel are skipped entirely for Starter. Event-driven persistence remains maintained internally so waitlist state is not destroyed by plan changes. |
| CRM insights | Available | **Enforced.** Client segmentation, favorite service/employee, visit cadence and CRM warning signals are calculated and returned only for Growth/Pro or Trial. Starter sees a locked CRM-insights entry point without losing the core client profile. |
| Attendance insights | Available | **Enforced with CRM insights.** Cancelled/no-show counts and history-aware rates are returned only for Growth/Pro or Trial. Completed-count and visit-history data remain basic client information. |
| Advanced reports | Available | **Enforced.** Full `/dashboard/reports` module requires Growth/Pro or Trial through a server page guard; Starter retains only the dashboard operational overview. |
| Appointment reminders | Available | **Enforced at delivery time.** The 24h email reminder job resolves tenant plan/lifecycle, locale, timezone and branding before sending. Growth/Pro and Trial are eligible; Starter and suspended tenants do not receive premium reminders. |

### Growth enforcement notes

The sidebar, Settings and main dashboard expose clear locked states rather than silently presenting unavailable premium configuration. Direct URLs are protected server-side where a capability has its own page. Waitlist server actions are also guarded, and the main Starter dashboard does not execute waitlist count/opportunity queries.

Managed email enforcement happens inside the centralized delivery layer before quota reservation or provider delivery. Therefore a Starter booking can still be accepted/rejected and a Starter appointment can still be created/edited without consuming shared email quota. The `Settings -> Email & notifications` page is Growth/Pro/Trial-only and displays managed provider status, effective Reply-To and current monthly usage.

Managed tenant email uses per-organization and global monthly safety caps. Usage stores attempted, sent and failed counts. Failed provider sends intentionally remain counted as attempts so repeated failures cannot bypass cost protection. Production sender infrastructure should use a SalonFlow-owned product domain rather than a personal/M.i.T. domain.

CRM enforcement differs from Waitlist because Starter legitimately needs the same appointment records for client history and continuity of care. Therefore the underlying appointment rows are **not** hidden by RLS. Instead, the server query layer checks the entitlement before calculating or returning segmentation, favourites, cadence, attendance rates and CRM signals.

Appointment reminders are a background capability rather than a dashboard page. Their authoritative entitlement check happens immediately before email delivery. This prevents a reminder from leaking through after a downgrade and lets already-existing future appointments become reminder-eligible immediately after an upgrade.

## Pro

Pro is the governance/automation tier. Audit Log and Automated Review Requests are currently the two clearly finished Pro-specific product capabilities; the remaining items stay roadmap/planned until their dedicated implementation is complete.

| Capability | Status | Current implementation / enforcement target |
| --- | --- | --- |
| Audit log and export | Available | **Enforced.** Pro/Trial management users can read the audit page and CSV export. Audit events continue to be written for all plans so historical governance data is preserved for a later upgrade. Database RLS also protects direct audit-log reads. |
| Automated review requests | Available | **Enforced.** Pro/Trial tenants can configure their own Google review URL, enable/disable automation and choose a 2h or 24h delay. Only `completed` appointments are eligible; historical visits from before activation are not contacted. Delivery is email-only through Managed Email, with tenant/global quota accounting and duplicate/retry protection. |
| Advanced CRM workflow | Planned | Future retention action lists, follow-up workflow and CRM-driven tasks. Existing client insights belong to Growth, not this capability. |
| Custom email provider/domain | Planned | Future Bring Your Own Provider/domain option. Must use a credential-safe secret design before enabling; plain tenant-readable API keys are not acceptable. |
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

SalonFlow communication is intentionally **email-only**. Phone numbers remain stored as contact information, but the application has no Twilio/SMS delivery path.

SalonFlow Managed Email is a **Growth** capability. The centralized managed-email layer handles entitlement, per-tenant/global quota protection, provider abstraction and tenant Reply-To resolution. Active booking acceptance/rejection emails plus manual appointment creation/schedule-change emails use `booking_notifications`. The proactive 24h email reminder uses the separate `appointment_reminders` Growth capability.

The current managed provider implementation is Resend behind an abstraction. Production should eventually send from a SalonFlow-owned product domain. A future Pro custom-provider option may allow a salon to bring its own provider/domain, but credentials must not be stored until a secure secrets/encryption design exists.

The reminder delivery job is tenant-aware and plan-aware. It:

- resolves each appointment's organization before delivery;
- uses the organization's current plan/lifecycle, with Trial receiving Pro-equivalent access;
- skips Starter and suspended organizations;
- uses organization locale for HR/EN/IT message language;
- converts appointment wall-clock date/time using organization timezone rather than server timezone;
- passes salon name, phone, address and logo to reminder email branding;
- sends only to appointments that have a client email address;
- stores email sent/error state to avoid duplicate delivery.

Reminder delivery state is reset only when date/time/email target changes or a previously inactive appointment becomes active again. Routine note/resource edits therefore do not create duplicate reminders.

### Review automation

Automated review requests are now a finished Pro/Trial tenant capability. Each salon has its own `organization_review_settings` row with an opt-in toggle, Google review URL, 2h/24h delay and activation timestamp.

The flow deliberately prevents retroactive campaigns: only appointments whose scheduled end is at or after the latest automation activation time are eligible. A request is sent only when the appointment status is `completed`, the configured delay has elapsed and a client email exists.

Delivery reuses `sendManagedTenantEmail` with the `review_requests` capability, so current plan/lifecycle and managed-email quota are checked immediately before provider delivery. Review request state is stored per appointment. An atomic database claim prevents overlapping cron executions from normally sending the same request twice, and failed deliveries are limited to three attempts with at least one hour between attempts.

The active review cron contains no Body & Soul URL or single-tenant assumptions. Platform Admin can see whether the automation is configured, its delay and activation state without access to clients, appointments or message content.

Netlify `email-automations` runs hourly and invokes both the 24h reminder route and review-request route using `CRON_SECRET`. Business logic remains inside the tenant-aware Next API routes rather than being duplicated in the scheduler.

### Audit log

Audit storage remains tenant-aware and immutable from the application. The first enforcement batch additionally restricts reads to Pro/Trial management users at both the application and RLS layers. Inserts remain available to all authenticated tenant members so a future upgrade does not start with an empty history.

## Enforcement order

Staged enforcement remains the rule:

1. **Navigation/upgrade states** — implemented for Managed Email settings, Google Review settings, Waitlist, Reports and Audit Log; CRM uses an in-profile locked upgrade state because the Clients module itself remains Starter.
2. **Page/server guards** — implemented for Managed Email settings, Google Review settings/actions, Waitlist, Reports and Audit Log/export.
3. **Mutation/data guards** — implemented for waitlist actions and waitlist/audit RLS. Review settings have tenant-scoped manager RLS plus server capability enforcement. CRM advanced values are guarded in the server query layer because the underlying appointment history is Starter data.
4. **Managed email enforcement** — implemented centrally before quota reservation/provider send for booking notifications and review requests; per-tenant/global usage safety caps are active.
5. **CRM insight enforcement** — implemented for segmentation, favourites, cadence, attendance rates and CRM signals.
6. **Background reminder enforcement** — implemented at send time for 24h email appointment reminders; tenant context and current plan/lifecycle are authoritative.
7. **Background review automation** — implemented for Pro/Trial with tenant-specific URL/configuration, hourly scheduler, activation cutoff and duplicate/retry protection.
8. **Public booking/API behavior** — Starter booking remains available; user-facing success copy does not promise managed email when the plan does not include it.
9. **Regression QA across Starter, Growth, Pro and Trial** — Trial must behave as Pro entitlement without changing its stored paid plan.

## Pricing

No prices are committed in code or database yet. The working commercial discussion has considered three tiers, but final prices and commercial email quotas should be decided before Stripe Products/Prices are created.
