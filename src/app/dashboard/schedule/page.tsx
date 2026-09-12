import Link from "next/link";
import { getEmployeesForSchedule } from "@/features/schedule/queries";
import { requireAdminForScheduleManagement } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

export default async function SchedulePage() {
  const permissions = await requireAdminForScheduleManagement();
  const t = getDictionary(permissions.organizationLocale).schedule;

  const employees = await getEmployeesForSchedule();

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-app-text">
            {t.title}
          </h1>
          <p className="mt-2 text-app-muted">
            {t.description}
          </p>
        </div>

        <div className="grid gap-4">
          {employees.map((employee) => (
            <Link
              key={employee.id}
              href={`/dashboard/schedule/${employee.id}`}
              className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm transition hover:bg-app-card-alt hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{ backgroundColor: employee.color_hex || "#999999" }}
                />
                <div>
                  <h2 className="text-lg font-semibold text-app-text">
                    {employee.display_name}
                  </h2>
                  <p className="text-sm text-app-muted">{t.editSchedule}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
