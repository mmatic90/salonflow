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
  lockedPlan,
}: {
  href: string;
  title: string;
  description: string;
  lockedPlan?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-app-card-alt hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-xl font-semibold text-app-text">{title}</h2>
        {lockedPlan ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-app-soft bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-app-muted">
            <LockKeyhole className="h-3 w-3" /> {lockedPlan}
          </span>
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

export default async function SettingsPage() {
  const permissions = await requireAdminForSettings();
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.settings;
  const scheduleT = dictionary.schedule;
  const groups = groupLabels[permissions.organizationLocale];
  const canUseAuditLog = canUseCapability(permissions, "audit_log");
  const auditLogHref = canUseAuditLog
    ? "/dashboard/settings/audit-log"
    : buildCapabilityUpgradePath(
        "audit_log",
        "/dashboard/settings/audit-log",
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
            href={auditLogHref}
            title={t.auditLogTitle}
            description={t.auditLogDescription}
            lockedPlan={canUseAuditLog ? undefined : "Pro"}
          />
        </div>
      </PageSection>
    </PageShell>
  );
}
