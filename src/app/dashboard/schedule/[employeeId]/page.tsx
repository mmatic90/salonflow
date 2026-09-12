import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmployeeSchedulePageData } from "@/features/schedule/queries";
import DefaultScheduleForm from "./default-schedule-form";
import DefaultScheduleRangeForm from "./default-schedule-range-form";
import OverrideForm from "./override-form";
import OverrideList from "./override-list";
import { requireAdminForScheduleManagement } from "@/lib/page-guards";

export default async function EmployeeSchedulePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireAdminForScheduleManagement();

  const { employeeId } = await params;
  const data = await getEmployeeSchedulePageData(employeeId);

  if (!data) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-4 w-4 rounded-full"
                  style={{
                    backgroundColor: data.employee.color_hex || "#999999",
                  }}
                />
                <h1 className="text-3xl font-bold text-app-text">
                  {data.employee.display_name}
                </h1>
              </div>
              <p className="mt-2 text-app-muted">
                Upravljanje default rasporedom i overrideovima.
              </p>
            </div>

            <Link
              href="/dashboard/schedule"
              className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              Natrag na zaposlenike
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-app-text">
            Radno vrijeme za sljedećih 5 dana
          </h2>
          <p className="mt-2 text-sm text-app-muted">
            Prikaz uključuje default raspored i sve overrideove.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {data.upcomingSchedule.map((item) => {
              const cardClasses = item.is_override
                ? "border-[#cbbca9] bg-[#efe6da]"
                : item.is_working
                  ? "border-[#b0a695] bg-[#e7dfd4]"
                  : "border-[#d8cec0] bg-[#f3eeea]";

              const badgeClasses = item.is_override
                ? "bg-[#d8c8b4] text-app-text"
                : item.is_working
                  ? "bg-[#b0a695] text-white"
                  : "bg-[#5A5753] text-white";

              return (
                <div
                  key={item.date}
                  className={`rounded-2xl border p-4 ${cardClasses}`}
                >
                  <div className="text-sm capitalize text-app-muted">
                    {item.day_label}
                  </div>
                  <div className="mt-1 font-medium text-app-text">
                    {item.date}
                  </div>

                  <div className="mt-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${badgeClasses}`}
                    >
                      {item.status_label}
                    </span>
                  </div>

                  <div className="mt-3 text-sm text-app-text">
                    {item.is_working && item.start_time && item.end_time
                      ? `${item.start_time.slice(0, 5)} - ${item.end_time.slice(0, 5)}`
                      : "-"}
                  </div>

                  {item.reason_label ? (
                    <div className="mt-2 text-xs text-app-muted">
                      {item.reason_label}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-app-text">
              Default raspored po danima
            </h2>
            <p className="mt-2 text-sm text-app-muted">
              Ovaj raspored vrijedi dok ne postoji override za određeni datum.
            </p>

            <div className="mt-6">
              <DefaultScheduleForm
                employeeId={data.employee.id}
                defaultSchedule={data.defaultSchedule}
                salonHours={data.salonHours}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-app-text">
              Brza primjena na raspon dana
            </h2>
            <p className="mt-2 text-sm text-app-muted">
              Primijeni isto radno vrijeme na više dana u tjednu odjednom.
            </p>

            <div className="mt-6">
              <DefaultScheduleRangeForm
                employeeId={data.employee.id}
                defaultSchedule={data.defaultSchedule}
                salonHours={data.salonHours}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-app-text">
              Dodaj override
            </h2>
            <p className="mt-2 text-sm text-app-muted">
              Koristi za promjenu smjene, slobodan dan, godišnji ili bolovanje.
            </p>

            <div className="mt-6">
              <OverrideForm
                employeeId={data.employee.id}
                salonHours={data.salonHours}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-app-text">
              Postojeći overrideovi
            </h2>
            <p className="mt-2 text-sm text-app-muted">
              Pregled i brisanje overrideova za ovog zaposlenika.
            </p>

            <div className="mt-6">
              <OverrideList
                employeeId={data.employee.id}
                overrides={data.overrides}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
