import Link from "next/link";
import { getServiceEquipmentMappingData } from "@/features/settings/queries";
import ServiceEquipmentTable from "./service-equipment-table";
import { requireAdminForSettings } from "@/lib/page-guards";
import EmptyStateCard from "@/components/empty-state-card";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsServiceEquipmentPage() {
  const permissions = await requireAdminForSettings();
  const t = getDictionary(permissions.organizationLocale).settings;

  const { services, equipment, mappings } =
    await getServiceEquipmentMappingData();

  const activeServices = services.filter((item) => item.is_active);
  const activeEquipment = equipment.filter((item) => item.is_active);

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t.serviceEquipmentTitle}</h1>
              <p className="mt-2 text-neutral-600">{t.serviceEquipmentDescription}</p>
            </div>

            <Link
              href="/dashboard/settings"
              className="rounded-xl border border-neutral-300 px-4 py-2 font-medium"
            >
              {t.back}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md">
          {activeServices.length === 0 || activeEquipment.length === 0 ? (
            <EmptyStateCard
              title={t.mapping.unavailableTitle}
              description={t.mapping.equipmentUnavailable}
            />
          ) : (
            <ServiceEquipmentTable
              locale={permissions.organizationLocale}
              services={services}
              equipment={equipment}
              mappings={mappings}
            />
          )}
        </div>
      </div>
    </main>
  );
}
