import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientById } from "@/features/clients/queries";
import { formatTime } from "@/lib/utils";
import EmptyStateCard from "@/components/empty-state-card";
import { formatAppointmentServicesLabel } from "@/features/appointments/format-appointment-services";
import {
  ArrowLeft,
  CalendarPlus,
  CalendarDays,
  Clock3,
  Mail,
  Phone,
  Sparkles,
  Star,
  UserRound,
  AlertTriangle,
} from "lucide-react";

type Params = Promise<{
  id: string;
}>;

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function segmentLabel(segment: string) {
  switch (segment) {
    case "new":
      return "Novi klijent";
    case "active":
      return "Aktivan";
    case "regular":
      return "Redovan";
    case "at_risk":
      return "Rizičan";
    case "lost":
      return "Izgubljen";
    default:
      return segment;
  }
}

function segmentClasses(segment: string) {
  switch (segment) {
    case "new":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "active":
      return "border-green-200 bg-green-50 text-green-700";
    case "regular":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "at_risk":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "lost":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-app-soft bg-app-bg text-app-text";
  }
}

function InsightCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-app-soft bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.04)] sm:p-5">
      <div className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">{label}</div>
      <div className="mt-2 truncate text-xl font-extrabold tracking-tight text-app-text">{value}</div>
    </div>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case "scheduled": return "Zakazan";
    case "confirmed": return "Potvrđen";
    case "completed": return "Odrađen";
    case "cancelled": return "Otkazan";
    case "no_show": return "Nije došao";
    default: return status;
  }
}

export default async function ClientDetailsPage({
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
  const client = await getClientById(id);

  if (!client) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-app-bg px-3 py-4 sm:px-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
        <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-app-accent text-lg font-extrabold text-white shadow-md">
                  {client.full_name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="truncate text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl">{client.full_name}</h1>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${segmentClasses(client.insights.segment)}`}>
                      {segmentLabel(client.insights.segment)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-app-muted">
                    {client.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{client.phone}</span> : null}
                    {client.email ? <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{client.email}</span> : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Link href={`/dashboard/appointments/new?clientId=${client.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <CalendarPlus className="h-4 w-4" /> Novi termin
                </Link>
                <Link href={`/dashboard/clients/${client.id}/edit`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2 font-semibold text-app-text shadow-sm transition hover:bg-app-bg">Uredi</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <InsightCard label="Ukupno termina" value={client.appointments_count} />
          <InsightCard label="Odrađeno" value={client.insights.completed_appointments} />
          <InsightCard label="Zadnji dolazak" value={formatDate(client.insights.last_completed_appointment)} />
          <InsightCard label="Sljedeći termin" value={formatDate(client.next_appointment)} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent"><Sparkles className="h-5 w-5" /></span>
              <div><p className="text-sm font-semibold text-app-muted">Mini CRM</p><h2 className="text-xl font-bold text-app-text">Profil klijenta</h2></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-app-bg p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Najčešća usluga</p><p className="mt-2 font-bold text-app-text">{client.insights.favorite_service || "Nema podataka"}</p></div>
              <div className="rounded-2xl bg-app-bg p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Preferirani terapeut</p><p className="mt-2 font-bold text-app-text">{client.insights.favorite_employee || "Nema podataka"}</p></div>
              <div className="rounded-2xl bg-app-bg p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Prosjek između dolazaka</p><p className="mt-2 font-bold text-app-text">{client.insights.average_days_between_visits !== null ? `${client.insights.average_days_between_visits} dana` : "Nema podataka"}</p></div>
              <div className="rounded-2xl bg-app-bg p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Pouzdanost</p><p className="mt-2 font-bold text-app-text">{client.insights.no_show_rate}% no-show · {client.insights.cancellation_rate}% otkazano</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-app-soft bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Bilješke</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-app-text">{client.note || "Za ovog klijenta još nema spremljenih bilješki."}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="text-xl font-bold text-app-text">CRM signali</h2></div>
            <div className="mt-5 space-y-3">
              {client.insights.alerts.length ? client.insights.alerts.map((alert, index) => (
                <div key={`${alert}-${index}`} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{alert}</div>
              )) : <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Nema upozorenja za ovog klijenta.</div>}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-sm font-semibold text-app-muted">Nadolazeće</p><h2 className="mt-1 text-xl font-bold text-app-text">Budući termini</h2></div>
            <CalendarDays className="h-5 w-5 text-app-accent" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {client.upcomingAppointments.length ? client.upcomingAppointments.map((appointment) => (
              <Link key={appointment.id} href={`/dashboard/appointments/${appointment.id}/edit`} className="rounded-2xl border border-app-soft bg-app-bg/60 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-app-text">{formatDate(appointment.appointment_date)}</p><p className="mt-1 flex items-center gap-1.5 text-sm text-app-muted"><Clock3 className="h-3.5 w-3.5" />{formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</p></div><span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-app-text">{statusLabel(appointment.status)}</span></div>
                <p className="mt-4 font-semibold text-app-text">{formatAppointmentServicesLabel(appointment.appointment_services?.slice().sort((a,b)=>a.sort_order-b.sort_order))}</p>
                <p className="mt-1 text-sm text-app-muted">{appointment.employee?.display_name || "-"} · {appointment.room?.name || "-"}</p>
              </Link>
            )) : <div className="md:col-span-2 xl:col-span-3"><EmptyStateCard title="Nema budućih termina" description="Za ovog klijenta trenutno nema nadolazećih rezervacija." /></div>}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="border-b border-app-soft bg-gradient-to-r from-white to-app-bg/70 p-5 sm:p-6">
            <p className="text-sm font-semibold text-app-muted">Evidencija</p><h2 className="mt-1 text-xl font-bold text-app-text">Povijest termina</h2>
          </div>
          {client.pastAppointments.length ? (
            <>
              <div className="grid gap-3 p-4 md:hidden">
                {client.pastAppointments.map((appointment) => (
                  <Link key={appointment.id} href={`/dashboard/appointments/${appointment.id}/edit`} className="rounded-2xl border border-app-soft p-4">
                    <div className="flex justify-between gap-3"><div><p className="font-bold text-app-text">{formatDate(appointment.appointment_date)}</p><p className="mt-1 text-sm text-app-muted">{formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</p></div><span className="h-fit rounded-full bg-app-bg px-2.5 py-1 text-xs font-semibold text-app-text">{statusLabel(appointment.status)}</span></div>
                    <p className="mt-3 font-semibold text-app-text">{formatAppointmentServicesLabel(appointment.appointment_services?.slice().sort((a,b)=>a.sort_order-b.sort_order))}</p>
                    <p className="mt-1 text-sm text-app-muted">{appointment.employee?.display_name || "-"} · {appointment.room?.name || "-"}</p>
                  </Link>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full border-collapse">
                  <thead className="bg-app-table-head"><tr className="text-left text-sm text-app-muted"><th className="px-5 py-3 font-semibold">Datum</th><th className="px-5 py-3 font-semibold">Vrijeme</th><th className="px-5 py-3 font-semibold">Usluga</th><th className="px-5 py-3 font-semibold">Zaposlenik</th><th className="px-5 py-3 font-semibold">Soba</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead>
                  <tbody>{client.pastAppointments.map((appointment) => (
                    <tr key={appointment.id} className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"><td className="px-5 py-4 font-semibold text-app-text">{formatDate(appointment.appointment_date)}</td><td className="px-5 py-4 text-app-muted">{formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</td><td className="px-5 py-4 font-medium text-app-text">{formatAppointmentServicesLabel(appointment.appointment_services?.slice().sort((a,b)=>a.sort_order-b.sort_order))}</td><td className="px-5 py-4 text-app-muted">{appointment.employee?.display_name || "-"}</td><td className="px-5 py-4 text-app-muted">{appointment.room?.name || "-"}</td><td className="px-5 py-4"><span className="rounded-full bg-app-bg px-2.5 py-1 text-xs font-semibold text-app-text">{statusLabel(appointment.status)}</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          ) : <div className="p-5"><EmptyStateCard title="Nema povijesti termina" description="Ovaj klijent još nema prošlih termina u evidenciji." /></div>}
        </section>

        <Link href="/dashboard/clients" className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"><ArrowLeft className="h-4 w-4" /> Natrag na klijente</Link>
      </div>
    </main>
  );}
