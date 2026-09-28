import Link from "next/link";
import { ArrowRight, CalendarClock, UserRound } from "lucide-react";
import { getEmployeesForSchedule } from "@/features/schedule/queries";
import { requireAdminForScheduleManagement } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

export default async function SchedulePage() {
  const permissions = await requireAdminForScheduleManagement();
  const t = getDictionary(permissions.organizationLocale).schedule;
  const employees = await getEmployeesForSchedule();

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-app-soft bg-white text-app-muted">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl">
                {t.title}
              </h1>
              <p className="mt-1 text-sm text-app-muted">{t.description}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {employees.map((employee) => (
            <Link
              key={employee.id}
              href={`/dashboard/schedule/${employee.id}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-app-soft bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-app-accent/30 hover:shadow-md"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-app-soft bg-white text-app-muted">
                  <UserRound className="h-5 w-5" />
                  <span
                    className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white"
                    style={{ backgroundColor: employee.color_hex || "#8A7D6F" }}
                  />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-bold text-app-text">
                    {employee.display_name}
                  </h2>
                  <p className="mt-1 text-sm text-app-muted">{t.editSchedule}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-app-muted transition group-hover:translate-x-1 group-hover:text-app-accent" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
