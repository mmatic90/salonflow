import Link from "next/link";
import { getSalonWorkingHours } from "@/features/settings/queries";
import SalonHoursTable from "./salon-hours-table";
import { requireAdminForSettings } from "@/lib/page-guards";
import EmptyStateCard from "@/components/empty-state-card";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsSalonHoursPage() {
  const permissions = await requireAdminForSettings();
  const settings = getDictionary(permissions.organizationLocale).settings;
  const t = settings.salonHours;

  const hours = await getSalonWorkingHours();

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t.title}</h1>
              <p className="mt-2 text-neutral-600">
                {t.intro}
              </p>
            </div>

            <Link
              href="/dashboard/settings"
              className="rounded-xl border border-neutral-300 px-4 py-2 font-medium"
            >
              {settings.back}
            </Link>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md">
          {hours.length === 0 ? (
            <EmptyStateCard
              title={t.emptyTitle}
              description={t.emptyDescription}
            />
          ) : (
            <SalonHoursTable locale={permissions.organizationLocale} hours={hours} />
          )}
        </div>
      </div>
    </main>
  );
}
