"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DoorOpen,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  Shapes,
  Sparkles,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

export type AppointmentOption = { id: string; label: string };
type ClientOption = AppointmentOption & {
  phone: string | null;
  email: string | null;
};
type ServiceOption = AppointmentOption & { durationMinutes: number };
type Props = {
  locale?: AppLocale;
  defaultDate: string;
  defaultClientId?: string;
  defaultServiceId?: string;
  clients: ClientOption[];
  employees: AppointmentOption[];
  rooms: AppointmentOption[];
  services: ServiceOption[];
};

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text shadow-sm outline-none transition placeholder:text-app-muted/70 hover:border-app-accent/40 focus:border-app-accent focus:ring-4 focus:ring-app-accent/10 disabled:cursor-not-allowed disabled:bg-app-bg disabled:text-app-muted";
const sectionClass =
  "rounded-2xl border border-app-soft bg-white p-5 shadow-sm md:p-6";

function SectionHeader({
  icon,
  title,
  description,
  step,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  step: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
          {step}
        </p>
        <h2 className="mt-0.5 font-semibold text-app-text">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-app-muted">{description}</p>
      </div>
    </div>
  );
}

export default function MultiTenantAppointmentForm({
  locale = "hr",
  defaultDate,
  defaultClientId,
  defaultServiceId,
  clients,
  employees,
  services,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.appointments;
  const defaultClient =
    clients.find((client) => client.id === defaultClientId) ?? null;
  const initialServiceId =
    defaultServiceId && services.some((service) => service.id === defaultServiceId)
      ? defaultServiceId
      : "";
  const ui = {
    step1: locale === "en" ? "Step 1" : locale === "it" ? "Passo 1" : "Korak 1",
    step2: locale === "en" ? "Step 2" : locale === "it" ? "Passo 2" : "Korak 2",
    optionalDetails:
      locale === "en"
        ? "Optional details"
        : locale === "it"
          ? "Dettagli facoltativi"
          : "Dodatni podaci",
    optionalDetailsHelp:
      locale === "en"
        ? "Email and appointment note"
        : locale === "it"
          ? "Email e nota dell'appuntamento"
          : "Email i napomena termina",
    appointmentNoteOnly:
      locale === "en"
        ? "Appointment note"
        : locale === "it"
          ? "Nota dell'appuntamento"
          : "Napomena termina",
    selectedClient:
      locale === "en"
        ? "Selected client"
        : locale === "it"
          ? "Cliente selezionato"
          : "Odabrani klijent",
    changeClient:
      locale === "en"
        ? "Change client"
        : locale === "it"
          ? "Cambia cliente"
          : "Promijeni klijenta",
  };

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [serviceId, setServiceId] = useState(initialServiceId);
  const [employeeId, setEmployeeId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [clientId, setClientId] = useState(defaultClient?.id ?? "");
  const [clientName, setClientName] = useState(defaultClient?.label ?? "");
  const [clientPhone, setClientPhone] = useState(defaultClient?.phone ?? "");
  const [clientEmail, setClientEmail] = useState(defaultClient?.email ?? "");
  const [clientSearch, setClientSearch] = useState(defaultClient?.label ?? "");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [additionalDetailsOpen, setAdditionalDetailsOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<
    AppointmentOption[]
  >([]);
  const [availableRooms, setAvailableRooms] = useState<AppointmentOption[]>([]);

  const hasRequiredSetup = employees.length > 0 && services.length > 0;
  const availabilityReady = Boolean(date && startTime && serviceId);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLocaleLowerCase("hr");
    if (!query) return clients.slice(0, 8);

    return clients
      .filter((client) =>
        [client.label, client.phone ?? "", client.email ?? ""]
          .join(" ")
          .toLocaleLowerCase("hr")
          .includes(query),
      )
      .slice(0, 8);
  }, [clientSearch, clients]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [serviceId, services],
  );
  const selectedEmployee = useMemo(
    () => availableEmployees.find((employee) => employee.id === employeeId),
    [availableEmployees, employeeId],
  );
  const selectedRoom = useMemo(
    () => availableRooms.find((room) => room.id === roomId),
    [availableRooms, roomId],
  );

  function resetAvailabilitySelection() {
    setAvailableEmployees([]);
    setAvailableRooms([]);
    setEmployeeId("");
    setRoomId("");
  }

  useEffect(() => {
    if (!availabilityReady) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailabilityPending(true);
      setError("");

      try {
        const params = new URLSearchParams({
          date,
          start_time: startTime,
          service_id: serviceId,
        });
        const response = await fetch(`/api/appointments/availability?${params}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          error?: string;
          employees?: AppointmentOption[];
          rooms?: AppointmentOption[];
        };

        if (!response.ok) {
          throw new Error(result.error || t.availabilityError);
        }

        const nextEmployees = result.employees ?? [];
        const nextRooms = result.rooms ?? [];
        setAvailableEmployees(nextEmployees);
        setAvailableRooms(nextRooms);
        setEmployeeId((current) =>
          nextEmployees.some((employee) => employee.id === current)
            ? current
            : nextEmployees.length === 1
              ? nextEmployees[0].id
              : "",
        );
        setRoomId((current) =>
          nextRooms.some((room) => room.id === current)
            ? current
            : nextRooms.length === 1
              ? nextRooms[0].id
              : "",
        );
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setAvailableEmployees([]);
        setAvailableRooms([]);
        setEmployeeId("");
        setRoomId("");
        setError(
          requestError instanceof Error
            ? requestError.message
            : t.availabilityError,
        );
      } finally {
        if (!controller.signal.aborted) setAvailabilityPending(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [availabilityReady, date, startTime, serviceId, t.availabilityError]);

  function selectClient(client: ClientOption) {
    setClientId(client.id);
    setClientName(client.label);
    setClientPhone(client.phone ?? "");
    setClientEmail(client.email ?? "");
    setClientSearch(client.label);
    setClientSearchOpen(false);
  }

  function resetClient(openSearch: boolean) {
    setClientId("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setClientSearch("");
    setClientSearchOpen(openSearch);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) {
        setError(result.error || t.saveError);
        return;
      }

      window.location.href = `/dashboard/calendar?date=${encodeURIComponent(date)}`;
    } catch (requestError) {
      console.error(requestError);
      setError(t.networkError);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="client_id" value={clientId} />

      {!hasRequiredSetup ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {t.setupRequired}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className={sectionClass}>
        <SectionHeader
          icon={<CalendarDays className="h-5 w-5" />}
          step={ui.step1}
          title={t.appointmentAndService}
          description={t.appointmentAndServiceDescription}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-app-muted" />
              {t.date}
            </span>
            <input
              className={fieldClass}
              type="date"
              name="appointment_date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                resetAvailabilitySelection();
              }}
              required
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-app-muted" />
              {t.startTime}
            </span>
            <input
              className={fieldClass}
              type="time"
              name="start_time"
              value={startTime}
              onChange={(event) => {
                setStartTime(event.target.value);
                resetAvailabilitySelection();
              }}
              required
            />
          </label>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-medium text-app-text">
          <span className="flex items-center gap-2">
            <Shapes className="h-4 w-4 text-app-muted" />
            {t.service}
          </span>
          <select
            className={fieldClass}
            name="service_id"
            required
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value);
              resetAvailabilitySelection();
            }}
          >
            <option value="" disabled>
              {t.selectService}
            </option>
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.label} · {service.durationMinutes} min
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-app-muted" />
              {t.availableEmployee}
            </span>
            <select
              className={fieldClass}
              name="employee_id"
              required
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              disabled={!availabilityReady || availabilityPending}
            >
              <option value="">
                {availabilityPending
                  ? t.checkingAvailability
                  : availabilityReady
                    ? t.selectEmployee
                    : t.chooseDateTimeService}
              </option>
              {availableEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.label}
                </option>
              ))}
            </select>
            {availabilityPending ? (
              <span className="flex items-center gap-2 text-xs text-app-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t.checkingSchedule}
              </span>
            ) : availabilityReady && availableEmployees.length > 0 ? (
              <span className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.available}: {availableEmployees.length}
              </span>
            ) : availabilityReady ? (
              <span className="text-xs text-amber-700">{t.noEmployees}</span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-app-muted" />
              {t.availableRoom}{" "}
              <span className="font-normal text-app-muted">({t.optional})</span>
            </span>
            <select
              className={fieldClass}
              name="room_id"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              disabled={!availabilityReady || availabilityPending}
            >
              <option value="">
                {availabilityPending ? t.checkingAvailability : t.noRoom}
              </option>
              {availableRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
            </select>
            {availabilityReady &&
            !availabilityPending &&
            availableRooms.length > 0 ? (
              <span className="flex items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t.available}: {availableRooms.length}
              </span>
            ) : availabilityReady && !availabilityPending ? (
              <span className="text-xs text-app-muted">{t.noRooms}</span>
            ) : null}
          </label>
        </div>

        {availabilityReady && selectedService ? (
          <div className="mt-5 rounded-2xl border border-app-accent/20 bg-app-accent/5 p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
              <div className="min-w-0">
                <p className="font-semibold text-app-text">{t.summary}</p>
                <p className="mt-1 text-sm leading-6 text-app-muted">
                  {selectedService.label} · {selectedService.durationMinutes} min
                  {startTime ? ` · ${date} u ${startTime}` : ""}
                  {selectedEmployee ? ` · ${selectedEmployee.label}` : ""}
                  {selectedRoom ? ` · ${selectedRoom.label}` : ""}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className={sectionClass}>
        <SectionHeader
          icon={<UserRound className="h-5 w-5" />}
          step={ui.step2}
          title={t.clientData}
          description={t.clientDataDescription}
        />

        {!clientId ? (
          <div className="relative">
            <label className="space-y-2 text-sm font-medium text-app-text">
              <span className="flex items-center gap-2">
                <Search className="h-4 w-4 text-app-muted" />
                {t.findExistingClient}
              </span>
              <div className="relative">
                <input
                  className={`${fieldClass} pr-11`}
                  value={clientSearch}
                  onFocus={() => setClientSearchOpen(true)}
                  onBlur={() =>
                    window.setTimeout(() => setClientSearchOpen(false), 120)
                  }
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setClientSearchOpen(true);
                  }}
                  placeholder={t.searchClientPlaceholder}
                  autoComplete="off"
                />
                {clientSearch ? (
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => resetClient(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-app-muted transition hover:bg-app-bg hover:text-app-text"
                    aria-label={t.clearClient}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </label>

            {clientSearchOpen ? (
              <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-app-soft bg-white p-2 shadow-xl">
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => resetClient(false)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-app-bg"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-app-text">
                      {t.newClient}
                    </p>
                    <p className="text-xs text-app-muted">{t.enterBelow}</p>
                  </div>
                </button>

                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectClient(client)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-app-bg"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-bg text-app-muted">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-app-text">
                          {client.label}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-app-muted">
                          {[client.phone, client.email]
                            .filter(Boolean)
                            .join(" · ") || t.noContact}
                        </p>
                      </div>
                    </button>
                  ))
                ) : clientSearch.trim() ? (
                  <p className="px-3 py-4 text-sm text-app-muted">
                    {t.noMatchingClient}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {clientId ? (
          <>
            <input type="hidden" name="client_name" value={clientName} />
            <input type="hidden" name="client_phone" value={clientPhone} />
            <input type="hidden" name="client_email" value={clientEmail} />
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700">
                      {ui.selectedClient}
                    </p>
                    <p className="mt-0.5 truncate font-semibold text-emerald-950">
                      {clientName}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-emerald-800">
                      {[clientPhone, clientEmail].filter(Boolean).join(" · ") ||
                        t.noContact}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => resetClient(true)}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
                >
                  {ui.changeClient}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-app-text">
              <span>{t.fullName}</span>
              <input
                className={fieldClass}
                name="client_name"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                placeholder={t.fullNamePlaceholder}
                required
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-app-text">
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-app-muted" />
                {t.phone}
              </span>
              <input
                className={fieldClass}
                name="client_phone"
                type="tel"
                value={clientPhone}
                onChange={(event) => setClientPhone(event.target.value)}
                placeholder="+385 ..."
              />
            </label>
          </div>
        )}
      </section>

      <details
        open={additionalDetailsOpen}
        onToggle={(event) => setAdditionalDetailsOpen(event.currentTarget.open)}
        className="group rounded-2xl border border-app-soft bg-white shadow-sm"
      >
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-bg text-app-muted">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-app-text">{ui.optionalDetails}</p>
              <p className="mt-0.5 text-xs text-app-muted">
                {clientId ? ui.appointmentNoteOnly : ui.optionalDetailsHelp}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-app-muted transition group-open:rotate-180" />
        </summary>

        <div className="space-y-5 border-t border-app-soft px-5 py-5 md:px-6">
          {!clientId ? (
            <label className="block space-y-2 text-sm font-medium text-app-text">
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-app-muted" />
                {t.email}
              </span>
              <input
                className={fieldClass}
                name="client_email"
                type="email"
                value={clientEmail}
                onChange={(event) => setClientEmail(event.target.value)}
                placeholder="klijent@email.com"
              />
            </label>
          ) : null}

          <label className="block space-y-2 text-sm font-medium text-app-text">
            <span>{t.note}</span>
            <textarea
              className={fieldClass}
              name="notes"
              rows={4}
              placeholder={t.notePlaceholder}
            />
          </label>
        </div>
      </details>

      <button
        type="submit"
        disabled={
          pending || availabilityPending || !hasRequiredSetup || !employeeId
        }
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-accent px-5 py-4 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.savingAppointment}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            {t.saveAppointment}
          </>
        )}
      </button>
    </form>
  );
}
