import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { requireAdminForSettings } from "@/lib/page-guards";
import { canUseCapability } from "@/lib/permissions";
import { buildCapabilityUpgradePath } from "@/lib/entitlements";
import { getGuidedSetupDemoResetAvailability } from "@/features/guided-setup/queries";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import { getDictionary, type AppLocale } from "@/lib/i18n";

function SettingsCard({
  href,
  title,
  description,
  locked = false,
  planLabel,
}: {
  href: string;
  title: string;
  description: string;
  locked?: boolean;
  planLabel?: "Growth" | "Pro";
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-app-card-alt hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-app-text">{title}</h2>
        {planLabel || locked ? (
          <div className="flex shrink-0 items-center gap-2">
            {planLabel ? (
              <span className="rounded-full border border-app-soft bg-app-bg px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-app-muted">
                {planLabel}
              </span>
            ) : null}
            {locked ? (
              <LockKeyhole className="h-4 w-4 shrink-0 text-app-muted" />
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-app-muted">{description}</p>
    </Link>
  );
}

const groupLabels: Record<
  AppLocale,
  { essentials: string; resources: string; advanced: string }
> = {
  hr: {
    essentials: "Osnovne postavke salona",
    resources: "Resursi i pravila rezervacije",
    advanced: "Napredno",
  },
  en: {
    essentials: "Salon essentials",
    resources: "Resources and booking rules",
    advanced: "Advanced",
  },
  it: {
    essentials: "Impostazioni principali del salone",
    resources: "Risorse e regole di prenotazione",
    advanced: "Avanzate",
  },
};

const profileCardCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Profil salona",
    description:
      "Naziv, email, telefon i adresa salona koji se koriste kroz aplikaciju i javni booking.",
  },
  en: {
    title: "Salon profile",
    description:
      "Salon name, email, phone and address used across the app and public booking.",
  },
  it: {
    title: "Profilo del salone",
    description:
      "Nome, email, telefono e indirizzo usati nell'app e nella prenotazione pubblica.",
  },
};

const guidedSetupCardCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Vođeno postavljanje salona",
    description:
      "Prođi korak po korak kroz djelatnike, usluge, rasporede, mapiranja, resurse i online booking.",
  },
  en: {
    title: "Guided salon setup",
    description:
      "Review employees, services, schedules, mappings, resources and online booking step by step.",
  },
  it: {
    title: "Configurazione guidata del salone",
    description:
      "Controlla passo per passo collaboratori, servizi, orari, mappature, risorse e prenotazione online.",
  },
};

const freshStartCardCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Postavi salon ispočetka",
    description:
      "Jednokratno ukloni trial demo podatke i pripremi plaćeni salon s pravim djelatnicima, uslugama i radnim vremenom.",
  },
  en: {
    title: "Start with a clean salon",
    description:
      "Remove seeded trial data once and configure the paid salon with real employees, services and working hours.",
  },
  it: {
    title: "Configura il salone da zero",
    description:
      "Rimuovi una sola volta i dati demo della prova e configura il salone a pagamento con collaboratori, servizi e orari reali.",
  },
};

const emailCardCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Email i obavijesti",
    description:
      "Upravljane email obavijesti, 24-satni podsjetnici, potrošnja i mjesečna kvota.",
  },
  en: {
    title: "Email & notifications",
    description:
      "Managed email notifications, 24h reminders, usage and monthly quota.",
  },
  it: {
    title: "Email e notifiche",
    description:
      "Email gestite, promemoria 24h, utilizzo e quota mensile.",
  },
};

const reviewCardCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Google recenzije",
    description:
      "Automatski pošalji jedan zahtjev za Google recenziju nakon odgovarajućeg završenog termina.",
  },
  en: {
    title: "Google reviews",
    description:
      "Automatically send one Google review request after an eligible completed appointment.",
  },
  it: {
    title: "Recensioni Google",
    description:
      "Invia automaticamente una sola richiesta di recensione Google dopo un appuntamento completato idoneo.",
  },
};

const retentionAutomationCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Automatski CRM follow-up",
    description:
      "Dnevni retention follow-up uz provjeru pristanka, dnevni limit i zaštite upravljanog emaila.",
  },
  en: {
    title: "Automatic CRM follow-up",
    description:
      "Daily retention follow-up with consent checks, a daily limit and managed-email safeguards.",
  },
  it: {
    title: "Follow-up CRM automatico",
    description:
      "Follow-up retention giornaliero con controllo del consenso, limite giornaliero e protezioni dell'email gestita.",
  },
};

export default async function SettingsPage() {
  const permissions = await requireAdminForSettings();
  const canFreshStart = await getGuidedSetupDemoResetAvailability(
    permissions.organizationId,
  );
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.settings;
  const scheduleT = dictionary.schedule;
  const groups = groupLabels[permissions.organizationLocale];
  const profileCopy = profileCardCopy[permissions.organizationLocale];
  const guidedSetupCopy = guidedSetupCardCopy[permissions.organizationLocale];
  const freshStartCopy = freshStartCardCopy[permissions.organizationLocale];
  const emailCopy = emailCardCopy[permissions.organizationLocale];
  const reviewCopy = reviewCardCopy[permissions.organizationLocale];
  const automationCopy = retentionAutomationCopy[permissions.organizationLocale];
  const canUseAuditLog = canUseCapability(permissions, "audit_log");
  const canUseBookingNotifications = canUseCapability(
    permissions,
    "booking_notifications",
  );
  const canUseReviewRequests = canUseCapability(permissions, "review_requests");
  const canUseAutomations = canUseCapability(permissions, "automations");
  const auditLogHref = canUseAuditLog
    ? "/dashboard/settings/audit-log"
    : buildCapabilityUpgradePath(
        "audit_log",
        "/dashboard/settings/audit-log",
      );
  const emailNotificationsHref = canUseBookingNotifications
    ? "/dashboard/settings/notifications"
    : buildCapabilityUpgradePath(
        "booking_notifications",
        "/dashboard/settings/notifications",
      );
  const reviewRequestsHref = canUseReviewRequests
    ? "/dashboard/settings/reviews"
    : buildCapabilityUpgradePath(
        "review_requests",
        "/dashboard/settings/reviews",
      );
  const retentionAutomationHref = canUseAutomations
    ? "/dashboard/settings/retention-automation"
    : buildCapabilityUpgradePath(
        "automations",
        "/dashboard/settings/retention-automation",
      );

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader title={t.title} description={t.description} />

      <PageSection title={groups.essentials}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SettingsCard
            href="/dashboard/settings/profile"
            title={profileCopy.title}
            description={profileCopy.description}
          />

          <SettingsCard
            href="/dashboard/settings/appearance"
            title={t.appearance.title}
            description={t.appearance.description}
          />

          <SettingsCard
            href="/dashboard/settings/services"
            title={t.services.title}
            description={t.services.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/employees"
            title={t.employees.title}
            description={t.employees.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/salon-hours"
            title={t.salonHours.title}
            description={t.salonHours.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/schedule"
            title={scheduleT.title}
            description={scheduleT.description}
          />

          <SettingsCard
            href="/dashboard/setup"
            title={guidedSetupCopy.title}
            description={guidedSetupCopy.description}
          />

          {canFreshStart ? (
            <SettingsCard
              href="/dashboard/settings/fresh-start"
              title={freshStartCopy.title}
              description={freshStartCopy.description}
            />
          ) : null}
        </div>
      </PageSection>

      <PageSection title={groups.resources}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SettingsCard
            href="/dashboard/settings/rooms"
            title={t.rooms.title}
            description={t.rooms.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/equipment"
            title={t.equipment.title}
            description={t.equipment.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/service-rooms"
            title={t.serviceRoomsTitle}
            description={t.serviceRoomsDescription}
          />

          <SettingsCard
            href="/dashboard/settings/employee-services"
            title={t.employeeServices.title}
            description={t.employeeServices.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/service-equipment"
            title={t.serviceEquipmentTitle}
            description={t.serviceEquipmentDescription}
          />
        </div>
      </PageSection>

      <PageSection title={groups.advanced}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <SettingsCard
            href={emailNotificationsHref}
            title={emailCopy.title}
            description={emailCopy.description}
            locked={!canUseBookingNotifications}
            planLabel="Growth"
          />

          <SettingsCard
            href={reviewRequestsHref}
            title={reviewCopy.title}
            description={reviewCopy.description}
            locked={!canUseReviewRequests}
            planLabel="Pro"
          />

          <SettingsCard
            href={retentionAutomationHref}
            title={automationCopy.title}
            description={automationCopy.description}
            locked={!canUseAutomations}
            planLabel="Pro"
          />

          <SettingsCard
            href={auditLogHref}
            title={t.auditLogTitle}
            description={t.auditLogDescription}
            locked={!canUseAuditLog}
            planLabel="Pro"
          />
        </div>
      </PageSection>
    </PageShell>
  );
}
