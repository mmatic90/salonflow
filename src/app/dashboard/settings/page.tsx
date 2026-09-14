import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { requireAdminForSettings } from "@/lib/page-guards";
import { canUseCapability } from "@/lib/permissions";
import { buildCapabilityUpgradePath } from "@/lib/entitlements";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import { getDictionary, type AppLocale } from "@/lib/i18n";

function SettingsCard({
  href,
  title,
  description,
  locked = false,
}: {
  href: string;
  title: string;
  description: string;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-app-card-alt hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-app-text">{title}</h2>
        {locked ? (
          <LockKeyhole className="h-4 w-4 shrink-0 text-app-muted" />
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

const emailCardCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Email i obavijesti",
    description:
      "Managed email obavijesti, 24h podsjetnici, potrošnja i mjesečna kvota.",
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
      "Pro automatizacija za slanje jednog zahtjeva za Google recenziju nakon završenog termina.",
  },
  en: {
    title: "Google reviews",
    description:
      "Pro automation that sends one Google review request after an eligible completed appointment.",
  },
  it: {
    title: "Recensioni Google",
    description:
      "Automazione Pro che invia una sola richiesta di recensione Google dopo un appuntamento completato idoneo.",
  },
};

const retentionAutomationCopy: Record<
  AppLocale,
  { title: string; description: string }
> = {
  hr: {
    title: "Automatski CRM follow-up",
    description:
      "Pro dnevni retention follow-up s consent provjerom, dnevnim limitom i Managed Email zaštitama.",
  },
  en: {
    title: "Automatic CRM follow-up",
    description:
      "Pro daily retention follow-up with consent checks, a daily limit and Managed Email safeguards.",
  },
  it: {
    title: "Follow-up CRM automatico",
    description:
      "Follow-up retention giornaliero Pro con controllo consenso, limite giornaliero e protezioni Managed Email.",
  },
};

export default async function SettingsPage() {
  const permissions = await requireAdminForSettings();
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.settings;
  const scheduleT = dictionary.schedule;
  const groups = groupLabels[permissions.organizationLocale];
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
          />

          <SettingsCard
            href={reviewRequestsHref}
            title={reviewCopy.title}
            description={reviewCopy.description}
            locked={!canUseReviewRequests}
          />

          <SettingsCard
            href={retentionAutomationHref}
            title={automationCopy.title}
            description={automationCopy.description}
            locked={!canUseAutomations}
          />

          <SettingsCard
            href={auditLogHref}
            title={t.auditLogTitle}
            description={t.auditLogDescription}
            locked={!canUseAuditLog}
          />
        </div>
      </PageSection>
    </PageShell>
  );
}
