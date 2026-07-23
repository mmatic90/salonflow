import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import SetupForms from "./setup-forms";

export default async function SetupPage() {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    redirect("/login");
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const [employeesResult, servicesResult, roomsResult] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, color, is_active")
      .eq("organization_id", organizationId)
      .order("first_name", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, duration_minutes, price, is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, name, is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),
  ]);

  const employees = employeesResult.data ?? [];
  const services = servicesResult.data ?? [];
  const rooms = roomsResult.data ?? [];

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-app-accent">Početno postavljanje</p>
              <h1 className="mt-1 text-3xl font-bold text-app-text">Osnovni podaci salona</h1>
              <p className="mt-2 text-app-muted">
                Dodaj najmanje jednog zaposlenika i jednu uslugu prije prvog termina.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg">
                Dashboard
              </Link>
              <Link href="/dashboard/appointments/new" className="rounded-xl bg-app-accent px-4 py-2 font-semibold text-white transition hover:opacity-90">
                Novi termin
              </Link>
            </div>
          </div>
        </section>

        <SetupForms />

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-app-text">Zaposlenici ({employees.length})</h2>
            <div className="mt-4 space-y-3">
              {employees.length === 0 ? (
                <p className="text-sm text-app-muted">Još nema zaposlenika.</p>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center gap-3 rounded-xl bg-app-card-alt px-4 py-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: employee.color ?? "#776B5D" }} />
                    <span className="font-medium text-app-text">
                      {[employee.first_name, employee.last_name].filter(Boolean).join(" ")}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-app-text">Usluge ({services.length})</h2>
            <div className="mt-4 space-y-3">
              {services.length === 0 ? (
                <p className="text-sm text-app-muted">Još nema usluga.</p>
              ) : (
                services.map((service) => (
                  <div key={service.id} className="rounded-xl bg-app-card-alt px-4 py-3">
                    <p className="font-medium text-app-text">{service.name}</p>
                    <p className="mt-1 text-sm text-app-muted">
                      {service.duration_minutes} min
                      {service.price != null ? ` · ${Number(service.price).toFixed(2)} EUR` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-app-text">Sobe ({rooms.length})</h2>
            <div className="mt-4 space-y-3">
              {rooms.length === 0 ? (
                <p className="text-sm text-app-muted">Još nema soba.</p>
              ) : (
                rooms.map((room) => (
                  <div key={room.id} className="rounded-xl bg-app-card-alt px-4 py-3 font-medium text-app-text">
                    {room.name}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
