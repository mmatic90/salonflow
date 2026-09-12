import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  Clock3,
  ListPlus,
  Pencil,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { requireDashboardUser } from "@/lib/page-guards";
import { getTodayLocalDate } from "@/lib/utils";
import {
  getWaitlistPageData,
  type WaitlistEntry,
  type WaitlistOption,
} from "@/features/waitlist/queries";
import {
  cancelWaitlistEntryAction,
  createWaitlistEntryAction,
  updateWaitlistEntryAction,
} from "@/features/waitlist/actions";
import WaitlistMatchFinder from "@/features/waitlist/waitlist-match-finder";
import type { AppLocale } from "@/lib/i18n";

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10";

function ui(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Waitlist",
      description: "Keep track of clients who want an earlier or currently unavailable slot.",
      add: "Add to waitlist",
      addHelp: "Choose a client and service. Date, time and employee preferences are optional.",
      client: "Client",
      service: "Service",
      employee: "Preferred employee",
      anyEmployee: "Any employee",
      dateFrom: "From date",
      dateTo: "To date",
      timeFrom: "From time",
      timeTo: "To time",
      notes: "Note",
      save: "Add to waitlist",
      active: "Waiting",
      activeHelp: "Clients currently waiting for a suitable appointment.",
      empty: "No clients are currently waiting.",
      book: "Book appointment",
      edit: "Edit",
      remove: "Remove from waitlist",
      preferences: "Preferences",
      anyDate: "Any date",
      anyTime: "Any time",
      history: "History",
      historyHelp: "Booked and cancelled waitlist entries.",
      booked: "Booked",
      cancelled: "Cancelled",
      openAppointment: "Open appointment",
      back: "Back to dashboard",
      newClient: "New client",
      created: "Added",
      noNotes: "No additional note",
      update: "Save changes",
    };
  }

  if (locale === "it") {
    return {
      title: "Lista d'attesa",
      description: "Tieni traccia dei clienti che desiderano un orario anticipato o al momento non disponibile.",
      add: "Aggiungi alla lista d'attesa",
      addHelp: "Scegli cliente e servizio. Data, orario e operatore preferito sono facoltativi.",
      client: "Cliente",
      service: "Servizio",
      employee: "Operatore preferito",
      anyEmployee: "Qualsiasi operatore",
      dateFrom: "Data dal",
      dateTo: "Data al",
      timeFrom: "Ora dalle",
      timeTo: "Ora alle",
      notes: "Nota",
      save: "Aggiungi alla lista",
      active: "In attesa",
      activeHelp: "Clienti che stanno aspettando un appuntamento adatto.",
      empty: "Nessun cliente è attualmente in attesa.",
      book: "Prenota appuntamento",
      edit: "Modifica",
      remove: "Rimuovi dalla lista",
      preferences: "Preferenze",
      anyDate: "Qualsiasi data",
      anyTime: "Qualsiasi orario",
      history: "Cronologia",
      historyHelp: "Richieste prenotate o annullate.",
      booked: "Prenotato",
      cancelled: "Annullato",
      openAppointment: "Apri appuntamento",
      back: "Torna alla dashboard",
      newClient: "Nuovo cliente",
      created: "Aggiunto",
      noNotes: "Nessuna nota aggiuntiva",
      update: "Salva modifiche",
    };
  }

  return {
    title: "Lista čekanja",
    description: "Prati klijente koji žele raniji ili trenutno nedostupan termin.",
    add: "Dodaj na listu čekanja",
    addHelp: "Odaberi klijenta i uslugu. Datum, vrijeme i željeni zaposlenik nisu obavezni.",
    client: "Klijent",
    service: "Usluga",
    employee: "Željeni zaposlenik",
    anyEmployee: "Bilo koji zaposlenik",
    dateFrom: "Datum od",
    dateTo: "Datum do",
    timeFrom: "Vrijeme od",
    timeTo: "Vrijeme do",
    notes: "Napomena",
    save: "Dodaj na listu",
    active: "Na čekanju",
    activeHelp: "Klijenti koji trenutno čekaju odgovarajući termin.",
    empty: "Trenutno nema klijenata na listi čekanja.",
    book: "Rezerviraj termin",
    edit: "Uredi",
    remove: "Ukloni s liste",
    preferences: "Preferencije",
    anyDate: "Bilo koji datum",
    anyTime: "Bilo koje vrijeme",
    history: "Povijest",
    historyHelp: "Rezervirani i otkazani zapisi s liste čekanja.",
    booked: "Rezervirano",
    cancelled: "Otkazano",
    openAppointment: "Otvori termin",
    back: "Natrag na dashboard",
    newClient: "Novi klijent",
    created: "Dodano",
    noNotes: "Bez dodatne napomene",
    update: "Spremi promjene",
  };
}

function localeCode(locale: AppLocale) {
  return locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(localeCode(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatCreated(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(localeCode(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function time(value: string | null) {
  return value ? value.slice(0, 5) : null;
}

function buildBookingHref(entry: WaitlistEntry, today: string) {
  const params = new URLSearchParams({
    clientId: entry.client_id,
    serviceId: entry.service_id,
    waitlistId: entry.id,
  });

  const preferredDate =
    entry.preferred_date_from && entry.preferred_date_from >= today
      ? entry.preferred_date_from
      : today;
  params.set("date", preferredDate);

  return `/dashboard/appointments/new?${params.toString()}`;
}

function WaitlistFields({
  entry,
  clients,
  services,
  employees,
  locale,
}: {
  entry?: WaitlistEntry;
  clients: WaitlistOption[];
  services: WaitlistOption[];
  employees: WaitlistOption[];
  locale: AppLocale;
}) {
  const t = ui(locale);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.client}</span>
          <select
            className={fieldClass}
            name="client_id"
            defaultValue={entry?.client_id ?? ""}
            required
          >
            <option value="" disabled>
              {t.client}
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.service}</span>
          <select
            className={fieldClass}
            name="service_id"
            defaultValue={entry?.service_id ?? ""}
            required
          >
            <option value="" disabled>
              {t.service}
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-app-text">
        <span>{t.employee}</span>
        <select
          className={fieldClass}
          name="preferred_employee_id"
          defaultValue={entry?.preferred_employee_id ?? ""}
        >
          <option value="">{t.anyEmployee}</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.dateFrom}</span>
          <input
            className={fieldClass}
            type="date"
            name="preferred_date_from"
            defaultValue={entry?.preferred_date_from ?? ""}
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.dateTo}</span>
          <input
            className={fieldClass}
            type="date"
            name="preferred_date_to"
            defaultValue={entry?.preferred_date_to ?? ""}
          />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.timeFrom}</span>
          <input
            className={fieldClass}
            type="time"
            name="preferred_time_from"
            defaultValue={time(entry?.preferred_time_from ?? null) ?? ""}
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.timeTo}</span>
          <input
            className={fieldClass}
            type="time"
            name="preferred_time_to"
            defaultValue={time(entry?.preferred_time_to ?? null) ?? ""}
          />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-app-text">
        <span>{t.notes}</span>
        <textarea
          className={fieldClass}
          name="notes"
          rows={3}
          defaultValue={entry?.notes ?? ""}
        />
      </label>
    </div>
  );
}

export default async function WaitlistPage() {
  const permissions = await requireDashboardUser();
  const locale = permissions.organizationLocale;
  const t = ui(locale);
  const today = getTodayLocalDate();
  const { entries, clients, services, employees } = await getWaitlistPageData(
    permissions.organizationId,
  );
  const waiting = entries.filter((entry) => entry.status === "waiting");
  const history = entries.filter((entry) => entry.status !== "waiting");

  return (
    <main className="min-h-screen bg-app-bg px-3 py-4 sm:px-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-5 md:space-y-6">
        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
                <CalendarClock className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-app-text sm:text-3xl">
                  {t.title}
                </h1>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-app-muted">
                  {t.description}
                </p>
              </div>
            </div>
            <span className="w-fit rounded-full bg-app-accent/10 px-3 py-1.5 text-sm font-bold text-app-accent">
              {waiting.length} {t.active.toLocaleLowerCase(locale)}
            </span>
          </div>
        </section>

        <details className="group rounded-3xl border border-app-soft bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent text-white">
                <ListPlus className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-app-text">{t.add}</p>
                <p className="mt-1 text-sm text-app-muted">{t.addHelp}</p>
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-app-muted transition group-open:rotate-180" />
          </summary>
          <form action={createWaitlistEntryAction} className="border-t border-app-soft p-5 sm:p-6">
            <WaitlistFields
              clients={clients}
              services={services}
              employees={employees}
              locale={locale}
            />
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/dashboard/clients/new"
                className="text-sm font-semibold text-app-accent"
              >
                + {t.newClient}
              </Link>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90"
              >
                <ListPlus className="h-4 w-4" /> {t.save}
              </button>
            </div>
          </form>
        </details>

        <section className="rounded-3xl border border-app-soft bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
          <div className="border-b border-app-soft p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-app-text">{t.active}</h2>
                <p className="mt-1 text-sm text-app-muted">{t.activeHelp}</p>
              </div>
              <UsersRound className="h-5 w-5 text-app-accent" />
            </div>
          </div>

          {waiting.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarClock className="mx-auto h-10 w-10 text-app-muted" />
              <p className="mt-3 font-semibold text-app-text">{t.empty}</p>
            </div>
          ) : (
            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
              {waiting.map((entry) => {
                const dateFrom = formatDate(entry.preferred_date_from, locale);
                const dateTo = formatDate(entry.preferred_date_to, locale);
                const timeFrom = time(entry.preferred_time_from);
                const timeTo = time(entry.preferred_time_to);
                const updateAction = updateWaitlistEntryAction.bind(null, entry.id);
                const cancelAction = cancelWaitlistEntryAction.bind(null, entry.id);

                return (
                  <article
                    key={entry.id}
                    className="rounded-2xl border border-app-soft bg-app-bg/35 p-4 sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-4 w-4 shrink-0 text-app-accent" />
                          <h3 className="truncate font-bold text-app-text">
                            {entry.client?.name ?? t.client}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-app-accent">
                          {entry.service?.name ?? t.service}
                        </p>
                        {entry.client?.phone || entry.client?.email ? (
                          <p className="mt-1 truncate text-xs text-app-muted">
                            {[entry.client.phone, entry.client.email].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-app-muted">
                        {t.created} {formatCreated(entry.created_at, locale)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-app-muted">
                          {t.preferences}
                        </p>
                        <p className="mt-1 font-medium text-app-text">
                          {dateFrom
                            ? dateTo && dateTo !== dateFrom
                              ? `${dateFrom} – ${dateTo}`
                              : dateFrom
                            : t.anyDate}
                        </p>
                        <p className="mt-1 text-xs text-app-muted">
                          {timeFrom && timeTo ? `${timeFrom} – ${timeTo}` : t.anyTime}
                        </p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-app-muted">
                          {t.employee}
                        </p>
                        <p className="mt-1 font-medium text-app-text">
                          {entry.preferred_employee?.name ?? t.anyEmployee}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-app-muted">
                          {entry.notes || t.noNotes}
                        </p>
                      </div>
                    </div>

                    <WaitlistMatchFinder
                      entryId={entry.id}
                      clientId={entry.client_id}
                      serviceId={entry.service_id}
                      locale={locale}
                    />

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link
                        href={buildBookingHref(entry, today)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        <CalendarPlus className="h-4 w-4" /> {t.book}
                      </Link>

                      <details className="group/edit sm:relative">
                        <summary className="inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg sm:w-auto">
                          <Pencil className="h-4 w-4" /> {t.edit}
                        </summary>
                        <div className="mt-3 rounded-2xl border border-app-soft bg-white p-4 shadow-lg sm:absolute sm:right-0 sm:z-20 sm:w-[34rem]">
                          <form action={updateAction}>
                            <WaitlistFields
                              entry={entry}
                              clients={clients}
                              services={services}
                              employees={employees}
                              locale={locale}
                            />
                            <button
                              type="submit"
                              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white"
                            >
                              {t.update}
                            </button>
                          </form>
                        </div>
                      </details>

                      <form action={cancelAction}>
                        <button
                          type="submit"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 sm:w-auto"
                        >
                          <X className="h-4 w-4" /> {t.remove}
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {history.length ? (
          <details className="group rounded-3xl border border-app-soft bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
              <div>
                <h2 className="font-bold text-app-text">{t.history}</h2>
                <p className="mt-1 text-sm text-app-muted">{t.historyHelp}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-app-bg px-2.5 py-1 text-xs font-bold text-app-muted">
                  {history.length}
                </span>
                <ChevronDown className="h-4 w-4 text-app-muted transition group-open:rotate-180" />
              </div>
            </summary>
            <div className="divide-y divide-app-soft border-t border-app-soft">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-app-text">
                      {entry.client?.name ?? t.client}
                    </p>
                    <p className="mt-1 text-sm text-app-muted">
                      {entry.service?.name ?? t.service} · {entry.status === "booked" ? t.booked : t.cancelled}
                    </p>
                  </div>
                  {entry.status === "booked" && entry.booked_appointment_id ? (
                    <Link
                      href={`/dashboard/appointments/${entry.booked_appointment_id}/edit`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-app-accent"
                    >
                      <Clock3 className="h-4 w-4" /> {t.openAppointment}
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </details>
        ) : null}

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>
      </div>
    </main>
  );
}
