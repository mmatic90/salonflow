"use client";

import {
  CalendarDays,
  CheckCircle2,
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

export type AppointmentOption = {
  id: string;
  label: string;
};

type ClientOption = AppointmentOption & {
  phone: string | null;
  email: string | null;
};

type ServiceOption = AppointmentOption & {
  durationMinutes: number;
};

type Props = {
  defaultDate: string;
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
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<AppointmentOption[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AppointmentOption[]>([]);

  const hasRequiredSetup = employees.length > 0 && services.length > 0;
  const availabilityReady = Boolean(date && startTime && serviceId);

  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLocaleLowerCase("hr");
    if (!query) return clients.slice(0, 8);

    return clients
      .filter((client) => {
        const haystack = [client.label, client.phone ?? "", client.email ?? ""]
          .join(" ")
          .toLocaleLowerCase("hr");
        return haystack.includes(query);
      })
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

  function selectClient(client: ClientOption) {
    setClientId(client.id);
    setClientName(client.label);
    setClientPhone(client.phone ?? "");
    setClientEmail(client.email ?? "");
    setClientSearch(client.label);
    setClientSearchOpen(false);
  }

  function clearSelectedClient() {
    setClientId("");
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setClientSearch("");
    setClientSearchOpen(true);
  }

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
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="client_id" value={clientId} />

      {!hasRequiredSetup ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Prije stvaranja termina dodajte barem jednog aktivnog zaposlenika i jednu aktivnu uslugu u postavkama salona.
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
          title="Termin i usluga"
          description="Odaberite datum, početak i uslugu kako bismo prikazali samo slobodne zaposlenike i sobe."
        />

        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-app-muted" />Datum</span>
            <input className={fieldClass} type="date" name="appointment_date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-app-muted" />Vrijeme početka</span>
            <input className={fieldClass} type="time" name="start_time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
          </label>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-medium text-app-text">
          <span className="flex items-center gap-2"><Shapes className="h-4 w-4 text-app-muted" />Usluga</span>
          <select className={fieldClass} name="service_id" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
            <option value="" disabled>Odaberite uslugu</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.label} · {service.durationMinutes} min</option>)}
          </select>
        </label>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-app-muted" />Slobodan zaposlenik</span>
            <select className={fieldClass} name="employee_id" required value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} disabled={!availabilityReady || availabilityPending}>
              <option value="">{availabilityPending ? "Provjeravamo dostupnost..." : availabilityReady ? "Odaberite zaposlenika" : "Odaberite datum, vrijeme i uslugu"}</option>
              {availableEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.label}</option>)}
            </select>
            {availabilityPending ? (
              <span className="flex items-center gap-2 text-xs text-app-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" />Provjeravamo raspored i postojeće termine.</span>
            ) : availabilityReady && availableEmployees.length > 0 ? (
              <span className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Dostupno: {availableEmployees.length}</span>
            ) : availabilityReady ? (
              <span className="text-xs text-amber-700">Nema slobodnih zaposlenika za odabrani termin.</span>
            ) : null}
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-app-muted" />Slobodna soba <span className="font-normal text-app-muted">(nije obavezna)</span></span>
            <select className={fieldClass} name="room_id" value={roomId} onChange={(event) => setRoomId(event.target.value)} disabled={!availabilityReady || availabilityPending}>
              <option value="">{availabilityPending ? "Provjeravamo dostupnost..." : "Bez sobe"}</option>
              {availableRooms.map((room) => <option key={room.id} value={room.id}>{room.label}</option>)}
            </select>
            {availabilityReady && !availabilityPending && availableRooms.length > 0 ? (
              <span className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Dostupno: {availableRooms.length}</span>
            ) : availabilityReady && !availabilityPending ? (
              <span className="text-xs text-app-muted">Za ovu uslugu i termin nema slobodne povezane sobe.</span>
            ) : null}
          </label>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeader
          icon={<UserRound className="h-5 w-5" />}
          title="Podaci o klijentu"
          description="Pretražite postojećeg klijenta po imenu, prezimenu, telefonu ili e-mailu, ili unesite novog."
        />

        <div className="relative">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2"><Search className="h-4 w-4 text-app-muted" />Pronađi postojećeg klijenta</span>
            <div className="relative">
              <input
                className={`${fieldClass} pr-11`}
                value={clientSearch}
                onFocus={() => setClientSearchOpen(true)}
                onChange={(event) => {
                  setClientSearch(event.target.value);
                  setClientSearchOpen(true);
                  if (clientId) {
                    setClientId("");
                    setClientName(event.target.value);
                    setClientPhone("");
                    setClientEmail("");
                  }
                }}
                placeholder="Upišite ime ili prezime..."
                autoComplete="off"
              />
              {clientSearch ? (
                <button
                  type="button"
                  onClick={clearSelectedClient}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-app-muted transition hover:bg-app-bg hover:text-app-text"
                  aria-label="Očisti odabir klijenta"
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
                onClick={clearSelectedClient}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-app-bg"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-app-text">Novi klijent</p>
                  <p className="text-xs text-app-muted">Unesite podatke u polja ispod</p>
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
                      <p className="truncate text-sm font-medium text-app-text">{client.label}</p>
                      <p className="mt-0.5 truncate text-xs text-app-muted">
                        {[client.phone, client.email].filter(Boolean).join(" · ") || "Nema spremljenih kontaktnih podataka"}
                      </p>
                    </div>
                  </button>
                ))
              ) : clientSearch.trim() ? (
                <p className="px-3 py-4 text-sm text-app-muted">Nema spremljenog klijenta koji odgovara pretrazi.</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {clientId ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Odabran je postojeći klijent. Dopunjeni kontaktni podaci spremit će se u njegov profil.
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>Ime i prezime</span>
            <input className={fieldClass} name="client_name" value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="Primjerice Ana Horvat" required />
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2"><Phone className="h-4 w-4 text-app-muted" />Telefon</span>
            <input className={fieldClass} name="client_phone" type="tel" value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} placeholder="+385 ..." />
          </label>
        </div>

        <label className="mt-5 block space-y-2 text-sm font-medium text-app-text">
          <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-app-muted" />E-mail</span>
          <input className={fieldClass} name="client_email" type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="klijent@email.com" />
        </label>
      </section>

      <section className={sectionClass}>
        <SectionHeader
          icon={<MessageSquareText className="h-5 w-5" />}
          title="Napomena"
          description="Dodajte posebnu želju, važnu informaciju ili internu bilješku."
        />
        <textarea className={fieldClass} name="notes" rows={4} placeholder="Napomena nije obavezna..." />
      </section>

      {availabilityReady && selectedService ? (
        <div className="rounded-2xl border border-app-accent/20 bg-app-accent/5 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
            <div className="min-w-0">
              <p className="font-semibold text-app-text">Sažetak termina</p>
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

      <button type="submit" disabled={pending || availabilityPending || !hasRequiredSetup || !employeeId} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-app-accent px-5 py-4 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none">
        {pending ? <><Loader2 className="h-5 w-5 animate-spin" />Spremanje termina...</> : <><CheckCircle2 className="h-5 w-5" />Spremi termin</>}
      </button>
    </form>
  );
}
