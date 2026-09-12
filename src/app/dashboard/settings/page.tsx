import Link from "next/link";
import { requireAdminForSettings } from "@/lib/page-guards";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import { getDictionary } from "@/lib/i18n";

function SettingsCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm transition hover:-translate-y-0.5 hover:bg-app-card-alt hover:shadow-md"
    >
      <h2 className="text-xl font-semibold text-app-text">{title}</h2>
      <p className="mt-2 text-app-muted">{description}</p>
    </Link>
  );
}

export default async function SettingsPage() {
  const permissions = await requireAdminForSettings();
  const t = getDictionary(permissions.organizationLocale).settings;

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        title={t.title}
        description={t.description}
      />

      <PageSection title={t.modules}>
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

          <SettingsCard
            href="/dashboard/settings/salon-hours"
            title={t.salonHours.title}
            description={t.salonHours.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/employees"
            title={t.employees.title}
            description={t.employees.moduleDescription}
          />

          <SettingsCard
            href="/dashboard/settings/audit-log"
            title={t.auditLogTitle}
            description={t.auditLogDescription}
          />
        </div>
      </PageSection>
    </PageShell>
  );
}
