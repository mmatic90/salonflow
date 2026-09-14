# Elizabeth demo runbook — SalonFlow

This is the practical presentation script for reviewing the current `feature/multi-tenant-foundation` build with Elizabeth.

The goal is not to show every setting or explain the architecture. The goal is to let a salon owner quickly understand how SalonFlow helps with the working day, clients, booking and follow-up.

## Before the meeting — 5 minutes

### 1. Pull the exact review build

```bash
git switch feature/multi-tenant-foundation
git pull origin feature/multi-tenant-foundation
```

Use the deployed review build if available. Use local `npm run dev` only as a fallback.

### 2. Prepare Demo Salon

In Supabase SQL Editor run:

```text
supabase/demo_prepare_elizabeth_review.sql
```

This is a manual demo tool, **not a migration**. It is locked to the known Demo Salon tenant and is safe to rerun before the review.

It prepares:

- Demo Salon as **Pro + Active**;
- Managed Email enabled;
- Google review automation **OFF**;
- automatic CRM follow-up **OFF**;
- removal of the temporary CRM follow-up QA clients/appointments;
- **Ema Babić** as a client-care/safety example;
- **Marina Vuković** as a deterministic CRM retention example;
- **Lara Božić** as a waiting-list example.

Do not rerun the destructive base Instagram seed just before the meeting unless a complete Demo Salon reset is intentionally required.

### 3. Verify the safe state

```sql
select
  name,
  plan_code,
  lifecycle_status,
  is_active
from public.organizations
where id = '7042e15c-1a1e-44e5-991e-bb8aa6266c08';
```

Expected: `Demo Salon / pro / active / true`.

```sql
select enabled, daily_limit, last_run_status
from public.organization_retention_automation_settings
where organization_id = '7042e15c-1a1e-44e5-991e-bb8aa6266c08';
```

Expected: `false / 5 / never`.

```sql
select enabled, google_review_url, delay_hours
from public.organization_review_settings
where organization_id = '7042e15c-1a1e-44e5-991e-bb8aa6266c08';
```

Expected: `enabled = false`. A previously configured URL may remain stored.

### 4. Open these tabs before Elizabeth arrives

1. SalonFlow dashboard, already logged in.
2. Public booking page in a separate/incognito tab.
3. Optional phone or DevTools mobile viewport for the final mobile demonstration.

Do not leave Platform Admin open during the salon-owner demo.

---

# Suggested presentation — 10–15 minutes

## 0. Opening — 30 seconds

**Open:** Dashboard.

Suggested framing:

> “Ideja je da ti na jednom mjestu budu termini, klijenti, online rezervacije i stvari koje traže pažnju, bez vođenja paralelnih bilješki i provjeravanja više alata.”

Do not begin with plans, databases, multi-tenancy, Supabase or technical architecture.

---

## 1. Dashboard — about 1 minute

Show the daily overview first.

Point out only what matters operationally:

- today/tomorrow appointments;
- pending online bookings if any;
- overdue/status items that need attention;
- shortcuts into the actual work.

Suggested line:

> “Kad se prijaviš, cilj je da odmah vidiš što danas treba napraviti, a ne da prvo tražiš informacije po aplikaciji.”

Do not spend time reading every number.

---

## 2. Calendar — about 2 minutes

**Open:** Calendar / time-grid.

The demo dataset contains four employees with distinct roles:

- **Ana Anić** — face treatments;
- **Luka Lukić** — brows/lashes;
- **Ivan Ivić** — massage/body/laser;
- **Petra Perić** — manicure/pedicure.

Use the populated calendar to show that the schedule is not a generic list. Open one realistic appointment and briefly show:

- employee;
- service;
- room;
- time;
- client;
- notes where present.

Useful services in the dataset include **Hydra Glow tretman lica**, **Oxy tretman lica**, **Lash Lift**, **Body Sculpt**, **Relax masaža 60 min** and **Spa pedikura**.

Suggested framing:

> “Kod termina SalonFlow gleda tko radi, koju uslugu osoba može raditi, koja je soba potrebna i je li vrijeme stvarno slobodno. Ne oslanja se samo na to izgleda li polje na kalendaru prazno.”

If useful, begin creating a new appointment and stop before saving. There is no need to create throwaway data merely to prove the form works.

---

## 3. Online booking — about 2 minutes

Switch to the public booking tab.

Explain that the client sees a salon-facing booking experience while the salon keeps control over acceptance.

### Recommended live version: repeat-client reuse

Use an existing seeded client so the result is meaningful:

**Sara Marić**

- email: `client001@demo-salon.test`
- phone: `+385 91 100 0001`

Choose any genuinely available service/time from the public booking flow and submit the request.

Then return to Dashboard → Online bookings and show the pending request. Accept it using the normal employee/room flow.

Key point to explain:

> “Ako se postojeća klijentica ponovno naruči online, sustav pokušava prepoznati postojeći CRM profil po sigurnim podacima, umjesto da svaki put stvara novi duplikat.”

Do not promise fuzzy matching. SalonFlow intentionally blocks ambiguous duplicate identities rather than guessing.

### Important email note

`@demo-salon.test` addresses are fictional and should not be used to prove real delivery. If Elizabeth specifically wants to see an email arrive, use a separate controlled email address you own and treat that as a new-client demonstration.

Do not try to demonstrate repeat-client matching and real email delivery with one request.

### Fallback

If a live public slot is inconvenient or the network is unreliable, show the public booking steps without submitting and move on. The product review should not depend on a live external-email/network moment.

---

## 4. Client profile — Ema Babić — about 1.5 minutes

**Open:** Clients → **Ema Babić**.

The prep script gives her deterministic care/safety data:

- sensitive skin / prior reaction to more intensive peels;
- note to check current skin condition before stronger treatments;
- preference for gentler treatments and hydrating finishing care.

Show:

- contact/profile information;
- upcoming/history section;
- care and safety area;
- notes/treatment context;
- communication preferences, briefly.

Suggested line:

> “Ovo nije zamišljeno samo kao adresar. Kad klijentica ponovno dođe, bitne informacije i povijest ostaju uz njezin profil.”

For communication preferences, keep the explanation simple:

> “Operativne poruke o terminu i marketinški follow-up nisu ista stvar. Klijent može biti normalno naručen, a da marketinške poruke nisu dopuštene.”

Do not turn this into a legal/GDPR presentation unless Elizabeth asks.

---

## 5. Waitlist — Lara Božić — about 1 minute

**Open:** Waitlist.

The prep script creates a natural waiting entry:

- **Lara Božić**
- **Hydra Glow tretman lica**
- preferred employee: **Ana Anić**
- preferred window: next 3–14 days, 09:00–16:00
- note: “Preferira raniji termin ako se oslobodi mjesto.”

Suggested framing:

> “Umjesto da se na papir zapisuje koga treba zvati ako netko otkaže, želja ostaje u sustavu. Kad se oslobodi kompatibilan termin, SalonFlow može povezati slobodno mjesto s osobom koja ga čeka.”

If an automatic opportunity is already present, open it. If not, do not manufacture one during the meeting; the waiting-list record itself is enough to explain the workflow.

---

## 6. Reports — about 1 minute

**Open:** Reports.

The rich demo seed has enough historical appointments to make the reports visually meaningful.

Show only two or three things, for example:

- activity/status trend;
- top services or employees;
- busy days / no-show overview.

Suggested line:

> “Ovo nije samo izvještaj radi izvještaja. Poanta je da iz stvarnih termina možeš vidjeti što se najviše radi, kako je raspoređen posao i gdje ima problema s otkazivanjima ili praznim terminima.”

Do not explain every chart.

---

## 7. CRM actions — Marina Vuković — about 1.5 minutes

**Open:** CRM actions & retention.

The prep script gives **Marina Vuković** two historical Relax-massage visits with Ivan and no future appointment. She should therefore appear as a current retention candidate with a natural “no future appointment” signal.

Show:

- why she is in the queue;
- profile shortcut;
- rebook shortcut;
- contacted / snooze / resolve actions;
- the manual follow-up email action.

Suggested framing:

> “Sustav ne šalje nasumično svim klijentima. Iz povijesti izdvoji ljude kod kojih ima smisla reagirati, a ti i dalje možeš odlučiti što napraviti.”

### Do not click Send during the normal demo

Marina uses the fictional seed address `client012@demo-salon.test`. The button is useful to show, but do not actually send unless you first intentionally replace the address with a controlled inbox and re-establish valid marketing consent.

If Elizabeth asks how consent works:

> “Automatski ili ručni retention email prolazi samo ako klijent ima izričito dopušten marketinški email. Odjava se poštuje i ne gasi operativne poruke o terminu.”

---

## 8. Settings and automation — about 1.5 minutes

**Open:** Settings.

First show the operational configuration, not premium features:

- employees;
- employee schedules;
- salon hours;
- services;
- rooms/equipment;
- appearance/branding.

Then briefly point out the package badges:

- Starter = everyday salon operation;
- Growth = managed email, waitlist, CRM insights/reports;
- Pro = governance and automations.

Open **Automatic CRM follow-up** only briefly. It should be **OFF**.

Explain:

> “Automatizacije nisu obavezne. Salon ih zasebno uključuje, ima dnevni limit, a prije slanja se ponovno provjerava ima li klijent dopuštenje.”

You may also briefly show Google review automation, which should be OFF during the meeting.

Do not present prices as final; pricing is not committed yet.

---

## 9. Mobile finish — about 1 minute

Finish on a phone-sized viewport or actual phone.

Best screens to show:

1. public booking;
2. calendar navigation;
3. client profile.

Suggested close:

> “Ideja je da za svakodnevne stvari ne moraš biti za računalom — ključni flowovi su napravljeni tako da se mogu normalno koristiti i na mobitelu.”

This is a stronger ending than finishing inside Settings.

---

# What not to show unless Elizabeth asks

## Platform Admin

Do not include Platform Admin in the normal salon-owner walkthrough. It is the SalonFlow operator surface for tenant plans, lifecycle and aggregate email/automation controls.

If she asks how you manage multiple salons, then show it as a separate platform capability.

## Technical architecture

Avoid Supabase tables, migrations, RLS, cron routes, service-role language, provider abstractions and implementation details unless the discussion specifically turns technical.

## Final pricing

Do not quote in-product Starter/Growth/Pro prices as finalized. The current branch defines capability boundaries, not final commercial prices.

## Deferred roadmap

Do not imply the pilot already includes:

- Stripe/self-service billing;
- automatic subscription lifecycle;
- multi-location management;
- salon-owned custom email provider/domain credentials;
- native mobile apps;
- advanced third-party integrations.

---

# If something goes wrong during the demo

## Public booking has no convenient slot

Do not troubleshoot availability for five minutes in front of Elizabeth. Show the booking flow, explain that availability is derived from salon/employee/resource rules, then return to the populated calendar.

## Email does not arrive

Do not make the meeting about Resend. Explain that email delivery is already part of the managed notification layer and continue with the salon workflow. Check provider/quota state after the meeting.

## CRM candidate is missing

Refresh once. If Marina is still missing, skip CRM automation and continue. After the meeting rerun `supabase/demo_prepare_elizabeth_review.sql` and inspect her appointments/action history.

## A visual bug appears

Note it and continue to the next workflow. The purpose of this review is also to collect real owner feedback; do not derail the full walkthrough to debug live.

---

# Questions worth asking Elizabeth after the walkthrough

Do not ask only “sviđa li ti se?”. Ask questions that reveal product priorities:

1. “Koji dio bi ti najviše koristio svaki dan?”
2. “Što ti je ovdje sporije ili kompliciranije nego način na koji sada radiš?”
3. “Koji podatak o klijentu ti danas najčešće nedostaje kad se klijent vrati?”
4. “Kako danas rješavaš otkazani termin i listu ljudi koje bi mogla nazvati?”
5. “Bi li radije da CRM follow-up prvo predloži klijenta pa ti potvrdiš slanje, ili da za odabrane slučajeve radi potpuno automatski?”
6. “Koje izvještaje stvarno pogledaš ili bi željela pogledati jednom tjedno/mjesečno?”
7. “Što bi moralo biti jednostavnije prije nego bi ovakav sustav koristila svaki dan?”

Write down wording she uses. Her terminology is useful for later UI copy and sales messaging.

---

# Immediately after the meeting

Capture feedback before changing code. Classify each point as:

- **Blocker** — prevents realistic daily use;
- **Pilot improvement** — should be fixed before a real pilot;
- **Nice to have** — valuable but not required now;
- **Roadmap** — intentionally outside current scope.

Do not merge to `main` immediately after a positive demo. First convert Elizabeth's feedback into a small agreed pilot batch, validate it, and merge only after explicit approval.
