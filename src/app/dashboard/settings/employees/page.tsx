import Link from "next/link";
import { requireAdminForSettings } from "@/lib/page-guards";
import { getEmployees } from "@/features/settings/queries";
import EmployeesTable from "./employees-table";
import EmployeeCreateForm from "./employee-create-form";
import EmptyStateCard from "@/components/empty-state-card";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsEmployeesPage() {
  const permissions = await requireAdminForSettings();
  const settings = getDictionary(permissions.organizationLocale).settings;
  const t = settings.employees;

  const employees = await getEmployees();

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
          <h2 className="text-xl font-semibold">{t.newTitle}</h2>
          <div className="mt-4">
            <EmployeeCreateForm locale={permissions.organizationLocale} />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md">
          <h2 className="text-xl font-semibold">{t.listTitle}</h2>
          <div className="mt-4">
            {employees.length === 0 ? (
              <EmptyStateCard
                title={t.emptyTitle}
                description={t.emptyDescription}
              />
            ) : (
              <EmployeesTable locale={permissions.organizationLocale} employees={employees} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
