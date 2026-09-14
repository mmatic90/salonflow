# SalonFlow pilot readiness — Elizabeth review

This checklist is the release gate for showing the current `feature/multi-tenant-foundation` build to Elizabeth before any merge to `main`.

## Demo preparation and presentation files

For the actual Elizabeth review, use these two companion files after the technical readiness checks below:

- `supabase/demo_prepare_elizabeth_review.sql` — manual, rerunnable Demo Salon preparation script. It removes only known CRM QA traces, restores the safe Pro/Active state, keeps automations off and stages deterministic client/waitlist/CRM examples.
- `docs/ELIZABETH_DEMO_RUNBOOK.md` — the 10–15 minute presentation route, concrete seeded clients/services, talk track, fallbacks and post-meeting feedback questions.

The preparation SQL is **not a migration** and is intentionally locked to the known Demo Salon tenant. Never adapt or run it casually against a real salon.

## 1. Build gate

Run from a clean local checkout:

```bash
git switch feature/multi-tenant-foundation
git pull origin feature/multi-tenant-foundation
npm install
npm run lint
npm run build
```

Both lint and build must pass before the review build is deployed.

## 2. Production / preview environment

The deployed review environment must have these variables configured:

- `NEXT_PUBLIC_SITE_URL` — the actual deployed SalonFlow URL, never `localhost`. This value is used in public booking and unsubscribe links.
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `SALONFLOW_EMAIL_FROM_ADDRESS` — for production/pilot use a verified SalonFlow-owned sending domain instead of `onboarding@resend.dev`.
- `SALONFLOW_EMAIL_DEFAULT_REPLY_TO` — optional fallback; tenant Reply-To takes precedence.
- `SALONFLOW_MANAGED_EMAIL_MONTHLY_LIMIT`
- `SALONFLOW_MANAGED_EMAIL_GLOBAL_MONTHLY_LIMIT`
- `CRON_SECRET` — required by the protected Next.js cron routes.

Do not commit real values to the repository.

## 3. Scheduled jobs

Netlify currently contains three scheduled functions:

| Function | Schedule | Purpose |
| --- | --- | --- |
| `email-automations.mjs` | `0 * * * *` | Calls appointment reminder and Google review-request routes hourly. |
| `retention-automations.mjs` | `15 7 * * *` | Calls automatic CRM retention follow-up once per day. |
| `feedback-cleanup.mjs` | `0 3 * * *` | Removes old completed/rejected developer feedback and screenshots. |

Before a production pilot, verify in Netlify that the scheduled functions are detected and that their latest executions are successful.

The Next.js cron routes remain protected by `CRON_SECRET`; the secret must match the value available to the Netlify scheduled functions.

## 4. Demo Salon safe state before the meeting

Verify the tenant that will be shown to Elizabeth:

- lifecycle: `active`
- plan: `pro`
- salon is not suspended
- automatic CRM follow-up: **OFF** unless automatic sending is intentionally part of the live demonstration
- Google review automation: preferably **OFF** during the meeting unless its configured URL and test recipient are intentionally prepared
- Managed Email: active
- Reply-To: points to the intended salon/test mailbox
- no temporary retention QA clients remain
- no temporary appointments with sources such as `retention_followup_test` or `retention_automation_test` remain

A demo should never depend on a scheduled job unexpectedly firing while the product is being presented.

## 5. Critical regression path

Test these flows on desktop and at least one mobile viewport before the review.

### Calendar and appointments

1. Open day/week calendar.
2. Create a manual appointment.
3. Edit date/time.
4. Verify employee/room conflicts and unavailable periods are still blocked.
5. Cancel or complete a test appointment.

### Online booking

1. Submit a public booking request.
2. Confirm availability diagnostics are understandable.
3. Accept the request from the dashboard.
4. Verify repeat-client matching reuses the intended CRM client.
5. Reject a separate test request with a reason.

### Clients

1. Open client list and profile.
2. Verify upcoming/history data.
3. Verify care/safety data and treatment notes.
4. Verify marketing communication preference can be changed and its history is visible.
5. Confirm changing an allowed client's email resets marketing preference to `unknown`.

### Growth / Pro flows

1. Waitlist and automatic opportunity flow.
2. Full Reports page.
3. CRM action queue and manual follow-up email.
4. Google review settings.
5. Automatic CRM follow-up settings and preview.
6. Audit log.

## 6. Email smoke test

Before the review, send at least one controlled email to an address you own:

- booking confirmation or appointment notification
- manual CRM follow-up with unsubscribe link

Check:

- sender name is the salon name
- Reply-To is correct
- no `localhost` links appear
- booking links open the correct tenant booking page
- unsubscribe link works and does not expose client/profile data
- Managed Email usage increments as expected

If a provider delivery fails, the business mutation (appointment/booking) may still succeed. Check **Settings → Email & notifications** for failed delivery counts during pilot troubleshooting.

## 7. Plan presentation

Use the product in this order when explaining packaging:

- **Starter** — daily salon operations: calendar, appointments, clients, schedules, resources, online booking and care/safety data.
- **Growth** — managed client email, waitlist, CRM/attendance insights and advanced reports.
- **Pro** — audit log, CRM action workflow, review requests and automatic CRM retention follow-up.

Trial receives the effective Pro feature set.

No prices are committed in code or database yet. Do not present a final price until packaging is intentionally finalized.

## 8. Suggested Elizabeth demo route

Keep the first review focused on salon value rather than architecture:

1. **Dashboard** — today's operational overview.
2. **Calendar** — create/edit a realistic appointment.
3. **Online booking** — show what the client submits and how the salon accepts it.
4. **Client profile** — history, rebooking, notes and care/safety context.
5. **Waitlist** — show how a freed slot can become an opportunity.
6. **Reports** — explain what the salon learns from real appointment data.
7. **CRM actions** — show who may need follow-up and the manual email flow.
8. **Settings** — schedules/resources first, then briefly show Pro review/CRM automations.
9. **Mobile** — finish by opening the calendar/client flow on a phone-size viewport.

For the exact seeded clients, wording and fallback path, follow `docs/ELIZABETH_DEMO_RUNBOOK.md` rather than improvising.

Avoid opening Platform Admin during the normal salon-owner demo; it is an operator/developer surface rather than part of the salon's workflow.

## 9. Explicitly deferred from this pilot

The current pilot should not be presented as including:

- automated subscription billing / Stripe checkout and webhooks
- self-service signup and fully automated account lifecycle
- multi-location management
- salon-owned custom email provider credentials/domain setup
- native mobile apps
- advanced third-party integrations
- finalized commercial pricing

These are roadmap items and should remain separate from feedback on the core salon workflow.

## 10. Merge rule

Do not merge this branch to `main` simply because the technical checklist passes. First collect Elizabeth's feedback on the review build, decide which pilot changes are required, re-run lint/build/regression checks, and merge only after explicit approval.
