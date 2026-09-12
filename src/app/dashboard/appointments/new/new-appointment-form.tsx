"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  createAppointmentAction,
  type ActionState,
} from "@/features/appointments/actions";
import type {
  AppointmentFormEmployee,
  AppointmentFormEmployeeService,
  AppointmentFormRoom,
  AppointmentFormService,
  AppointmentFormServiceRoom,
} from "@/features/appointments/queries";
import type { ClientComboboxItem } from "@/components/client-combobox";
import ClientCombobox from "@/components/client-combobox";
import { getTodayLocalDate } from "@/lib/utils";
import AppointmentServicesEditor from "@/components/appointment-services-editor";
import { calculateTotalDuration } from "@/features/appointments/calculate-total-duration";
import type { AppointmentServiceInput } from "@/features/appointments/types";
import { addMinutesToTimeString } from "@/features/appointments/time-helpers";

type Props = {
  services: AppointmentFormService[];
  employees: AppointmentFormEmployee[];
  rooms: AppointmentFormRoom[];
  serviceRooms: AppointmentFormServiceRoom[];
  employeeServices: AppointmentFormEmployeeService[];
  clients: ClientComboboxItem[];
  defaultDate: string;
};

function parseServicesJson(raw: string): AppointmentServiceInput[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => ({
        service_id: String(item?.service_id ?? ""),
        duration_minutes: Number(item?.duration_minutes ?? 0),
      }))
      .filter((item) => item.service_id);
  } catch {
    return [];
  }
}

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";

const readonlyFieldClass =
  "w-full rounded-xl border border-app-soft bg-app-card-alt px-4 py-3 text-app-text outline-none";

const messageInfoClass =
  "rounded-xl border border-app-soft bg-app-card-alt px-4 py-3 text-sm text-app-text";

const messageWarnClass =
  "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800";

const messageErrorClass =
  "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";

export default function NewAppointmentForm({
  services,
  employees,
  rooms,
  serviceRooms,
  employeeServices,
  clients,
  defaultDate,
}: Props) {
  const initialState: ActionState = {
    error: "",
    values: {
      appointment_date: defaultDate || getTodayLocalDate(),
      start_time: "",
      client_id: "",
      client_name: "",
      client_phone: "",
      client_email: "",
      service_id: "",
      employee_id: "",
      room_id: "",
      duration_minutes: "",
      status: "scheduled",
      client_note: "",
      internal_note: "",
      services_json: "[]",
    },
  };

  const [state, formAction, pending] = useActionState(
    createAppointmentAction,
    initialState,
  );

  const [selectedDate, setSelectedDate] = useState(
    state.values.appointment_date,
  );
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    state.values.employee_id,
  );
  const [selectedRoomId, setSelectedRoomId] = useState(state.values.room_id);
  const [startTime, setStartTime] = useState(state.values.start_time);

  const [selectedClientId, setSelectedClientId] = useState(
    state.values.client_id || "",
  );
  const [clientName, setClientName] = useState(state.values.client_name);
  const [clientPhone, setClientPhone] = useState(state.values.client_phone);
  const [clientEmail, setClientEmail] = useState(state.values.client_email);
  const [clientNote, setClientNote] = useState(state.values.client_note);
  const [internalNote, setInternalNote] = useState(state.values.internal_note);

  const [serviceItems, setServiceItems] = useState<AppointmentServiceInput[]>([
    {
      service_id: state.values.service_id || "",
      duration_minutes: Number(state.values.duration_minutes || 0),
    },
  ]);
  const [previousActionValues, setPreviousActionValues] = useState(state.values);

  const [workingEmployeeIds, setWorkingEmployeeIds] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");

  if (previousActionValues !== state.values) {
    setPreviousActionValues(state.values);
    setSelectedDate(state.values.appointment_date);
    setSelectedEmployeeId(state.values.employee_id);
    setSelectedRoomId(state.values.room_id);
    setStartTime(state.values.start_time);
    setSelectedClientId(state.values.client_id || "");
    setClientName(state.values.client_name);
    setClientPhone(state.values.client_phone);
    setClientEmail(state.values.client_email);
    setClientNote(state.values.client_note);
    setInternalNote(state.values.internal_note);

    const restoredItems = parseServicesJson(state.values.services_json);
    setServiceItems(
      restoredItems.length > 0
        ? restoredItems
        : [
            {
              service_id: state.values.service_id || "",
              duration_minutes: Number(state.values.duration_minutes || 0),
            },
          ],
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadAvailability() {
      if (!selectedDate) return;

      setAvailabilityLoading(true);
      setAvailabilityError("");

      try {
        const response = await fetch(
          `/api/employee-availability?date=${selectedDate}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Greška pri dohvaćanju dostupnosti.");
        }

        if (!cancelled) {
          setWorkingEmployeeIds(result.workingEmployeeIds ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setWorkingEmployeeIds([]);
          setAvailabilityError(
            error instanceof Error
              ? error.message
              : "Greška pri dohvaćanju dostupnosti.",
          );
        }
      } finally {
        if (!cancelled) {
          setAvailabilityLoading(false);
        }
      }
    }

    loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const allSelectedServiceIds = useMemo(
    () => serviceItems.map((item) => item.service_id).filter(Boolean),
    [serviceItems],
  );

  const primaryServiceId = serviceItems[0]?.service_id || "";

  const totalDuration = useMemo(
    () => calculateTotalDuration(serviceItems),
    [serviceItems],
  );

  const calculatedEndTime = useMemo(() => {
    if (!startTime || totalDuration <= 0) return "";
    return addMinutesToTimeString(startTime, totalDuration);
  }, [startTime, totalDuration]);

  const selectedPrimaryService = useMemo(
    () => services.find((service) => service.id === primaryServiceId) ?? null,
    [services, primaryServiceId],
  );

  const allowedRoomIds = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return new Set<string>();

    const serviceToRooms = new Map<string, Set<string>>();

    for (const item of serviceRooms) {
      if (!serviceToRooms.has(item.service_id)) {
        serviceToRooms.set(item.service_id, new Set<string>());
      }
      serviceToRooms.get(item.service_id)!.add(item.room_id);
    }

    let intersection: Set<string> | null = null;

    for (const serviceId of allSelectedServiceIds) {
      const roomSet: Set<string> =
        serviceToRooms.get(serviceId) ?? new Set<string>();

      if (intersection === null) {
        intersection = new Set<string>(roomSet);
      } else {
        const filtered: string[] = Array.from(intersection).filter(
          (roomId: string) => roomSet.has(roomId),
        );
        intersection = new Set<string>(filtered);
      }
    }

    return intersection ?? new Set<string>();
  }, [allSelectedServiceIds, serviceRooms]);

  const allowedEmployeeIds = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return new Set<string>();

    const serviceToEmployees = new Map<string, Set<string>>();

    for (const item of employeeServices) {
      if (!serviceToEmployees.has(item.service_id)) {
        serviceToEmployees.set(item.service_id, new Set<string>());
      }
      serviceToEmployees.get(item.service_id)!.add(item.employee_id);
    }

    let intersection: Set<string> | null = null;

    for (const serviceId of allSelectedServiceIds) {
      const employeeSet: Set<string> =
        serviceToEmployees.get(serviceId) ?? new Set<string>();

      if (intersection === null) {
        intersection = new Set<string>(employeeSet);
      } else {
        const filtered: string[] = Array.from(intersection).filter(
          (employeeId: string) => employeeSet.has(employeeId),
        );
        intersection = new Set<string>(filtered);
      }
    }

    return intersection ?? new Set<string>();
  }, [allSelectedServiceIds, employeeServices]);

  const workingEmployeeIdSet = useMemo(
    () => new Set(selectedDate ? workingEmployeeIds : []),
    [selectedDate, workingEmployeeIds],
  );

  const filteredRooms = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return rooms;
    return rooms.filter((room) => allowedRoomIds.has(room.id));
  }, [allSelectedServiceIds, rooms, allowedRoomIds]);

  const filteredEmployees = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return [];

    return employees.filter(
      (employee) =>
        allowedEmployeeIds.has(employee.id) &&
        workingEmployeeIdSet.has(employee.id),
    );
  }, [
    allSelectedServiceIds,
    employees,
    allowedEmployeeIds,
    workingEmployeeIdSet,
  ]);

  const effectiveEmployeeId = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return "";
    if (
      selectedEmployeeId &&
      allowedEmployeeIds.has(selectedEmployeeId) &&
      workingEmployeeIdSet.has(selectedEmployeeId)
    ) {
      return selectedEmployeeId;
    }
    return filteredEmployees[0]?.id ?? "";
  }, [
    allSelectedServiceIds,
    selectedEmployeeId,
    allowedEmployeeIds,
    workingEmployeeIdSet,
    filteredEmployees,
  ]);

  const effectiveRoomId = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return "";
    if (
      selectedRoomId &&
      (allowedRoomIds.size === 0 || allowedRoomIds.has(selectedRoomId))
    ) {
      return selectedRoomId;
    }

    const priorityRoomName = selectedPrimaryService?.priority_room?.trim();
    if (priorityRoomName) {
      const priorityRoom = filteredRooms.find(
        (room) => room.name === priorityRoomName,
      );
      if (priorityRoom) return priorityRoom.id;
    }

    return filteredRooms[0]?.id ?? "";
  }, [
    allSelectedServiceIds,
    selectedRoomId,
    allowedRoomIds,
    selectedPrimaryService,
    filteredRooms,
  ]);

  const serviceChangeNotice = useMemo(() => {
    if (allSelectedServiceIds.length === 0) return "";

    const notices: string[] = [];

    if (effectiveEmployeeId && effectiveEmployeeId !== selectedEmployeeId) {
      const employeeName =
        filteredEmployees.find((employee) => employee.id === effectiveEmployeeId)
          ?.display_name ?? "odabranog zaposlenika";
      notices.push(`Zaposlenik je automatski postavljen na "${employeeName}".`);
    }

    if (effectiveRoomId && effectiveRoomId !== selectedRoomId) {
      const roomName =
        filteredRooms.find((room) => room.id === effectiveRoomId)?.name ??
        "odabranu sobu";
      notices.push(`Soba je automatski postavljena na "${roomName}".`);
    }

    return notices.join(" ");
  }, [
    allSelectedServiceIds,
    effectiveEmployeeId,
    selectedEmployeeId,
    filteredEmployees,
    effectiveRoomId,
    selectedRoomId,
    filteredRooms,
  ]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="client_id" value={selectedClientId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="appointment_date"
            className="block text-sm font-medium text-app-text"
          >
            Datum
          </label>
          <input
            id="appointment_date"
            name="appointment_date"
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setWorkingEmployeeIds([]);
              setAvailabilityError("");
            }}
            className={fieldClass}
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="start_time"
            className="block text-sm font-medium text-app-text"
          >
            Vrijeme početka
          </label>
          <input
            id="start_time"
            name="start_time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={fieldClass}
            required
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-app-text">
          Klijent
        </label>
        <ClientCombobox
          clients={clients}
          selectedClientId={selectedClientId}
          clientName={clientName}
          onSelectClient={(client) => {
            setSelectedClientId(client.id);
            setClientName(client.full_name);
            setClientPhone(client.phone ?? "");
            setClientEmail(client.email ?? "");
            setClientNote(client.note ?? "");
            setInternalNote(client.internal_note ?? "");
          }}
          onUseTypedAsNew={(typedValue) => {
            setSelectedClientId("");
            setClientName(typedValue);
          }}
          onClearSelection={() => {
            setSelectedClientId("");
          }}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label
            htmlFor="client_name"
            className="block text-sm font-medium text-app-text"
          >
            Ime klijenta
          </label>
          <input
            id="client_name"
            name="client_name"
            type="text"
            value={clientName}
            onChange={(e) => {
              setSelectedClientId("");
              setClientName(e.target.value);
            }}
            className={fieldClass}
            required
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="client_phone"
            className="block text-sm font-medium text-app-text"
          >
            Telefon
          </label>
          <input
            id="client_phone"
            name="client_phone"
            type="text"
            value={clientPhone}
            onChange={(e) => setClientPhone(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="client_email"
          className="block text-sm font-medium text-app-text"
        >
          Email
        </label>
        <input
          id="client_email"
          name="client_email"
          type="email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-4 md:p-5">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-app-text">
            Usluge
          </label>
          <AppointmentServicesEditor
            services={services}
            items={serviceItems}
            onChange={setServiceItems}
          />

          {selectedPrimaryService?.service_group ? (
            <p className="mt-2 text-sm text-app-muted">
              Primarna grupa: {selectedPrimaryService.service_group}
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="employee_id"
              className="block text-sm font-medium text-app-text"
            >
              Zaposlenik
            </label>
            <select
              id="employee_id"
              name="employee_id"
              value={effectiveEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className={fieldClass}
              required
              disabled={
                allSelectedServiceIds.length === 0 || availabilityLoading
              }
            >
              <option value="">
                {allSelectedServiceIds.length === 0
                  ? "Prvo odaberi usluge"
                  : availabilityLoading
                    ? "Učitavanje dostupnosti..."
                    : filteredEmployees.length === 0
                      ? "Nema dostupnih zaposlenika"
                      : "Odaberi zaposlenika"}
              </option>
              {filteredEmployees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.display_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label
              htmlFor="room_id"
              className="block text-sm font-medium text-app-text"
            >
              Soba
            </label>
            <select
              id="room_id"
              name="room_id"
              value={effectiveRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className={fieldClass}
              required
              disabled={allSelectedServiceIds.length === 0}
            >
              <option value="">
                {allSelectedServiceIds.length > 0
                  ? "Odaberi sobu"
                  : "Prvo odaberi usluge"}
              </option>
              {filteredRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>

            {selectedPrimaryService?.priority_room ? (
              <p className="mt-2 text-sm text-app-muted">
                Prioritetna soba primarne usluge:{" "}
                {selectedPrimaryService.priority_room}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {availabilityError ? (
        <div className={messageErrorClass}>{availabilityError}</div>
      ) : null}

      {allSelectedServiceIds.length > 0 &&
      !availabilityLoading &&
      filteredEmployees.length === 0 ? (
        <div className={messageWarnClass}>
          Nema zaposlenika koji mogu raditi sve odabrane usluge na odabrani
          datum.
        </div>
      ) : null}

      {serviceChangeNotice ? (
        <div className={messageInfoClass}>{serviceChangeNotice}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label
            htmlFor="duration_minutes"
            className="block text-sm font-medium text-app-text"
          >
            Ukupno trajanje (minute)
          </label>
          <input
            id="duration_minutes"
            name="duration_minutes"
            type="number"
            min={1}
            value={totalDuration}
            readOnly
            className={readonlyFieldClass}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-app-text">
            Završava u
          </label>
          <input
            type="time"
            value={calculatedEndTime}
            readOnly
            className={readonlyFieldClass}
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="status"
            className="block text-sm font-medium text-app-text"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={state.values.status}
            className={fieldClass}
          >
            <option value="scheduled">Zakazan</option>
            <option value="completed">Odrađen</option>
            <option value="cancelled">Otkazan</option>
            <option value="no_show">Nije došao</option>
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="client_note"
          className="block text-sm font-medium text-app-text"
        >
          Napomena za klijenta
        </label>
        <textarea
          id="client_note"
          name="client_note"
          rows={3}
          value={clientNote}
          onChange={(e) => setClientNote(e.target.value)}
          className={fieldClass}
        />
      </div>

      <div className="space-y-1">
        <label
          htmlFor="internal_note"
          className="block text-sm font-medium text-app-text"
        >
          Interna napomena
        </label>
        <textarea
          id="internal_note"
          name="internal_note"
          rows={3}
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          className={fieldClass}
        />
      </div>

      {state.error ? (
        <div className={messageErrorClass}>{state.error}</div>
      ) : null}

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={
            pending ||
            availabilityLoading ||
            filteredEmployees.length === 0 ||
            allSelectedServiceIds.length === 0 ||
            totalDuration <= 0
          }
          className="rounded-xl bg-app-accent px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Spremanje..." : "Spremi termin"}
        </button>
      </div>

      <input
        type="hidden"
        name="services_json"
        value={JSON.stringify(serviceItems)}
      />
      <input
        type="hidden"
        name="duration_minutes"
        value={String(totalDuration)}
      />
      <input type="hidden" name="service_id" value={primaryServiceId} />
    </form>
  );
}
