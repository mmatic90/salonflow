import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getAppointmentById,
  getAppointmentFormData,
} from "@/features/appointments/queries";
import MultiTenantEditAppointmentForm from "./multi-tenant-edit-form";
import { getClientOptions } from "@/features/clients/queries";

type Params = Promise<{
  id: string;
}>;

export default async function EditAppointmentPage({
  params,
}: {
  params: Params;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { id } = await params;
  const appointment = await getAppointmentById(id);

  if (!appointment) {
    notFound();
  }

  const { services, employees, rooms } = await getAppointmentFormData();
  const clients = await getClientOptions();

  return (
    <main className="min-h-screen bg-app-bg p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-app-text">Uredi termin</h1>
              <p className="mt-2 text-app-muted">
                Uredi postojeći termin i njegove podatke.
              </p>
            </div>

            <Link
              href={`/dashboard/appointments?date=${appointment.appointment_date}`}
              className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-medium text-app-text transition hover:bg-app-bg"
            >
              Natrag na termine
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <MultiTenantEditAppointmentForm
            appointment={appointment}
            services={services}
            employees={employees}
            rooms={rooms}
            clients={clients}
          />
        </div>
      </div>
    </main>
  );
}
