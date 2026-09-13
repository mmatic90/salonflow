import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  Clock3,
  Info,
  ListPlus,
  Pencil,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { requireDashboardCapability } from "@/lib/page-guards";
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
import WaitlistSlotMatcher from "@/features/waitlist/waitlist-slot-matcher";
import type { AppLocale } from "@/lib/i18n";

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10";

type SearchParams = Promise<{
  open?: string;
  clientId?: string;
  serviceId?: string;
  employeeId?: string;
  dateFrom?: string;
  timeFrom?: string;
  notes?: string;
}>;

type WaitlistDraftDefaults = {
  clientId?: string;
  serviceId?: string;
  employeeId?: string;
  dateFrom?: string;
  timeFrom?: string;
  notes?: string;
};

function ui(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Waitlist",
      description: "Keep track of clients who want an earlier or currently unavailable slot.",
      add: "Add to waitlist",
      addHelp: "Choose a client and service. Date, time and employee preferences are optional.",
      prefillTitle: "Appointment details copied",
      prefillHelp:
        "The requested start date and time are filled in. Choose the latest acceptable date and time to define the waitlist range.",
      client: "Client",
      service: "Service",
      employee: "Preferred employee",
      anyEmployee: "Any employee",
      dateFrom: "From date",
      dateTo: "To date",
      timeFrom: "From time",
      timeTo: "To time",
      rangeEndRequired: "Required for this waitlist request",
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
      prefillTitle: "Dati dell'appuntamento copiati",
      prefillHelp:
        "Data e ora iniziali sono già compilate. Scegli la data e l'ora massime accettabili per definire l'intervallo della lista d'attesa.",
      client: "Cliente",
      service: "Servizio",
      employee: "Operatore preferito",
      anyEmployee: "Qualsiasi operatore",
      dateFrom: "Data dal",
      dateTo: "Data al",
      timeFrom: "Ora dalle",
      timeTo: "Ora alle",
      rangeEndRequired: "Obbligatorio per questa richiesta",
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
    prefillTitle: "Podaci termina su preneseni",
    prefillHelp:
      "Početni datum i vrijeme već su popunjeni. Odredite najkasniji datum i vrijeme koji klijentu odgovaraju kako biste definirali raspon čekanja.",
    client: "Klijent",
    service: "Usluga",
    employee: "Željeni zaposlenik",
    anyEmployee: "Bilo koji zaposlenik",
    dateFrom: "Datum od",
    dateTo: "Datum do",
    timeFrom: "Vrijeme od",
    timeTo: "Vrijeme do",
    rangeEndRequired: "Obavezno za ovaj zahtjev",
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

function validDate(value: string | undefined) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

function validTime(value: string | undefined) {
  return value && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : undefined;
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
  defaults,
  requireRangeEnd = false,
  clients,
  services,
  employees,
  locale,
}: {
  entry?: WaitlistEntry;
  defaults?: WaitlistDraftDefaults;
  requireRangeEnd?: boolean;
  clients: WaitlistOption[];
  services: WaitlistOption[];
  employees: WaitlistOption[];
  locale: AppLocale;
}) {
  const t = ui(locale);
  const clientId = entry?.client_id ?? defaults?.clientId ?? "";
  const serviceId = entry?.service_id ?? defaults?.serviceId ?? "";
  const employeeId =
    entry?.preferred_employee_id ?? defaults?.employeeId ?? "";
  const dateFrom = entry?.preferred_date_from ?? defaults?.dateFrom ?? "";
  const timeFrom =
    time(entry?.preferred_time_from ?? null) ?? defaults?.timeFrom ?? "";
  const requireTimeTo = requireRangeEnd || Boolean(timeFrom && entry);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.client}</span>
          <select
            className={fieldClass}
            name="client_id"
            defaultValue={clientId}
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
            defaultValue={serviceId}
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
          defaultValue={employeeId}
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
            defaultValue={dateFrom}
            required={requireRangeEnd}
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span className="flex flex-wrap items-center gap-2">
            {t.dateTo}
            {requireRangeEnd ? (
              <span className="text-xs font-normal text-app-muted">
                ({t.rangeEndRequired})
              </span>
            ) : null}
          </span>
          <input
            className={fieldClass}
            type="date"
            name="preferred_date_to"
            min={dateFrom || undefined}
            defaultValue={entry?.preferred_date_to ?? ""}
            required={requireRangeEnd}
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
            defaultValue={timeFrom}
            required={requireRangeEnd}
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span className="flex flex-wrap items-center gap-2">
            {t.timeTo}
            {requireRangeEnd ? (
              <span className="text-xs font-normal text-app-muted">
                ({t.rangeEndRequired})
              </span>
            ) : null}
          </span>
          <input
            className={fieldClass}
            type="time"
            name="preferred_time_to"
            min={timeFrom || undefined}
            defaultValue={time(entry?.preferred_time_to ?? null) ?? ""}
            required={requireTimeTo}
          />
        </label>
      </div>

      <label className="space-y-2 text-sm font-medium text-app-text">
        <span>{t.notes}</span>
        <textarea
          className={fieldClass}
          name="notes"
          rows={3}
          defaultValue={entry?.notes ?? defaults?.notes ?? ""}
        />
      </label>
    </div>
  );
}

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const permissions = await requireDashboardCapability(
    "waitlist",
    "/dashboard/waitlist",
  );
  const locale = permissions.organizationLocale;
  const t = ui(locale);
  const today = getTodayLocalDate();
  const { entries, clients, services, employees } = await getWaitlistPageData(
    permissions.organizationId,
  );
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const draftDefaults: WaitlistDraftDefaults = {
    clientId: clients.some((item) => item.id === resolvedSearchParams?.clientId)
      ? resolvedSearchParams?.clientId
      : undefined,
    serviceId: services.some((item) => item.id === resolvedSearchParams?.serviceId)
      ? resolvedSearchParams?.serviceId
      : undefined,
    employeeId: employees.some(
      (item) => item.id === resolvedSearchParams?.employeeId,
    )
      ? resolvedSearchParams?.employeeId
      : undefined,
    dateFrom: validDate(resolvedSearchParams?.dateFrom),
    timeFrom: validTime(resolvedSearchParams?.timeFrom),
    notes: resolvedSearchParams?.notes?.slice(0, 2000),
  };
  const hasAppointmentPrefill =
    resolvedSearchParams?.open === "1" &&
    Boolean(
      draftDefaults.clientId &&
        draftDefaults.serviceId &&
        draftDefaults.dateFrom &&
        draftDefaults.timeFrom,
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

        <WaitlistSlotMatcher
          locale={locale}
          services={services}
          defaultDate={today}
        />

        {resolvedSearchParams?.open === "1" ? (
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-app-accent">
                  <ListPlus className="h-4 w-4" />
                  {t.add}
                </div>
                <p className="mt-2 text-sm leading-6 text-app-muted">
                  {hasAppointmentPrefill ? t.prefillHelp : t.addHelp}
                </p>
              </div>
              <Link
                href="/dashboard/waitlist"
                className="rounded-xl border border-app-soft bg-white p-2 text-app-muted transition hover:bg-app-bg hover:text-app-text"
                aria-label={t.back}
              >
                <X className="h-4 w-4" />
              </Link>
            </div>

            {hasAppointmentPrefill ? (
              <div className="mt-4 rounded-2xl border border-app-accent/20 bg-app-accent/5 p-4 text-sm text-app-text">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                  <div>
                    <p className="font-semibold">{t.prefillTitle}</p>
                    <p className="mt-1 text-app-muted">{t.prefillHelp}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <form action={createWaitlistEntryAction} className="mt-5 space-y-5">
              <WaitlistFields
                defaults={draftDefaults}
                requireRangeEnd={hasAppointmentPrefill}
                clients={clients}
                services={services}
                employees={employees}
                locale={locale}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Link
                  href="/dashboard/waitlist"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg"
                >
                  {t.back}
                </Link>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  <ListPlus className="h-4 w-4" /> {t.save}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-dashed border-app-soft bg-white/70 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-app-text">{t.add}</p>
                <p className="mt-1 text-sm text-app-muted">{t.addHelp}</p>
              </div>
              <Link
                href="/dashboard/waitlist?open=1"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                <ListPlus className="h-4 w-4" /> {t.add}
              </Link>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-app-muted">{t.active}</p>
              <h2 className="mt-1 text-xl font-bold text-app-text">
                {t.activeHelp}
              </h2>
            </div>
            <UsersRound className="h-5 w-5 text-app-accent" />
          </div>

          {waiting.length ? (
            <div className="mt-5 space-y-3">
              {waiting.map((entry) => (
                <details
                  key={entry.id}
                  className="group rounded-2xl border border-app-soft bg-app-bg/35"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-app-text">{entry.client_name}</p>
                        <span className="rounded-full bg-app-accent/10 px-2.5 py-1 text-xs font-bold text-app-accent">
                          {entry.service_name}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-app-muted">
                        {entry.preferred_employee_name || t.anyEmployee}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-app-muted transition group-open:rotate-180" />
                  </summary>

                  <div className="border-t border-app-soft bg-white p-4 sm:p-5">
                    <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-xl bg-app-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
                          {t.preferences}
                        </p>
                        <p className="mt-2 font-medium text-app-text">
                          {formatDate(entry.preferred_date_from, locale) || t.anyDate}
                          {entry.preferred_date_to
                            ? ` – ${formatDate(entry.preferred_date_to, locale)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-app-muted">
                          {time(entry.preferred_time_from) || t.anyTime}
                          {entry.preferred_time_to
                            ? ` – ${time(entry.preferred_time_to)}`
                            : ""}
                        </p>
                      </div>
                      <div className="rounded-xl bg-app-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
                          {t.notes}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-app-text">
                          {entry.notes || t.noNotes}
                        </p>
                      </div>
                      <div className="rounded-xl bg-app-bg p-3">
                        <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
                          {t.created}
                        </p>
                        <p className="mt-2 font-medium text-app-text">
                          {formatCreated(entry.created_at, locale)}
                        </p>
                      </div>
                    </div>

                    <WaitlistMatchFinder
                      entryId={entry.id}
                      locale={locale}
                    />

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Link
                        href={buildBookingHref(entry, today)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                      >
                        <CalendarPlus className="h-4 w-4" /> {t.book}
                      </Link>
                      <details className="group/edit flex-1 sm:min-w-[280px]">
                        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg">
                          <Pencil className="h-4 w-4" /> {t.edit}
                        </summary>
                        <form
                          action={updateWaitlistEntryAction.bind(null, entry.id)}
                          className="mt-4 rounded-2xl border border-app-soft bg-white p-4"
                        >
                          <WaitlistFields
                            entry={entry}
                            clients={clients}
                            services={services}
                            employees={employees}
                            locale={locale}
                          />
                          <button
                            type="submit"
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                          >
                            {t.update}
                          </button>
                        </form>
                      </details>
                      <form action={cancelWaitlistEntryAction.bind(null, entry.id)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 sm:w-auto"
                        >
                          <X className="h-4 w-4" /> {t.remove}
                        </button>
                      </form>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-app-soft p-8 text-center">
              <UserRound className="mx-auto h-8 w-8 text-app-muted" />
              <p className="mt-3 font-semibold text-app-text">{t.empty}</p>
            </div>
          )}
        </section>

        {history.length ? (
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-[0_8px_24px_rgba(15,23,42,0.05)] sm:p-6">
            <div>
              <p className="text-sm font-semibold text-app-muted">{t.history}</p>
              <h2 className="mt-1 text-xl font-bold text-app-text">
                {t.historyHelp}
              </h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-2xl border border-app-soft bg-app-bg/35 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-app-text">{entry.client_name}</p>
                      <p className="mt-1 text-sm text-app-muted">
                        {entry.service_name}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-app-text">
                      {entry.status === "booked" ? t.booked : t.cancelled}
                    </span>
                  </div>
                  {entry.booked_appointment_id ? (
                    <Link
                      href={`/dashboard/appointments/${entry.booked_appointment_id}/edit`}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-app-accent"
                    >
                      <CalendarPlus className="h-4 w-4" /> {t.openAppointment}
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
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
