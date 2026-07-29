"use client";

import { useEffect, useState, type FormEvent } from "react";

export type AppointmentOption = {
  id: string;
  label: string;
};

type ServiceOption = AppointmentOption & {
  durationMinutes: number;
};

type Props = {
  defaultDate: string;
  clients: AppointmentOption[];
  employees: AppointmentOption[];
  rooms: AppointmentOption[];
  services: ServiceOption[];
};

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";

export default function MultiTenantAppointmentForm({
  defaultDate,
  clients,
  employees,
  rooms,
  services,
}: Props) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [availableEmployees, setAvailableEmployees] = useState<AppointmentOption[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AppointmentOption[]>([]);
  const hasRequiredSetup = employees.length > 0 && services.length > 0;
  const availabilityReady = Boolean(date && startTime && serviceId);

  useEffect(() => {
    if (!availabilityReady) {
      setAvailableEmployees([]);
      setAvailableRooms([]);
      setEmployeeId("");
      setRoomId("");
      return;
    }

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
          throw new Error(result.error || "Dostupnost nije moguće provjeriti.");
        }

        const nextEmployees = result.employees ?? [];
        const nextRooms = result.rooms ?? [];
        setAvailableEmployees(nextEmployees);
        setAvailableRooms(nextRooms);
        setEmployeeId((current) =>
          nextEmployees.some((employee) => employee.id === current) ? current : "",
        );
        setRoomId((current) =>
          nextRooms.some((room) => room.id === current) ? current : "",
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
            : "Dostupnost nije moguće provjeriti.",
        );
      } finally {
        if (!controller.signal.aborted) setAvailabilityPending(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [availabilityReady, date, startTime, serviceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(result.error || "Termin nije moguće spremiti.");
        return;
      }
      window.location.href = result.redirectTo || "/dashboard/appointments";
    } catch (requestError) {
      console.error(requestError);
      setError("Dogodila se mrežna greška. Pokušajte ponovno.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!hasRequiredSetup ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Prije stvaranja termina dodajte barem jednog aktivnog zaposlenika i jednu aktivnu uslugu u postavkama salona.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Datum</span>
          <input className={fieldClass} type="date" name="appointment_date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Vrijeme početka</span>
          <input className={fieldClass} type="time" name="start_time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Postojeći klijent</span>
          <select className={fieldClass} name="client_id" defaultValue="">
            <option value="">Novi klijent</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.label}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Ime klijenta</span>
          <input className={fieldClass} name="client_name" required />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Telefon</span>
          <input className={fieldClass} name="client_phone" type="tel" />
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>E-mail</span>
          <input className={fieldClass} name="client_email" type="email" />
        </label>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Usluga</span>
          <select className={fieldClass} name="service_id" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="" disabled>Odaberite uslugu</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.label} · {service.durationMinutes} min</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium text-app-text">
          <span>Zaposlenik</span>
          <select className={fieldClass} name="employee_id" required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={!availabilityReady || availabilityPending}>
            <option value="">{availabilityPending ? "Provjera dostupnosti..." : availabilityReady ? "Odaberite slobodnog zaposlenika" : "Najprije odaberite datum, vrijeme i uslugu"}</option>
            {availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}
          </select>
          {availabilityReady && !availabilityPending && availableEmployees.length === 0 ? <span className="block text-xs text-amber-700">Nema slobodnih zaposlenika za odabrani termin.</span> : null}
        </label>
      </div>

      <label className="block space-y-2 text-sm font-medium text-app-text">
        <span>Soba (nije obavezna)</span>
        <select className={fieldClass} name="room_id" value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={!availabilityReady || availabilityPending}>
          <option value="">{availabilityPending ? "Provjera dostupnosti..." : "Bez sobe"}</option>
          {availableRooms.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
        </select>
        {availabilityReady && !availabilityPending && availableRooms.length === 0 ? <span className="block text-xs text-app-muted">Za ovu uslugu i termin nema slobodne povezane sobe.</span> : null}
      </label>

      <label className="block space-y-2 text-sm font-medium text-app-text">
        <span>Napomena</span>
        <textarea className={fieldClass} name="notes" rows={4} />
      </label>

      <button type="submit" disabled={pending || availabilityPending || !hasRequiredSetup || !employeeId} className="inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Spremanje..." : "Spremi termin"}
      </button>
    </form>
  );
}
