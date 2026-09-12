import Link from "next/link";
import { getEquipment } from "@/features/settings/queries";
import EquipmentTable from "./equipment-table";
import EquipmentCreateForm from "./equipment-create-form";
import { requireAdminForSettings } from "@/lib/page-guards";
import EmptyStateCard from "@/components/empty-state-card";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsEquipmentPage() {
  const permissions = await requireAdminForSettings();
  const settings = getDictionary(permissions.organizationLocale).settings;
  const t = settings.equipment;

  const equipment = await getEquipment();

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-app-text">{t.title}</h1>
              <p className="mt-2 text-app-muted">
                {t.intro}
              </p>
            </div>

            <Link
              href="/dashboard/settings"
              className="rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              {settings.back}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-app-text">{t.newTitle}</h2>
          <div className="mt-4">
            <EquipmentCreateForm locale={permissions.organizationLocale} />
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-app-text">{t.listTitle}</h2>
          <div className="mt-4">
            {equipment.length === 0 ? (
              <EmptyStateCard
                title={t.emptyTitle}
                description={t.emptyDescription}
              />
            ) : (
              <EquipmentTable locale={permissions.organizationLocale} equipment={equipment} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
