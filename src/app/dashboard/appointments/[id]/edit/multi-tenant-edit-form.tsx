"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  DoorOpen,
  FileText,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  Shapes,
  UserRound,
  UsersRound,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppointmentEditItem,
  AppointmentFormEmployee,
  AppointmentFormRoom,
  AppointmentFormService,
} from "@/features/appointments/queries";
import type { ClientComboboxItem } from "@/components/client-combobox";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  appointment: AppointmentEditItem;
  services: AppointmentFormService[];
  employees: AppointmentFormEmployee[];
  rooms: AppointmentFormRoom[];
  clients: ClientComboboxItem[];
};

type AvailabilityOption = {
  id: string;
  label: string;
};

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text shadow-sm outline-none transition hover:border-app-accent/40 focus:border-app-accent focus:ring-4 focus:ring-app-accent/10 disabled:cursor-not-allowed disabled:bg-app-bg disabled:text-app-muted";
const sectionClass =
  "rounded-2xl border border-app-soft bg-white p-5 shadow-sm md:p-6";

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold text-app-text">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-app-muted">{description}</p>
      </div>
    </div>
  );
}

export default function MultiTenantEditAppointmentForm({
  locale = "hr",
  appointment,
  services,
  clients,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.appointments;
  const router = useRouter();
  const ui = {
    scheduleTitle:
      locale === "en"
        ? "Appointment"
        : locale === "it"
          ? "Appuntamento"
          : "Termin",
    scheduleDescription:
      locale === "en"
        ? "Change the time, service or assigned resources."
        : locale === "it"
          ? "Modifica orario, servizio o risorse assegnate."
          : "Promijeni vrijeme, uslugu ili dodijeljene resurse.",
    clientTitle:
      locale === "en"
        ? "Client"
        : locale === "it"
          ? "Cliente"
          : "Klijent",
    clientDescription:
      locale === "en"
        ? "Keep the existing client or select another one."
        : locale === "it"
          ? "Mantieni il cliente attuale o selezionane un altro."
          : "Zadrži postojećeg klijenta ili odaberi drugog.",
    treatmentTitle:
      locale === "en"
        ? "Treatment note"
        : locale === "it"
          ? "Nota del trattamento"
          : "Tretmanska bilješka",
    treatmentHelp:
      locale === "en"
        ? "Internal record of the treatment, products, settings, reactions or recommendations."
        : locale === "it"
          ? "Registro interno del trattamento, prodotti, impostazioni, reazioni o raccomandazioni."
          : "Interna evidencija tretmana, proizvoda, postavki, reakcija ili preporuka.",
    treatmentSaved:
      locale === "en"
        ? "Note saved"
        : locale === "it"
          ? "Nota salvata"
          : "Bilješka spremljena",
    treatmentPlaceholder:
      locale === "en"
        ? "Example: Treatment performed, products or device settings used, client reaction and recommendation for next visit..."
        : locale === "it"
          ? "Esempio: trattamento eseguito, prodotti o impostazioni usate, reazione del cliente e raccomandazione per la prossima visita..."
          : "Primjer: što je odrađeno, korišteni proizvodi ili postavke uređaja, reakcija klijenta i preporuka za sljedeći dolazak...",
    moreOptions:
      locale === "en"
        ? "More options"
        : locale === "it"
          ? "Altre opzioni"
          : "Više opcija",
    moreOptionsHelp:
      locale === "en"
        ? "Contact details, status and booking note"
        : locale === "it"
          ? "Contatti, stato e nota della prenotazione"
          : "Kontakt, status i napomena termina",
    bookingNote:
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
  };

  const [pending, setPending] = useState(false);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(appointment.client_id ?? "");
  const [clientName, setClientName] = useState(appointment.client_name);
  const [clientPhone, setClientPhone] = useState(appointment.client_phone ?? "");
  const [clientEmail, setClientEmail] = useState(appointment.client_email ?? "");
  const [date, setDate] = useState(appointment.appointment_date);
  const [startTime, setStartTime] = useState(
    appointment.start_time.slice(0, 5),
  );
  const [serviceId, setServiceId] = useState(appointment.service_id);
  const [employeeId, setEmployeeId] = useState(appointment.employee_id);
  const [roomId, setRoomId] = useState(appointment.room_id ?? "");
  const [availableEmployees, setAvailableEmployees] = useState<
    AvailabilityOption[]
  >([]);
  const [availableRooms, setAvailableRooms] = useState<AvailabilityOption[]>([]);

  const availabilityReady = Boolean(date && startTime && serviceId);
  const displayedEmployees = availabilityReady ? availableEmployees : [];
  const displayedRooms = availabilityReady ? availableRooms : [];
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === clientId) ?? null,
    [clientId, clients],
  );

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
          exclude_appointment_id: appointment.id,
        });
        const response = await fetch(`/api/appointments/availability?${params}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          error?: string;
          employees?: AvailabilityOption[];
          rooms?: AvailabilityOption[];
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
          current && nextRooms.some((room) => room.id === current)
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
  }, [
    appointment.id,
    availabilityReady,
    date,
    startTime,
    serviceId,
    t.availabilityError,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        error?: string;
        redirectTo?: string;
      };

      if (!response.ok) throw new Error(result.error || t.editError);
      router.push(`/dashboard/calendar?date=${encodeURIComponent(date)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.editError);
    } finally {
      setPending(false);
    }
  }

  function handleClientChange(nextClientId: string) {
    setClientId(nextClientId);

    if (!nextClientId) {
      setClientName("");
      setClientPhone("");
      setClientEmail("");
      return;
    }

    const nextClient = clients.find((client) => client.id === nextClientId);
    if (!nextClient) return;

    setClientName(nextClient.full_name);
    setClientPhone(nextClient.phone ?? "");
    setClientEmail(nextClient.email ?? "");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className={sectionClass}>
        <SectionHeader
          icon={<CalendarDays className="h-5 w-5" />}
          title={ui.scheduleTitle}
          description={ui.scheduleDescription}
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
              onChange={(event) => setDate(event.target.value)}
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
              onChange={(event) => setStartTime(event.target.value)}
              required
            />
          </label>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <Shapes className="h-4 w-4 text-app-muted" />
              {t.service}
            </span>
            <select
              className={fieldClass}
              name="service_id"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              required
            >
              <option value="" disabled>
                {t.selectService}
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.duration_minutes} min
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-app-muted" />
              {t.employee}
            </span>
            <select
              className={fieldClass}
              name="employee_id"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              required
              disabled={availabilityPending || !availabilityReady}
            >
              <option value="">
                {availabilityPending
                  ? t.checkingAvailability
                  : t.selectFreeEmployee}
              </option>
              {displayedEmployees.map((employee) => (
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
            ) : availabilityReady && displayedEmployees.length === 0 ? (
              <span className="block text-xs text-amber-700">
                {t.noEmployees}
              </span>
            ) : null}
          </label>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-medium text-app-text md:max-w-[calc(50%-0.625rem)]">
          <span className="flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-app-muted" />
            {t.room}
          </span>
          <select
            className={fieldClass}
            name="room_id"
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            disabled={availabilityPending || !availabilityReady}
          >
            <option value="">
              {availabilityPending ? t.checkingAvailability : t.noRoom}
            </option>
            {displayedRooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className={sectionClass}>
        <SectionHeader
          icon={<UserRound className="h-5 w-5" />}
          title={ui.clientTitle}
          description={ui.clientDescription}
        />

        <label className="block space-y-2 text-sm font-medium text-app-text">
          <span>{t.existingClient}</span>
          <select
            className={fieldClass}
            name="client_id"
            value={clientId}
            onChange={(event) => handleClientChange(event.target.value)}
          >
            <option value="">{t.newClient}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </label>

        {clientId && selectedClient ? (
          <>
            <input type="hidden" name="client_name" value={clientName} />
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-emerald-700">
                    {ui.selectedClient}
                  </p>
                  <p className="mt-1 font-semibold text-emerald-950">
                    {clientName}
                  </p>
                  <p className="mt-1 text-sm text-emerald-800">
                    {[clientPhone, clientEmail].filter(Boolean).join(" · ") ||
                      t.noContact}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <label className="mt-5 block space-y-2 text-sm font-medium text-app-text">
            <span>{t.clientName}</span>
            <input
              className={fieldClass}
              name="client_name"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              required
            />
          </label>
        )}
      </section>

      <details className="group rounded-2xl border border-app-soft bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-app-text">{ui.treatmentTitle}</p>
                {appointment.internal_note ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {ui.treatmentSaved}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-app-muted">{ui.treatmentHelp}</p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-app-muted transition group-open:rotate-180" />
        </summary>

        <div className="border-t border-app-soft px-5 py-5 md:px-6">
          <label className="block space-y-2 text-sm font-medium text-app-text">
            <span>{ui.treatmentTitle}</span>
            <textarea
              className={fieldClass}
              name="internal_notes"
              rows={5}
              defaultValue={appointment.internal_note ?? ""}
              placeholder={ui.treatmentPlaceholder}
            />
          </label>
        </div>
      </details>

      <details className="group rounded-2xl border border-app-soft bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-bg text-app-muted">
              <MessageSquareText className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-app-text">{ui.moreOptions}</p>
              <p className="mt-0.5 text-xs text-app-muted">
                {ui.moreOptionsHelp}
              </p>
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-app-muted transition group-open:rotate-180" />
        </summary>

        <div className="space-y-5 border-t border-app-soft px-5 py-5 md:px-6">
          <div className="grid gap-5 md:grid-cols-2">
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
              />
            </label>

            <label className="space-y-2 text-sm font-medium text-app-text">
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
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-medium text-app-text">
            <span>{t.status}</span>
            <select
              className={fieldClass}
              name="status"
              defaultValue={appointment.status}
            >
              <option value="scheduled">
                {locale === "en"
                  ? "Scheduled"
                  : locale === "it"
                    ? "Programmato"
                    : "Zakazan"}
              </option>
              <option value="confirmed">
                {locale === "en"
                  ? "Confirmed"
                  : locale === "it"
                    ? "Confermato"
                    : "Potvrđen"}
              </option>
              <option value="completed">
                {locale === "en"
                  ? "Completed"
                  : locale === "it"
                    ? "Completato"
                    : "Odrađen"}
              </option>
              <option value="cancelled">
                {locale === "en"
                  ? "Cancelled"
                  : locale === "it"
                    ? "Annullato"
                    : "Otkazan"}
              </option>
              <option value="no_show">No-show</option>
            </select>
          </label>

          <label className="block space-y-2 text-sm font-medium text-app-text">
            <span>{ui.bookingNote}</span>
            <textarea
              className={fieldClass}
              name="notes"
              rows={4}
              defaultValue={appointment.client_note ?? ""}
            />
          </label>
        </div>
      </details>

      <button
        type="submit"
        disabled={pending || availabilityPending || !employeeId}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-accent px-5 py-4 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {t.saving}
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5" />
            {t.saveChanges}
          </>
        )}
      </button>
    </form>
  );
}
