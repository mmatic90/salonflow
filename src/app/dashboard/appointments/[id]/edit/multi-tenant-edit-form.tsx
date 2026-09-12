"use client";

import { FormEvent, useEffect, useState } from "react";
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
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";

export default function MultiTenantEditAppointmentForm({
  locale = "hr",
  appointment,
  services,
  clients,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.appointments;
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(appointment.client_id ?? "");
  const [clientName, setClientName] = useState(appointment.client_name);
  const [clientPhone, setClientPhone] = useState(appointment.client_phone ?? "");
  const [clientEmail, setClientEmail] = useState(appointment.client_email ?? "");
  const [date, setDate] = useState(appointment.appointment_date);
  const [startTime, setStartTime] = useState(appointment.start_time.slice(0, 5));
  const [serviceId, setServiceId] = useState(appointment.service_id);
  const [employeeId, setEmployeeId] = useState(appointment.employee_id);
  const [roomId, setRoomId] = useState(appointment.room_id ?? "");
  const [availableEmployees, setAvailableEmployees] = useState<AvailabilityOption[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailabilityOption[]>([]);
  const availabilityReady = Boolean(date && startTime && serviceId);
  const displayedEmployees = availabilityReady ? availableEmployees : [];
  const displayedRooms = availabilityReady ? availableRooms : [];

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
          nextEmployees.some((employee) => employee.id === current) ? current : "",
        );
        setRoomId((current) =>
          current && nextRooms.some((room) => room.id === current) ? current : "",
        );
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
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
  }, [appointment.id, availabilityReady, date, startTime, serviceId, t.availabilityError]);

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
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t.editError);
      router.push(result.redirectTo || "/dashboard/appointments");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t.editError,
      );
    } finally {
      setPending(false);
    }
  }

  function handleClientChange(nextClientId: string) {
    setClientId(nextClientId);
    if (!nextClientId) return;
    const selectedClient = clients.find((client) => client.id === nextClientId);
    if (!selectedClient) return;
    setClientName(selectedClient.full_name);
    setClientPhone(selectedClient.phone ?? "");
    setClientEmail(selectedClient.email ?? "");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.date}</span>
          <input className={fieldClass} type="date" name="appointment_date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.startTime}</span>
          <input className={fieldClass} type="time" name="start_time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.existingClient}</span>
          <select className={fieldClass} name="client_id" value={clientId} onChange={(event) => handleClientChange(event.target.value)}>
            <option value="">{t.newClient}</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.full_name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.clientName}</span>
          <input className={fieldClass} name="client_name" value={clientName} onChange={(event) => { setClientId(""); setClientName(event.target.value); }} required />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.phone}</span>
          <input className={fieldClass} name="client_phone" type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.email}</span>
          <input className={fieldClass} name="client_email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.service}</span>
          <select className={fieldClass} name="service_id" value={serviceId} onChange={(event) => setServiceId(event.target.value)} required>
            <option value="" disabled>{t.selectService}</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.employee}</span>
          <select className={fieldClass} name="employee_id" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required disabled={availabilityPending || !availabilityReady}>
            <option value="">{availabilityPending ? t.checkingAvailability : t.selectFreeEmployee}</option>
            {displayedEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}
          </select>
          {availabilityReady && !availabilityPending && displayedEmployees.length === 0 ? <span className="block text-xs text-amber-700">{t.noEmployees}</span> : null}
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.room}</span>
          <select className={fieldClass} name="room_id" value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={availabilityPending || !availabilityReady}>
            <option value="">{availabilityPending ? t.checkingAvailability : t.noRoom}</option>
            {displayedRooms.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>{t.status}</span>
          <select className={fieldClass} name="status" defaultValue={appointment.status}>
            <option value="scheduled">{locale === "en" ? "Scheduled" : locale === "it" ? "Programmato" : "Zakazan"}</option>
            <option value="confirmed">{locale === "en" ? "Confirmed" : locale === "it" ? "Confermato" : "Potvrđen"}</option>
            <option value="completed">{locale === "en" ? "Completed" : locale === "it" ? "Completato" : "Odrađen"}</option>
            <option value="cancelled">{locale === "en" ? "Cancelled" : locale === "it" ? "Annullato" : "Otkazan"}</option>
            <option value="no_show">{locale === "en" ? "No-show" : locale === "it" ? "No-show" : "Nije došao"}</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-app-text">
        <span>{t.note}</span>
        <textarea className={fieldClass} name="notes" rows={4} defaultValue={appointment.client_note ?? appointment.internal_note ?? ""} />
      </label>

      <button type="submit" disabled={pending || availabilityPending || !employeeId} className="inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? t.saving : t.saveChanges}
      </button>
    </form>
  );
}
