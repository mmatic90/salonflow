"use client";

import Link from "next/link";
import {
  CalendarCheck2,
  CalendarClock,
  ChevronDown,
  DoorOpen,
  Loader2,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppointmentTimeSelect from "@/components/appointment-time-select";
import type { AppLocale } from "@/lib/i18n";
import type { WaitlistSlotMatch } from "@/features/waitlist/slot-matching";

type Option = { id: string; label: string };

type Props = {
  locale: AppLocale;
  services: Option[];
  defaultDate: string;
};

type AvailabilityIssue =
  | "salon_closed"
  | "outside_salon_hours"
  | "no_employee_for_service"
  | "no_employee_available"
  | "no_room_for_service"
  | "no_room_available";

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-4 focus:ring-app-accent/10 disabled:cursor-not-allowed disabled:bg-app-bg disabled:text-app-muted";

function ui(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Fill an open slot",
      help: "Choose a newly available slot and find waiting clients whose preferences match it.",
      date: "Date",
      time: "Start time",
      service: "Service",
      chooseService: "Choose a service",
      employee: "Employee",
      room: "Room",
      chooseEmployee: "Choose an available employee",
      chooseRoom: "Choose an available room",
      checking: "Checking availability...",
      find: "Find matching clients",
      finding: "Searching waitlist...",
      matches: "Matching waiting clients",
      none: "No waiting client matches this slot.",
      book: "Book this client",
      waitingSince: "Waiting since",
      preferredEmployee: "Preferred employee",
      error: "The waitlist could not be checked.",
      unavailable: "This slot is not available with the selected setup.",
      contactMissing: "No contact details",
    };
  }

  if (locale === "it") {
    return {
      title: "Riempi un orario libero",
      help: "Scegli un orario appena liberato e trova i clienti in attesa compatibili con le loro preferenze.",
      date: "Data",
      time: "Ora di inizio",
      service: "Servizio",
      chooseService: "Scegli un servizio",
      employee: "Operatore",
      room: "Cabina",
      chooseEmployee: "Scegli un operatore disponibile",
      chooseRoom: "Scegli una cabina disponibile",
      checking: "Controllo disponibilità...",
      find: "Trova clienti compatibili",
      finding: "Ricerca nella lista...",
      matches: "Clienti in attesa compatibili",
      none: "Nessun cliente in attesa è compatibile con questo orario.",
      book: "Prenota questo cliente",
      waitingSince: "In attesa dal",
      preferredEmployee: "Operatore preferito",
      error: "Impossibile controllare la lista d'attesa.",
      unavailable: "Questo orario non è disponibile con la configurazione selezionata.",
      contactMissing: "Nessun contatto",
    };
  }

  return {
    title: "Popuni slobodan termin",
    help: "Odaberi termin koji se oslobodio i pronađi klijente s liste čekanja kojima odgovara.",
    date: "Datum",
    time: "Vrijeme početka",
    service: "Usluga",
    chooseService: "Odaberi uslugu",
    employee: "Djelatnik",
    room: "Soba",
    chooseEmployee: "Odaberi dostupnog djelatnika",
    chooseRoom: "Odaberi dostupnu sobu",
    checking: "Provjeravam dostupnost...",
    find: "Pronađi odgovarajuće klijente",
    finding: "Pretražujem listu čekanja...",
    matches: "Odgovarajući klijenti na čekanju",
    none: "Nijedan klijent na čekanju ne odgovara ovom terminu.",
    book: "Rezerviraj za ovog klijenta",
    waitingSince: "Na čekanju od",
    preferredEmployee: "Željeni djelatnik",
    error: "Nije moguće provjeriti listu čekanja.",
    unavailable: "Ovaj termin nije dostupan s odabranim postavkama.",
    contactMissing: "Nema kontakt podataka",
  };
}

function localeCode(locale: AppLocale) {
  return locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
}

function formatCreated(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(localeCode(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function bookingHref(args: {
  match: WaitlistSlotMatch;
  date: string;
  startTime: string;
  serviceId: string;
  employeeId: string;
  roomId: string;
}) {
  const params = new URLSearchParams({
    waitlistId: args.match.entry_id,
    clientId: args.match.client_id,
    serviceId: args.serviceId,
    date: args.date,
    startTime: args.startTime,
    employeeId: args.employeeId,
    roomId: args.roomId,
  });
  return `/dashboard/appointments/new?${params.toString()}`;
}

export default function WaitlistSlotMatcher({
  locale,
  services,
  defaultDate,
}: Props) {
  const t = ui(locale);
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [employees, setEmployees] = useState<Option[]>([]);
  const [rooms, setRooms] = useState<Option[]>([]);
  const [availabilityPending, setAvailabilityPending] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [generalIssue, setGeneralIssue] = useState<AvailabilityIssue | null>(null);
  const [employeeIssue, setEmployeeIssue] = useState<AvailabilityIssue | null>(null);
  const [roomIssue, setRoomIssue] = useState<AvailabilityIssue | null>(null);
  const [matches, setMatches] = useState<WaitlistSlotMatch[]>([]);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [matchesPending, setMatchesPending] = useState(false);
  const [matchError, setMatchError] = useState("");

  const availabilityReady = Boolean(date && startTime && serviceId);
  const hasAvailabilityIssue = Boolean(
    generalIssue || employeeIssue || roomIssue || availabilityError,
  );
  const canSearch = Boolean(
    availabilityReady &&
      !availabilityPending &&
      !hasAvailabilityIssue &&
      employeeId &&
      roomId,
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [serviceId, services],
  );

  function resetMatches() {
    setMatches([]);
    setMatchesLoaded(false);
    setMatchError("");
  }

  useEffect(() => {
    resetMatches();
    setEmployeeId("");
    setRoomId("");
    setEmployees([]);
    setRooms([]);
    setGeneralIssue(null);
    setEmployeeIssue(null);
    setRoomIssue(null);
    setAvailabilityError("");

    if (!availabilityReady) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailabilityPending(true);
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
          employees?: Option[];
          rooms?: Option[];
          general_issue?: AvailabilityIssue | null;
          employee_issue?: AvailabilityIssue | null;
          room_issue?: AvailabilityIssue | null;
        };

        if (!response.ok) throw new Error(result.error || t.unavailable);

        const nextEmployees = result.employees ?? [];
        const nextRooms = result.rooms ?? [];
        setEmployees(nextEmployees);
        setRooms(nextRooms);
        setGeneralIssue(result.general_issue ?? null);
        setEmployeeIssue(result.employee_issue ?? null);
        setRoomIssue(result.room_issue ?? null);
        setEmployeeId(nextEmployees.length === 1 ? nextEmployees[0].id : "");
        setRoomId(nextRooms.length === 1 ? nextRooms[0].id : "");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailabilityError(error instanceof Error ? error.message : t.unavailable);
      } finally {
        if (!controller.signal.aborted) setAvailabilityPending(false);
      }
    }, 200);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [availabilityReady, date, serviceId, startTime, t.unavailable]);

  async function findMatches() {
    if (!canSearch) return;
    setMatchesPending(true);
    setMatchesLoaded(false);
    setMatches([]);
    setMatchError("");

    try {
      const params = new URLSearchParams({
        date,
        start_time: startTime,
        service_id: serviceId,
        employee_id: employeeId,
        room_id: roomId,
      });
      const response = await fetch(`/api/waitlist/slot-matches?${params}`);
      const result = (await response.json()) as {
        error?: string;
        matches?: WaitlistSlotMatch[];
      };

      if (!response.ok) throw new Error(result.error || t.error);
      setMatches(result.matches ?? []);
      setMatchesLoaded(true);
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : t.error);
      setMatchesLoaded(true);
    } finally {
      setMatchesPending(false);
    }
  }

  return (
    <details className="group rounded-3xl border border-app-accent/20 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
            <CalendarClock className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold text-app-text">{t.title}</p>
            <p className="mt-1 text-sm leading-5 text-app-muted">{t.help}</p>
          </div>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-app-muted transition group-open:rotate-180" />
      </summary>

      <div className="border-t border-app-soft p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.date}</span>
            <input
              type="date"
              min={defaultDate}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.time}</span>
            <AppointmentTimeSelect
              locale={locale}
              value={startTime}
              onChange={setStartTime}
              startHour={5}
              endHour={23}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.service}</span>
            <select
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className={fieldClass}
            >
              <option value="">{t.chooseService}</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-app-muted" /> {t.employee}
            </span>
            <select
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                resetMatches();
              }}
              disabled={!availabilityReady || availabilityPending || employees.length === 0}
              className={fieldClass}
            >
              <option value="">
                {availabilityPending ? t.checking : t.chooseEmployee}
              </option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-app-text">
            <span className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-app-muted" /> {t.room}
            </span>
            <select
              value={roomId}
              onChange={(event) => {
                setRoomId(event.target.value);
                resetMatches();
              }}
              disabled={!availabilityReady || availabilityPending || rooms.length === 0}
              className={fieldClass}
            >
              <option value="">
                {availabilityPending ? t.checking : t.chooseRoom}
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {availabilityPending ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-app-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> {t.checking}
          </p>
        ) : hasAvailabilityIssue ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {availabilityError || t.unavailable}
          </p>
        ) : availabilityReady && employees.length > 0 && rooms.length > 0 ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
            <Sparkles className="h-4 w-4" />
            {selectedService?.label ?? t.service} · {employees.length} {t.employee.toLocaleLowerCase(locale)} · {rooms.length} {t.room.toLocaleLowerCase(locale)}
          </p>
        ) : null}

        <button
          type="button"
          onClick={findMatches}
          disabled={!canSearch || matchesPending}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {matchesPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {matchesPending ? t.finding : t.find}
        </button>

        {matchError ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {matchError}
          </p>
        ) : matchesLoaded && matches.length === 0 ? (
          <p className="mt-4 rounded-xl bg-app-bg px-4 py-3 text-sm text-app-muted">
            {t.none}
          </p>
        ) : matches.length > 0 ? (
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
              <Sparkles className="h-4 w-4 text-app-accent" /> {t.matches}
            </div>
            {matches.map((match) => (
              <article
                key={match.entry_id}
                className="rounded-2xl border border-app-soft bg-app-bg/45 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <UserRound className="h-4 w-4 shrink-0 text-app-accent" />
                      <p className="truncate font-bold text-app-text">
                        {match.client_name}
                      </p>
                      {match.preferred_employee ? (
                        <span className="shrink-0 rounded-full bg-app-accent/10 px-2 py-0.5 text-[11px] font-semibold text-app-accent">
                          {t.preferredEmployee}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-app-muted">
                      {[match.phone, match.email].filter(Boolean).join(" · ") || t.contactMissing}
                    </p>
                    <p className="mt-1 text-xs text-app-muted">
                      {t.waitingSince} {formatCreated(match.created_at, locale)}
                    </p>
                    {match.notes ? (
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-app-muted">
                        {match.notes}
                      </p>
                    ) : null}
                  </div>

                  <Link
                    href={bookingHref({
                      match,
                      date,
                      startTime,
                      serviceId,
                      employeeId,
                      roomId,
                    })}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <CalendarCheck2 className="h-4 w-4" /> {t.book}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}
