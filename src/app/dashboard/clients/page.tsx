import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientsList } from "@/features/clients/queries";
import { deleteClientAction } from "@/features/clients/actions";
import EmptyStateCard from "@/components/empty-state-card";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import SettingsDeleteButton from "@/components/settings-delete-button";
import {
  CalendarClock,
  Mail,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
} from "lucide-react";

 type SearchParams = Promise<{
  q?: string;
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

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const clients = await getClientsList(query);
  const clientsWithUpcoming = clients.filter((client) => client.next_appointment).length;
  const totalAppointments = clients.reduce((sum, client) => sum + client.appointments_count, 0);
  const averageAppointments = clients.length ? Math.round(totalAppointments / clients.length) : 0;

  return (
    <PageShell maxWidth="max-w-7xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/85 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent shadow-sm">
                <Users className="h-3.5 w-3.5" />
                Mini CRM
              </div>
              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-app-text md:text-4xl">Klijenti</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">
                Pregled kontakata, aktivnosti i povijesti klijenata na jednom mjestu.
              </p>
            </div>

            <Link
              href="/dashboard/clients/new"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-2.5 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <Plus className="h-4 w-4" />
              Novi klijent
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Aktivni klijenti</p>
          <p className="mt-2 text-2xl font-extrabold text-app-text">{clients.length}</p>
        </div>
        <div className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">S budućim terminom</p>
          <p className="mt-2 text-2xl font-extrabold text-app-text">{clientsWithUpcoming}</p>
        </div>
        <div className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Ukupno termina</p>
          <p className="mt-2 text-2xl font-extrabold text-app-text">{totalAppointments}</p>
        </div>
        <div className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-app-muted">Prosjek po klijentu</p>
          <p className="mt-2 text-2xl font-extrabold text-app-text">{averageAppointments}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-app-soft bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-5">
        <form action="/dashboard/clients" className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Pretraži ime, telefon ili email..."
              className="w-full rounded-xl border border-app-soft bg-white py-3 pl-11 pr-4 text-app-text outline-none transition placeholder:text-app-muted focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
            />
          </div>
          <button type="submit" className="rounded-xl bg-app-card-alt px-5 py-3 text-sm font-semibold text-app-text transition hover:bg-app-bg">
            Pretraži
          </button>
          {query ? (
            <Link href="/dashboard/clients" className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-app-muted transition hover:bg-app-bg hover:text-app-text">
              Očisti
            </Link>
          ) : null}
        </form>
      </section>

      {clients.length === 0 ? (
        <EmptyStateCard
          title="Nema pronađenih klijenata"
          description="Pokušaj s drugim pojmom pretrage ili dodaj novog klijenta."
          action={<Link href="/dashboard/clients/new" className="inline-flex rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white">Dodaj klijenta</Link>}
        />
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {clients.map((client) => (
              <article key={client.id} className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
                <Link href={`/dashboard/clients/${client.id}`} className="block p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 font-extrabold text-app-accent">
                        {client.full_name.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-app-text">{client.full_name}</h2>
                        <p className="mt-1 text-xs font-semibold text-app-muted">{client.appointments_count} termina</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-app-bg px-2.5 py-1 text-xs font-semibold text-app-text">
                      {client.next_appointment ? "Aktivan" : "Bez budućeg termina"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-app-muted">
                    {client.phone ? <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{client.phone}</div> : null}
                    {client.email ? <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><span className="truncate">{client.email}</span></div> : null}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-app-bg p-3">
                      <p className="text-xs text-app-muted">Zadnji termin</p>
                      <p className="mt-1 font-bold text-app-text">{formatDate(client.last_appointment)}</p>
                    </div>
                    <div className="rounded-2xl bg-app-bg p-3">
                      <p className="text-xs text-app-muted">Sljedeći termin</p>
                      <p className="mt-1 font-bold text-app-text">{formatDate(client.next_appointment)}</p>
                    </div>
                  </div>
                </Link>

                <div className="flex gap-2 border-t border-app-soft bg-app-bg/40 p-4">
                  <Link href={`/dashboard/clients/${client.id}`} className="flex-1 rounded-xl bg-app-accent px-3 py-2 text-center text-sm font-semibold text-white">Otvori</Link>
                  <Link href={`/dashboard/clients/${client.id}/edit`} className="flex-1 rounded-xl border border-app-soft bg-white px-3 py-2 text-center text-sm font-semibold text-app-text">Uredi</Link>
                  <SettingsDeleteButton label={client.full_name} onDelete={deleteClientAction.bind(null, client.id)} />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)] md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-app-table-head">
                  <tr className="text-left text-sm text-app-muted">
                    <th className="px-5 py-3 font-semibold">Klijent</th>
                    <th className="px-5 py-3 font-semibold">Kontakt</th>
                    <th className="px-5 py-3 font-semibold">Termini</th>
                    <th className="px-5 py-3 font-semibold">Zadnji termin</th>
                    <th className="px-5 py-3 font-semibold">Sljedeći termin</th>
                    <th className="px-5 py-3 font-semibold">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-t border-app-soft text-sm transition hover:bg-app-card-alt">
                      <td className="px-5 py-4">
                        <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/10 font-extrabold text-app-accent">
                            {client.full_name.split(" ").map((part) => part[0]).slice(0,2).join("").toUpperCase()}
                          </div>
                          <div><p className="font-bold text-app-text">{client.full_name}</p><p className="mt-1 text-xs text-app-muted">{client.next_appointment ? "Ima budući termin" : "Bez budućeg termina"}</p></div>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 text-app-muted">
                          <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{client.phone || "-"}</p>
                          <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span className="max-w-[220px] truncate">{client.email || "-"}</span></p>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="rounded-full bg-app-bg px-3 py-1 font-semibold text-app-text">{client.appointments_count}</span></td>
                      <td className="px-5 py-4 font-medium text-app-muted">{formatDate(client.last_appointment)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold ${client.next_appointment ? "bg-emerald-50 text-emerald-700" : "bg-app-bg text-app-muted"}`}>
                          <CalendarClock className="h-3.5 w-3.5" />{formatDate(client.next_appointment)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Link href={`/dashboard/clients/${client.id}`} className="rounded-xl border border-app-soft bg-white px-3 py-2 font-semibold text-app-text hover:bg-app-bg">Otvori</Link>
                          <Link href={`/dashboard/clients/${client.id}/edit`} className="rounded-xl border border-app-soft bg-white px-3 py-2 font-semibold text-app-text hover:bg-app-bg">Uredi</Link>
                          <SettingsDeleteButton label={client.full_name} onDelete={deleteClientAction.bind(null, client.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </PageShell>
  );
}
