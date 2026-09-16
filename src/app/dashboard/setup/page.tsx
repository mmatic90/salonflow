import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Bot,
  CheckCircle2,
  Circle,
  Sparkles,
  Star,
} from "lucide-react";
import { requireAdminForSettings } from "@/lib/page-guards";
import { canUseCapability } from "@/lib/permissions";
import { getGuidedSetupState } from "@/features/guided-setup/queries";
import {
  ConfirmSetupStepButton,
  GuidedSetupFooterActions,
} from "@/features/guided-setup/guided-setup-controls";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      eyebrow: "Guided salon setup",
      title: "Prepare your salon for daily use",
      intro:
        "Review the essential configuration in order. Your existing trial data stays in place, and you can leave this guide at any time and continue later.",
      progress: "Setup progress",
      reviewed: "reviewed",
      confirmed: "Reviewed",
      ready: "Ready to review",
      attention: "Needs attention",
      open: "Open settings",
      confirm: "Mark as reviewed",
      confirming: "Saving...",
      later: "Continue later",
      complete: "Salon is ready",
      working: "Saving...",
      completionHelp:
        "The final button becomes available after every required step has been reviewed and all mandatory configuration checks pass.",
      completedTitle: "Salon setup completed",
      completedBody:
        "You can reopen this guide whenever you want to review the configuration again.",
      dashboard: "Open dashboard",
      optionalTitle: "Automation options in your plan",
      optionalDescription:
        "These options do not block setup completion. Review the ones included in your plan when you are ready.",
      optionalSafety:
        "Outbound automations stay OFF until you deliberately enable and save them.",
      notifications: "Email notifications & reminders",
      reviews: "Google review requests",
      retention: "Automatic CRM follow-up",
      noOptional:
        "Your current plan has no additional automation setup to review here.",
      steps: {
        profile: {
          title: "Salon profile and appearance",
          description:
            "Confirm the salon identity, contact details, language and visual appearance before sharing the workspace with the team.",
        },
        working_hours: {
          title: "Salon working hours",
          description:
            "Review which days the salon is open and the opening and closing times.",
        },
        employees: {
          title: "Employees",
          description:
            "Add the people who can receive appointments and keep only current team members active.",
        },
        services: {
          title: "Services",
          description:
            "Define the services, duration, price and which services may be booked online.",
        },
        schedules: {
          title: "Employee schedules",
          description:
            "Set regular working hours, breaks and exceptions for every active employee.",
        },
        employee_services: {
          title: "Employee ↔ service mapping",
          description:
            "Tell SalonFlow which employee can perform each active service so availability can be calculated correctly.",
        },
        resources: {
          title: "Rooms, equipment and mappings",
          description:
            "Add only the resources your salon actually uses, then map services to rooms or equipment where needed.",
        },
        online_booking: {
          title: "Online booking",
          description:
            "Decide which services are bookable online and preview the public booking page before sharing it with clients. Online booking may intentionally remain disabled.",
        },
      },
    };
  }

  if (locale === "it") {
    return {
      eyebrow: "Configurazione guidata del salone",
      title: "Prepara il salone per l'uso quotidiano",
      intro:
        "Controlla in ordine le impostazioni essenziali. I dati già presenti dalla prova rimangono salvati e puoi uscire dalla guida in qualsiasi momento per continuare più tardi.",
      progress: "Avanzamento configurazione",
      reviewed: "controllati",
      confirmed: "Controllato",
      ready: "Pronto da controllare",
      attention: "Richiede attenzione",
      open: "Apri impostazioni",
      confirm: "Segna come controllato",
      confirming: "Salvataggio...",
      later: "Continua più tardi",
      complete: "Il salone è pronto",
      working: "Salvataggio...",
      completionHelp:
        "Il pulsante finale si attiva dopo aver controllato tutti i passaggi obbligatori e completato le impostazioni richieste.",
      completedTitle: "Configurazione del salone completata",
      completedBody:
        "Puoi riaprire questa guida in qualsiasi momento per ricontrollare le impostazioni.",
      dashboard: "Apri dashboard",
      optionalTitle: "Automazioni incluse nel tuo piano",
      optionalDescription:
        "Queste opzioni non bloccano la configurazione. Controlla quelle incluse nel tuo piano quando vuoi.",
      optionalSafety:
        "Le automazioni in uscita rimangono OFF finché non le attivi e salvi esplicitamente.",
      notifications: "Email e promemoria",
      reviews: "Richieste recensioni Google",
      retention: "Follow-up CRM automatico",
      noOptional:
        "Il piano attuale non include altre automazioni da configurare in questa sezione.",
      steps: {
        profile: {
          title: "Profilo e aspetto del salone",
          description:
            "Controlla identità, contatti, lingua e aspetto visivo del salone prima di iniziare il lavoro quotidiano.",
        },
        working_hours: {
          title: "Orari del salone",
          description:
            "Controlla i giorni di apertura e gli orari di apertura e chiusura.",
        },
        employees: {
          title: "Collaboratori",
          description:
            "Aggiungi le persone a cui possono essere assegnati appuntamenti e mantieni attivi solo i collaboratori attuali.",
        },
        services: {
          title: "Servizi",
          description:
            "Definisci servizi, durata, prezzo e quali servizi possono essere prenotati online.",
        },
        schedules: {
          title: "Orari dei collaboratori",
          description:
            "Imposta orari regolari, pause ed eccezioni per ogni collaboratore attivo.",
        },
        employee_services: {
          title: "Mappatura collaboratore ↔ servizio",
          description:
            "Indica quali servizi può eseguire ogni collaboratore per calcolare correttamente la disponibilità.",
        },
        resources: {
          title: "Stanze, attrezzature e mappature",
          description:
            "Aggiungi solo le risorse realmente usate dal salone e collegale ai servizi quando necessario.",
        },
        online_booking: {
          title: "Prenotazione online",
          description:
            "Scegli i servizi prenotabili online e controlla la pagina pubblica prima di condividerla con i clienti. La prenotazione online può anche rimanere volutamente disattivata.",
        },
      },
    };
  }

  return {
    eyebrow: "Vođeno postavljanje salona",
    title: "Pripremi salon za svakodnevni rad",
    intro:
      "Prođi redom kroz najvažnije postavke. Postojeći podaci iz triala ostaju sačuvani, a vodič možeš napustiti u bilo kojem trenutku i nastaviti kasnije.",
    progress: "Napredak postavljanja",
    reviewed: "pregledano",
    confirmed: "Pregledano",
    ready: "Spremno za pregled",
    attention: "Treba dovršiti",
    open: "Otvori postavke",
    confirm: "Označi kao pregledano",
    confirming: "Spremanje...",
    later: "Nastavi kasnije",
    complete: "Salon je spreman",
    working: "Spremanje...",
    completionHelp:
      "Završni gumb postaje dostupan kada pregledaš svaki obavezni korak i kada sve potrebne provjere postavki prođu.",
    completedTitle: "Postavljanje salona je završeno",
    completedBody:
      "Ovaj vodič možeš ponovno otvoriti u bilo kojem trenutku ako želiš provjeriti postavke.",
    dashboard: "Otvori dashboard",
    optionalTitle: "Automatizacije dostupne u tvom planu",
    optionalDescription:
      "Ove stavke ne blokiraju završetak postavljanja. Pregledaj one koje tvoj paket podržava kada ti odgovara.",
    optionalSafety:
      "Automatizacije koje šalju poruke ostaju OFF dok ih svjesno ne uključiš i spremiš.",
    notifications: "Email obavijesti i podsjetnici",
    reviews: "Zahtjevi za Google recenziju",
    retention: "Automatski CRM follow-up",
    noOptional:
      "Trenutni paket nema dodatnih automatizacija koje treba postaviti u ovom koraku.",
    steps: {
      profile: {
        title: "Profil i izgled salona",
        description:
          "Provjeri identitet, kontaktne podatke, jezik i vizualni izgled salona prije početka svakodnevnog rada.",
      },
      working_hours: {
        title: "Radno vrijeme salona",
        description:
          "Provjeri kojim danima salon radi te vrijeme otvaranja i zatvaranja.",
      },
      employees: {
        title: "Djelatnici",
        description:
          "Dodaj osobe kojima se mogu dodjeljivati termini i ostavi aktivne samo trenutne članove tima.",
      },
      services: {
        title: "Usluge",
        description:
          "Definiraj usluge, trajanje, cijenu i koje se usluge mogu rezervirati online.",
      },
      schedules: {
        title: "Rasporedi djelatnika",
        description:
          "Postavi redovno radno vrijeme, pauze i iznimke za svakog aktivnog djelatnika.",
      },
      employee_services: {
        title: "Mapiranje djelatnik ↔ usluga",
        description:
          "Odredi koji djelatnik smije izvoditi koju uslugu kako bi SalonFlow ispravno računao dostupnost.",
      },
      resources: {
        title: "Sobe, oprema i mapiranja",
        description:
          "Dodaj samo resurse koje salon stvarno koristi i poveži usluge sa sobama ili opremom gdje je potrebno.",
      },
      online_booking: {
        title: "Online rezervacije",
        description:
          "Odaberi usluge dostupne online i pregledaj javnu booking stranicu prije nego je podijeliš klijentima. Online booking može namjerno ostati isključen.",
      },
    },
  };
}

export default async function SetupPage() {
  const permissions = await requireAdminForSettings();
  const state = await getGuidedSetupState(permissions.organizationId);
  const t = copy(permissions.organizationLocale);
  const canUseNotifications = canUseCapability(
    permissions,
    "booking_notifications",
  );
  const canUseReviews = canUseCapability(permissions, "review_requests");
  const canUseRetention = canUseCapability(permissions, "automations");
  const hasOptionalAutomation =
    canUseNotifications || canUseReviews || canUseRetention;

  const details = {
    profile: `${state.organization.name} · ${permissions.organizationLocale.toUpperCase()}`,
    working_hours:
      permissions.organizationLocale === "en"
        ? `${state.counts.openDays} open days configured`
        : permissions.organizationLocale === "it"
          ? `${state.counts.openDays} giorni di apertura configurati`
          : `${state.counts.openDays} radnih dana postavljeno`,
    employees: `${state.counts.activeEmployees}`,
    services: `${state.counts.activeServices}`,
    schedules: `${state.counts.scheduledEmployees}/${state.counts.activeEmployees}`,
    employee_services: `${state.counts.employeeServiceMappings}`,
    resources:
      permissions.organizationLocale === "en"
        ? `${state.counts.rooms} rooms · ${state.counts.equipment} equipment items`
        : permissions.organizationLocale === "it"
          ? `${state.counts.rooms} stanze · ${state.counts.equipment} attrezzature`
          : `${state.counts.rooms} soba · ${state.counts.equipment} komada opreme`,
    online_booking: `${state.counts.onlineBookableServices}`,
  };

  const links = {
    profile: [
      { href: "/dashboard/settings/profile", label: t.open },
      { href: "/dashboard/settings/appearance", label: t.open },
    ],
    working_hours: [{ href: "/dashboard/settings/salon-hours", label: t.open }],
    employees: [{ href: "/dashboard/settings/employees", label: t.open }],
    services: [{ href: "/dashboard/settings/services", label: t.open }],
    schedules: [{ href: "/dashboard/schedule", label: t.open }],
    employee_services: [
      { href: "/dashboard/settings/employee-services", label: t.open },
    ],
    resources: [
      { href: "/dashboard/settings/rooms", label: t.open },
      { href: "/dashboard/settings/equipment", label: t.open },
      { href: "/dashboard/settings/service-rooms", label: t.open },
      { href: "/dashboard/settings/service-equipment", label: t.open },
    ],
    online_booking: [
      { href: "/dashboard/settings/services", label: t.open },
      {
        href: `/booking/${state.organization.slug}`,
        label:
          permissions.organizationLocale === "en"
            ? "Preview booking"
            : permissions.organizationLocale === "it"
              ? "Anteprima prenotazione"
              : "Pregledaj booking",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-sm">
          <div className="bg-gradient-to-br from-white via-white to-app-bg p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent">
              <Sparkles className="h-3.5 w-3.5" /> {t.eyebrow}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-app-text sm:text-4xl">
              {t.title}
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-app-muted">{t.intro}</p>

            <div className="mt-6 rounded-2xl border border-app-soft bg-white p-4">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-app-text">{t.progress}</span>
                <span className="font-bold text-app-accent">
                  {state.percentage}% · {state.confirmedCount}/{state.totalSteps} {t.reviewed}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-bg">
                <div
                  className="h-full rounded-full bg-app-accent transition-all"
                  style={{ width: `${state.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {state.progress?.completedAt ? (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
              <div>
                <h2 className="text-xl font-bold">{t.completedTitle}</h2>
                <p className="mt-1 text-sm leading-6">{t.completedBody}</p>
                <Link
                  href="/dashboard"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {t.dashboard} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        <div className="space-y-4">
          {state.steps.map((step, index) => {
            const text = t.steps[step.code];
            const confirmed = step.confirmed;
            const technicalReady = step.technicalReady;
            const statusLabel = confirmed
              ? t.confirmed
              : technicalReady
                ? t.ready
                : t.attention;

            return (
              <section
                key={step.code}
                className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-extrabold ${
                      confirmed
                        ? "bg-emerald-100 text-emerald-700"
                        : technicalReady
                          ? "bg-app-accent/10 text-app-accent"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {confirmed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-bold text-app-text">{text.title}</h2>
                        <p className="mt-1 max-w-2xl text-sm leading-6 text-app-muted">
                          {text.description}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          confirmed
                            ? "bg-emerald-100 text-emerald-700"
                            : technicalReady
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {confirmed ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : technicalReady ? (
                          <Circle className="h-3.5 w-3.5" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5" />
                        )}
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-4 rounded-2xl bg-app-bg px-4 py-3 text-sm font-semibold text-app-text">
                      {details[step.code]}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {links[step.code].map((link, linkIndex) => (
                        <Link
                          key={`${step.code}-${linkIndex}`}
                          href={link.href}
                          target={
                            step.code === "online_booking" && linkIndex === 1
                              ? "_blank"
                              : undefined
                          }
                          className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg"
                        >
                          {link.label} <ArrowRight className="h-4 w-4" />
                        </Link>
                      ))}

                      {!confirmed && !state.progress?.completedAt ? (
                        <ConfirmSetupStepButton
                          stepCode={step.code}
                          disabled={!technicalReady}
                          label={t.confirm}
                          pendingLabel={t.confirming}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-app-accent/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-app-accent">
              <Sparkles className="h-3.5 w-3.5" /> Optional
            </div>
            <h2 className="mt-3 text-xl font-bold text-app-text">{t.optionalTitle}</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-app-muted">
              {t.optionalDescription}
            </p>
            <p className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-900">
              {t.optionalSafety}
            </p>
          </div>

          {hasOptionalAutomation ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {canUseNotifications ? (
                <Link
                  href="/dashboard/settings/notifications"
                  className="rounded-2xl border border-app-soft bg-app-bg p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <BellRing className="h-5 w-5 text-app-accent" />
                  <p className="mt-3 font-bold text-app-text">{t.notifications}</p>
                </Link>
              ) : null}
              {canUseReviews ? (
                <Link
                  href="/dashboard/settings/reviews"
                  className="rounded-2xl border border-app-soft bg-app-bg p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <Star className="h-5 w-5 text-app-accent" />
                  <p className="mt-3 font-bold text-app-text">{t.reviews}</p>
                </Link>
              ) : null}
              {canUseRetention ? (
                <Link
                  href="/dashboard/settings/retention-automation"
                  className="rounded-2xl border border-app-soft bg-app-bg p-4 transition hover:-translate-y-0.5 hover:bg-white"
                >
                  <Bot className="h-5 w-5 text-app-accent" />
                  <p className="mt-3 font-bold text-app-text">{t.retention}</p>
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl bg-app-bg px-4 py-3 text-sm text-app-muted">
              {t.noOptional}
            </p>
          )}
        </section>

        {!state.progress?.completedAt ? (
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
            <p className="mb-4 text-sm leading-6 text-app-muted">{t.completionHelp}</p>
            <GuidedSetupFooterActions
              canComplete={state.canComplete}
              laterLabel={t.later}
              completeLabel={t.complete}
              workingLabel={t.working}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
}
