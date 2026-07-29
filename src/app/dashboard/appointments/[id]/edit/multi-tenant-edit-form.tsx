"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AppointmentEditItem,
  AppointmentFormEmployee,
  AppointmentFormRoom,
  AppointmentFormService,
} from "@/features/appointments/queries";
import type { ClientComboboxItem } from "@/components/client-combobox";

type Props = {
  appointment: AppointmentEditItem;
  services: AppointmentFormService[];
  employees: AppointmentFormEmployee[];
  rooms: AppointmentFormRoom[];
  clients: ClientComboboxItem[];
};

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";

export default function MultiTenantEditAppointmentForm({
  appointment,
  services,
  employees,
  rooms,
  clients,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(appointment.client_id ?? "");
  const [clientName, setClientName] = useState(appointment.client_name);
  const [clientPhone, setClientPhone] = useState(appointment.client_phone ?? "");
  const [clientEmail, setClientEmail] = useState(appointment.client_email ?? "");

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
      if (!response.ok) throw new Error(result.error || "Termin nije moguće urediti.");
      router.push(result.redirectTo || "/dashboard/appointments");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Termin nije moguće urediti.",
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
          <span>Datum</span>
          <input className={fieldClass} type="date" name="appointment_date" defaultValue={appointment.appointment_date} required />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Vrijeme početka</span>
          <input className={fieldClass} type="time" name="start_time" defaultValue={appointment.start_time.slice(0, 5)} required />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Postojeći klijent</span>
          <select className={fieldClass} name="client_id" value={clientId} onChange={(event) => handleClientChange(event.target.value)}>
            <option value="">Novi klijent</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.full_name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Ime klijenta</span>
          <input className={fieldClass} name="client_name" value={clientName} onChange={(event) => { setClientId(""); setClientName(event.target.value); }} required />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Telefon</span>
          <input className={fieldClass} name="client_phone" type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>E-mail</span>
          <input className={fieldClass} name="client_email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Usluga</span>
          <select className={fieldClass} name="service_id" defaultValue={appointment.service_id} required>
            <option value="" disabled>Odaberite uslugu</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Zaposlenik</span>
          <select className={fieldClass} name="employee_id" defaultValue={appointment.employee_id} required>
            <option value="" disabled>Odaberite zaposlenika</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.display_name}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Soba</span>
          <select className={fieldClass} name="room_id" defaultValue={appointment.room_id}>
            <option value="">Bez sobe</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Status</span>
          <select className={fieldClass} name="status" defaultValue={appointment.status}>
            <option value="scheduled">Zakazan</option>
            <option value="confirmed">Potvrđen</option>
            <option value="completed">Odrađen</option>
            <option value="cancelled">Otkazan</option>
            <option value="no_show">Nije došao</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-app-text">
        <span>Napomena</span>
        <textarea className={fieldClass} name="notes" rows={4} defaultValue={appointment.client_note ?? appointment.internal_note ?? ""} />
      </label>

      <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Spremanje..." : "Spremi izmjene"}
      </button>
    </form>
  );
}
