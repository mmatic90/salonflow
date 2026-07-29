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

  return (
    <PageShell maxWidth="max-w-7xl">
      <PageHeader
        title="Klijenti"
        description="Pregled klijenata i njihove povijesti termina."
        actions={
          <Link
            href="/dashboard/clients/new"
            className="inline-flex w-full justify-center rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 sm:w-auto"
          >
            Novi klijent
          </Link>
        }
      />

      <PageSection>
        <form action="/dashboard/clients" className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Pretraži po imenu, telefonu ili emailu..."
            className="min-w-0 flex-1 rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition placeholder:text-app-muted focus:border-app-accent focus:ring-2 focus:ring-app-accent/10"
          />
          <button
            type="submit"
            className="rounded-xl border border-app-soft bg-app-card-alt px-5 py-3 text-sm font-semibold text-app-text transition hover:bg-app-bg"
          >
            Pretraži
          </button>
          {query ? (
            <Link
              href="/dashboard/clients"
              className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-app-muted transition hover:bg-app-bg hover:text-app-text"
            >
              Očisti
            </Link>
          ) : null}
        </form>
      </PageSection>

      {clients.length === 0 ? (
        <EmptyStateCard
          title="Nema pronađenih klijenata"
          description="Pokušaj s drugim pojmom pretrage ili dodaj novog klijenta."
          action={
            <Link
              href="/dashboard/clients/new"
              className="inline-flex rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
            >
              Dodaj klijenta
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {clients.map((client) => (
              <article
                key={client.id}
                className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-app-text">
                      {client.full_name}
                    </h2>
                    <p className="mt-1 break-all text-sm text-app-muted">
                      {client.phone || client.email || "Nema kontaktnih podataka"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-app-card-alt px-3 py-1 text-xs font-semibold text-app-text">
                    {client.appointments_count} termina
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-app-card-alt p-3">
                    <dt className="text-app-muted">Zadnji termin</dt>
                    <dd className="mt-1 font-semibold text-app-text">
                      {formatDate(client.last_appointment)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-app-card-alt p-3">
                    <dt className="text-app-muted">Sljedeći termin</dt>
                    <dd className="mt-1 font-semibold text-app-text">
                      {formatDate(client.next_appointment)}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/clients/${client.id}`}
                    className="flex-1 rounded-xl bg-app-accent px-3 py-2 text-center text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    Otvori
                  </Link>
                  <Link
                    href={`/dashboard/clients/${client.id}/edit`}
                    className="flex-1 rounded-xl border border-app-soft bg-white px-3 py-2 text-center text-sm font-semibold text-app-text transition hover:bg-app-bg"
                  >
                    Uredi
                  </Link>
                  <SettingsDeleteButton
                    label={client.full_name}
                    onDelete={deleteClientAction.bind(null, client.id)}
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-app-soft bg-app-card shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-app-table-head">
                  <tr className="text-left text-sm text-app-muted">
                    <th className="px-4 py-3 font-semibold">Klijent</th>
                    <th className="px-4 py-3 font-semibold">Telefon</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Broj termina</th>
                    <th className="px-4 py-3 font-semibold">Zadnji termin</th>
                    <th className="px-4 py-3 font-semibold">Sljedeći termin</th>
                    <th className="px-4 py-3 font-semibold">Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr
                      key={client.id}
                      className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
                    >
                      <td className="px-4 py-4 font-medium text-app-text">
                        {client.full_name}
                      </td>
                      <td className="px-4 py-4 text-app-muted">
                        {client.phone || "-"}
                      </td>
                      <td className="px-4 py-4 text-app-muted">
                        {client.email || "-"}
                      </td>
                      <td className="px-4 py-4 text-app-text">
                        {client.appointments_count}
                      </td>
                      <td className="px-4 py-4 text-app-muted">
                        {formatDate(client.last_appointment)}
                      </td>
                      <td className="px-4 py-4 text-app-muted">
                        {formatDate(client.next_appointment)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
                          >
                            Otvori
                          </Link>
                          <Link
                            href={`/dashboard/clients/${client.id}/edit`}
                            className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
                          >
                            Uredi
                          </Link>
                          <SettingsDeleteButton
                            label={client.full_name}
                            onDelete={deleteClientAction.bind(null, client.id)}
                          />
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
