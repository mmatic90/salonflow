import { createClient } from "@/lib/supabase/server";
import {
  canUseCapability,
  getCurrentUserPermissions,
} from "@/lib/permissions";
import { getTodayLocalDate } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n";

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type RawEmployeeRelation = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type RawRoomRelation = {
  id: string;
  name: string | null;
};

type RawServiceRelation = {
  id: string;
  name: string | null;
  category: string | null;
};

type RawAppointmentService = {
  id: string;
  service_id: string | null;
  service_name: string | null;
  duration_minutes: number | null;
  sort_order: number | null;
  service: RawServiceRelation | RawServiceRelation[] | null;
};

type RawClientAppointment = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  internal_notes: string | null;
  appointment_services: RawAppointmentService[] | null;
  employee: RawEmployeeRelation | RawEmployeeRelation[] | null;
  room: RawRoomRelation | RawRoomRelation[] | null;
};

type ClientAlertSignal =
  | { code: "no_show_risk"; count: number; rate: number }
  | { code: "frequent_cancellations"; count: number; rate: number }
  | { code: "inactive"; days: number }
  | { code: "favorite_service"; service: string };

export type ClientListItem = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  internal_note: string | null;
  appointments_count: number;
  last_appointment: string | null;
  next_appointment: string | null;
};

export type ClientAppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  internal_note: string | null;
  appointment_services?: {
    id: string;
    service_id: string;
    duration_minutes: number;
    sort_order: number;
    service: {
      id: string;
      name: string;
      service_group: string | null;
    } | null;
  }[];
  employee: { id: string; display_name: string } | null;
  room: { id: string; name: string } | null;
};

export type ClientBasicStats = {
  completed_appointments: number;
  last_completed_appointment: string | null;
};

export type ClientCrmInsights = {
  favorite_service: string | null;
  favorite_employee: string | null;
  average_days_between_visits: number | null;
  segment: "new" | "active" | "regular" | "at_risk" | "lost";
  alerts: string[];
};

export type ClientAttendanceInsights = {
  cancelled_appointments: number;
  no_show_appointments: number;
  no_show_rate: number;
  cancellation_rate: number;
};

export type ClientDetails = ClientListItem & {
  pastAppointments: ClientAppointmentRow[];
  upcomingAppointments: ClientAppointmentRow[];
  basic_stats: ClientBasicStats;
  crm_insights: ClientCrmInsights | null;
  attendance_insights: ClientAttendanceInsights | null;
};

function fullName(firstName: string | null, lastName: string | null) {
  return (
    [firstName, lastName].filter(Boolean).join(" ").trim() || "Klijent bez imena"
  );
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function daysBetween(dateA: string, dateB: string) {
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
}

function isResolvedStatus(status: AppointmentStatus) {
  return ["completed", "cancelled", "no_show"].includes(status);
}

function isActiveStatus(status: AppointmentStatus) {
  return status === "scheduled" || status === "confirmed";
}

function getClientSegment(args: {
  completed: number;
  cancelled: number;
  noShow: number;
  lastCompleted: string | null;
  today: string;
}) {
  // Attendance risk must win over the "new" label. A client with one completed
  // visit but repeated no-shows/cancellations is operationally at risk.
  if (args.cancelled + args.noShow >= 2) return "at_risk" as const;
  if (args.completed <= 1) return "new" as const;
  if (!args.lastCompleted) return "lost" as const;

  const days = daysBetween(args.lastCompleted, args.today);
  if (args.completed >= 4 && days <= 90) return "regular" as const;
  if (days <= 60) return "active" as const;
  return "lost" as const;
}

function localizeClientAlerts(locale: AppLocale, signals: ClientAlertSignal[]) {
  return signals.map((signal) => {
    if (signal.code === "no_show_risk") {
      if (locale === "en") return "Elevated no-show risk.";
      if (locale === "it") return "Rischio elevato di no-show.";
      return "Povišen no-show rizik.";
    }

    if (signal.code === "frequent_cancellations") {
      if (locale === "en") return "The client frequently cancels appointments.";
      if (locale === "it") return "Il cliente annulla spesso gli appuntamenti.";
      return "Klijent često otkazuje termine.";
    }

    if (signal.code === "inactive") {
      if (locale === "en") return `The client has not visited for ${signal.days} days.`;
      if (locale === "it") return `Il cliente non viene da ${signal.days} giorni.`;
      return `Klijent nije bio ${signal.days} dana.`;
    }

    if (locale === "en") return `Most frequently booked: ${signal.service}.`;
    if (locale === "it") return `Servizio prenotato più spesso: ${signal.service}.`;
    return `Najčešće rezervira: ${signal.service}.`;
  });
}

export async function getClientsList(
  search?: string,
): Promise<ClientListItem[]> {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return [];

  const supabase = await createClient();
  let clientsQuery = supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes")
    .eq("organization_id", permissions.organizationId)
    .eq("is_active", true);

  if (search?.trim()) {
    const q = search.trim().replace(/[(),]/g, " ");
    clientsQuery = clientsQuery.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`,
    );
  }

  const { data: clients, error: clientsError } = await clientsQuery
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (clientsError) {
    console.error("getClientsList clients query failed:", clientsError.message);
    throw new Error("Nije moguće dohvatiti klijente.");
  }

  const clientIds = (clients ?? []).map((client) => client.id);
  if (clientIds.length === 0) return [];

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("client_id, appointment_date, status")
    .eq("organization_id", permissions.organizationId)
    .in("client_id", clientIds);

  if (appointmentsError) {
    console.error(
      "getClientsList appointments summary failed:",
      appointmentsError.message,
    );
    throw new Error("Nije moguće dohvatiti termine klijenata.");
  }

  const today = getTodayLocalDate();
  const appointmentsByClient = new Map<
    string,
    Array<{ appointment_date: string; status: AppointmentStatus }>
  >();

  for (const appointment of appointments ?? []) {
    if (!appointment.client_id || !appointment.appointment_date) continue;
    const current = appointmentsByClient.get(appointment.client_id) ?? [];
    current.push({
      appointment_date: appointment.appointment_date,
      status: appointment.status as AppointmentStatus,
    });
    appointmentsByClient.set(appointment.client_id, current);
  }

  return (clients ?? []).map((client) => {
    const clientAppointments = appointmentsByClient.get(client.id) ?? [];
    const past = clientAppointments
      .filter(
        (item) =>
          item.appointment_date < today || isResolvedStatus(item.status),
      )
      .map((item) => item.appointment_date)
      .sort()
      .reverse();
    const future = clientAppointments
      .filter(
        (item) =>
          item.appointment_date >= today && isActiveStatus(item.status),
      )
      .map((item) => item.appointment_date)
      .sort();

    return {
      id: client.id,
      full_name: fullName(client.first_name, client.last_name),
      phone: client.phone,
      email: client.email,
      note: client.notes,
      internal_note: null,
      appointments_count: clientAppointments.length,
      last_appointment: past[0] ?? null,
      next_appointment: future[0] ?? null,
    };
  });
}

export async function getClientById(id: string): Promise<ClientDetails | null> {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return null;

  const canUseCrmInsights = canUseCapability(permissions, "crm_insights");
  const canUseAttendanceInsights = canUseCapability(
    permissions,
    "attendance_insights",
  );
  const needsBehaviorAnalysis = canUseCrmInsights || canUseAttendanceInsights;

  const supabase = await createClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes, is_active")
    .eq("organization_id", permissions.organizationId)
    .eq("id", id)
    .maybeSingle();

  if (clientError) {
    console.error("getClientById client query failed:", clientError.message);
    throw new Error("Nije moguće dohvatiti klijenta.");
  }
  if (!client) return null;

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select(`
      id,
      appointment_date,
      start_time,
      end_time,
      status,
      client_name,
      client_phone,
      client_email,
      internal_notes,
      appointment_services (
        id,
        service_id,
        service_name,
        duration_minutes,
        sort_order,
        service:services (
          id,
          name,
          category
        )
      ),
      employee:employees (
        id,
        first_name,
        last_name
      ),
      room:rooms (
        id,
        name
      )
    `)
    .eq("organization_id", permissions.organizationId)
    .eq("client_id", id)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (appointmentsError) {
    console.error("getClientById appointments query failed:", {
      message: appointmentsError.message,
      details: appointmentsError.details,
      hint: appointmentsError.hint,
      code: appointmentsError.code,
    });
    throw new Error("Nije moguće dohvatiti detalje klijenta.");
  }

  const rows: ClientAppointmentRow[] = (
    (appointments ?? []) as RawClientAppointment[]
  ).map((item) => {
    const employee = getSingleRelation(item.employee);
    const room = getSingleRelation(item.room);

    return {
      id: String(item.id),
      appointment_date: String(item.appointment_date),
      start_time: String(item.start_time),
      end_time: String(item.end_time),
      status: item.status,
      client_name: String(item.client_name ?? ""),
      client_phone: item.client_phone ?? null,
      client_email: item.client_email ?? null,
      internal_note: item.internal_notes ?? null,
      appointment_services: Array.isArray(item.appointment_services)
        ? item.appointment_services.map((entry) => {
            const service = getSingleRelation(entry.service);
            return {
              id: String(entry.id),
              service_id: String(entry.service_id ?? ""),
              duration_minutes: Number(entry.duration_minutes ?? 0),
              sort_order: Number(entry.sort_order ?? 0),
              service: {
                id: String(service?.id ?? entry.service_id ?? ""),
                name: String(service?.name ?? entry.service_name ?? "Usluga"),
                service_group: service?.category ?? null,
              },
            };
          })
        : [],
      employee: employee
        ? {
            id: String(employee.id),
            display_name: fullName(employee.first_name, employee.last_name),
          }
        : null,
      room: room
        ? { id: String(room.id), name: String(room.name ?? "") }
        : null,
    };
  });

  const today = getTodayLocalDate();
  const pastAppointments = rows.filter(
    (item) => item.appointment_date < today || isResolvedStatus(item.status),
  );
  const upcomingAppointments = rows
    .filter(
      (item) =>
        item.appointment_date >= today && isActiveStatus(item.status),
    )
    .sort((a, b) =>
      `${a.appointment_date}${a.start_time}`.localeCompare(
        `${b.appointment_date}${b.start_time}`,
      ),
    );

  const completed = rows.filter((item) => item.status === "completed");
  const completedDates = [
    ...new Set(completed.map((item) => item.appointment_date)),
  ].sort();
  const lastCompleted = completedDates.at(-1) ?? null;

  let crmInsights: ClientCrmInsights | null = null;
  let attendanceInsights: ClientAttendanceInsights | null = null;

  if (needsBehaviorAnalysis) {
    const cancelled = rows.filter((item) => item.status === "cancelled");
    const noShow = rows.filter((item) => item.status === "no_show");
    const resolvedAppointments = rows.filter((item) => isResolvedStatus(item.status));
    const resolvedCount = resolvedAppointments.length;
    const noShowRate = resolvedCount
      ? Math.round((noShow.length / resolvedCount) * 100)
      : 0;
    const cancellationRate = resolvedCount
      ? Math.round((cancelled.length / resolvedCount) * 100)
      : 0;

    if (canUseAttendanceInsights) {
      attendanceInsights = {
        cancelled_appointments: cancelled.length,
        no_show_appointments: noShow.length,
        no_show_rate: noShowRate,
        cancellation_rate: cancellationRate,
      };
    }

    if (canUseCrmInsights) {
      let averageDaysBetweenVisits: number | null = null;
      if (completedDates.length > 1) {
        const gaps = completedDates
          .slice(1)
          .map((date, index) => daysBetween(completedDates[index], date));
        averageDaysBetweenVisits = Math.round(
          gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length,
        );
      }

      const serviceCounts = new Map<string, number>();
      const employeeCounts = new Map<string, number>();

      // Preferences should describe treatments the client actually received, not
      // cancelled/no-show appointments or future bookings.
      for (const appointment of completed) {
        for (const entry of appointment.appointment_services ?? []) {
          const name = entry.service?.name;
          if (name) serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
        }

        if (appointment.employee?.display_name) {
          const name = appointment.employee.display_name;
          employeeCounts.set(name, (employeeCounts.get(name) ?? 0) + 1);
        }
      }

      const favoriteService =
        [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const favoriteEmployee =
        [...employeeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const alertSignals: ClientAlertSignal[] = [];
      if (noShow.length >= 2 || (resolvedCount >= 2 && noShowRate >= 25)) {
        alertSignals.push({
          code: "no_show_risk",
          count: noShow.length,
          rate: noShowRate,
        });
      }
      if (
        cancelled.length >= 2 ||
        (resolvedCount >= 2 && cancellationRate >= 25)
      ) {
        alertSignals.push({
          code: "frequent_cancellations",
          count: cancelled.length,
          rate: cancellationRate,
        });
      }
      if (lastCompleted) {
        const inactiveDays = daysBetween(lastCompleted, today);
        if (inactiveDays > 120) {
          alertSignals.push({ code: "inactive", days: inactiveDays });
        }
      }
      if (favoriteService) {
        alertSignals.push({
          code: "favorite_service",
          service: favoriteService,
        });
      }

      crmInsights = {
        favorite_service: favoriteService,
        favorite_employee: favoriteEmployee,
        average_days_between_visits: averageDaysBetweenVisits,
        segment: getClientSegment({
          completed: completed.length,
          cancelled: cancelled.length,
          noShow: noShow.length,
          lastCompleted,
          today,
        }),
        alerts: localizeClientAlerts(
          permissions.organizationLocale,
          alertSignals,
        ),
      };
    }
  }

  return {
    id: client.id,
    full_name: fullName(client.first_name, client.last_name),
    phone: client.phone,
    email: client.email,
    note: client.notes,
    internal_note: null,
    appointments_count: rows.length,
    last_appointment: pastAppointments[0]?.appointment_date ?? null,
    next_appointment: upcomingAppointments[0]?.appointment_date ?? null,
    pastAppointments,
    upcomingAppointments,
    basic_stats: {
      completed_appointments: completed.length,
      last_completed_appointment: lastCompleted,
    },
    crm_insights: crmInsights,
    attendance_insights: attendanceInsights,
  };
}

export async function getClientOptions() {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes")
    .eq("organization_id", permissions.organizationId)
    .eq("is_active", true)
    .order("first_name", { ascending: true })
    .order("last_name", { ascending: true });

  if (error) throw new Error("Nije moguće dohvatiti klijente.");

  return (data ?? []).map((client) => ({
    id: client.id,
    full_name: fullName(client.first_name, client.last_name),
    phone: client.phone,
    email: client.email,
    note: client.notes,
    internal_note: null,
  }));
}
