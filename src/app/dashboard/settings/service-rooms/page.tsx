import Link from "next/link";
import { getServiceRoomMappingData } from "@/features/settings/queries";
import ServiceRoomTable from "./service-room-table";
import { requireAdminForSettings } from "@/lib/page-guards";
import EmptyStateCard from "@/components/empty-state-card";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsServiceRoomsPage() {
  const permissions = await requireAdminForSettings();
  const t = getDictionary(permissions.organizationLocale).settings;

  const { services, rooms, mappings } = await getServiceRoomMappingData();

  const activeServices = services.filter((item) => item.is_active);
  const activeRooms = rooms.filter((item) => item.is_active);

  return (
    <main className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{t.serviceRoomsTitle}</h1>
              <p className="mt-2 text-neutral-600">{t.serviceRoomsDescription}</p>
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
          {activeServices.length === 0 || activeRooms.length === 0 ? (
            <EmptyStateCard
              title={t.mapping.unavailableTitle}
              description={t.mapping.roomsUnavailable}
            />
          ) : (
            <ServiceRoomTable
              locale={permissions.organizationLocale}
              services={services}
              rooms={rooms}
              mappings={mappings}
            />
          )}
        </div>
      </div>
    </main>
  );
}
