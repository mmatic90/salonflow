import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Clock3 } from "lucide-react";
import { getEmployeeSchedulePageData } from "@/features/schedule/queries";
import DefaultScheduleForm from "./default-schedule-form";
import DefaultScheduleRangeForm from "./default-schedule-range-form";
import OverrideForm from "./override-form";
import OverrideList from "./override-list";
import { requireAdminForScheduleManagement } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

export default async function EmployeeSchedulePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const permissions = await requireAdminForScheduleManagement();
  const t = getDictionary(permissions.organizationLocale).schedule;
  const { employeeId } = await params;
  const data = await getEmployeeSchedulePageData(employeeId);

  if (!data) notFound();

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-app-soft bg-white text-app-muted">
                <CalendarClock className="h-5 w-5" />
                <span
                  className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white"
                  style={{ backgroundColor: data.employee.color_hex || "#8A7D6F" }}
                />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl">
                  {data.employee.display_name}
                </h1>
                <p className="mt-1 text-sm text-app-muted">{t.description}</p>
              </div>
            </div>

            <Link
              href="/dashboard/schedule"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg"
            >
              <ArrowLeft className="h-4 w-4" /> {t.backToEmployees}
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-xl font-bold text-app-text sm:text-2xl">{t.next5Days}</h2>
          <p className="mt-1 text-sm text-app-muted">{t.next5DaysDescription}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.upcomingSchedule.map((item) => {
              const badgeClasses = item.is_override
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : item.is_working
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-app-soft bg-app-card-alt text-app-muted";

              return (
                <article
                  key={item.date}
                  className="rounded-2xl border border-app-soft bg-white p-4"
                >
                  <p className="text-sm font-semibold capitalize text-app-text">
                    {item.day_label}
                  </p>
                  <p className="mt-1 text-xs text-app-muted">{item.date}</p>

                  <span
                    className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClasses}`}
                  >
                    {item.status_label}
                  </span>

                  <div className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-app-text">
                    <Clock3 className="h-4 w-4 text-app-muted" />
                    {item.is_working && item.start_time && item.end_time
                      ? `${item.start_time.slice(0, 5)} – ${item.end_time.slice(0, 5)}`
                      : "—"}
                  </div>

                  {item.reason_label ? (
                    <p className="mt-2 text-xs leading-5 text-app-muted">
                      {item.reason_label}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-app-text">{t.defaultSchedule}</h2>
            <p className="mt-1 text-sm text-app-muted">{t.defaultScheduleDescription}</p>
            <div className="mt-5">
              <DefaultScheduleForm
                locale={permissions.organizationLocale}
                employeeId={data.employee.id}
                defaultSchedule={data.defaultSchedule}
                salonHours={data.salonHours}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-app-text">{t.quickRange}</h2>
            <p className="mt-1 text-sm text-app-muted">{t.quickRangeDescription}</p>
            <div className="mt-5">
              <DefaultScheduleRangeForm
                locale={permissions.organizationLocale}
                employeeId={data.employee.id}
                defaultSchedule={data.defaultSchedule}
                salonHours={data.salonHours}
              />
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-app-text">{t.addOverride}</h2>
            <p className="mt-1 text-sm text-app-muted">{t.addOverrideDescription}</p>
            <div className="mt-5">
              <OverrideForm
                locale={permissions.organizationLocale}
                employeeId={data.employee.id}
                salonHours={data.salonHours}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-app-text">{t.existingOverrides}</h2>
            <p className="mt-1 text-sm text-app-muted">{t.existingOverridesDescription}</p>
            <div className="mt-5">
              <OverrideList
                locale={permissions.organizationLocale}
                employeeId={data.employee.id}
                overrides={data.overrides}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
