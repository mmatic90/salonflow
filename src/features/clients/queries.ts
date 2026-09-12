import { createClient } from "@/lib/supabase/server";

type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

type RawEmployeeRelation = {
  id: string;
  display_name: string | null;
};

type RawRoomRelation = {
  id: string;
  name: string | null;
};

type RawServiceRelation = {
  id: string;
  name: string | null;
  service_group: string | null;
};

type RawAppointmentService = {
  id: string;
  service_id: string;
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
  internal_note: string | null;
  appointment_services: RawAppointmentService[] | null;
  employee: RawEmployeeRelation | RawEmployeeRelation[] | null;
  room: RawRoomRelation | RawRoomRelation[] | null;
};

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
    service: { id: string; name: string; service_group: string | null } | null;
  }[];
  employee: { id: string; display_name: string } | null;
  room: { id: string; name: string } | null;
};

export type ClientInsights = {
  total_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  no_show_appointments: number;
  scheduled_appointments: number;
  no_show_rate: number;
  cancellation_rate: number;
  favorite_service: string | null;
  favorite_employee: string | null;
  last_completed_appointment: string | null;
  average_days_between_visits: number | null;
  segment: "new" | "active" | "regular" | "at_risk" | "lost";
  alerts: string[];
};

export type ClientDetails = ClientListItem & {
  pastAppointments: ClientAppointmentRow[];
  upcomingAppointments: ClientAppointmentRow[];
  insights: ClientInsights;
};

function fullName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Klijent bez imena";
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function daysBetween(dateA: string, dateB: string) {
  const a = new Date(`${dateA}T00:00:00`);
  const b = new Date(`${dateB}T00:00:00`);
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
}

function getClientSegment(args: {
  completed: number;
  cancelled: number;
  noShow: number;
  lastCompleted: string | null;
  today: string;
}) {
  if (args.completed <= 1) return "new" as const;
  if (args.cancelled + args.noShow >= 2) return "at_risk" as const;
  if (!args.lastCompleted) return "lost" as const;
  const days = daysBetween(args.lastCompleted, args.today);
  if (args.completed >= 4 && days <= 90) return "regular" as const;
  if (days <= 60) return "active" as const;
  return "lost" as const;
}

export async function getClientsList(search?: string): Promise<ClientListItem[]> {
  const supabase = await createClient();

  let clientsQuery = supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes")
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
    .select("client_id, appointment_date")
    .in("client_id", clientIds);

  if (appointmentsError) {
    console.error(
      "getClientsList appointments summary failed:",
      appointmentsError.message,
    );
    throw new Error("Nije moguće dohvatiti termine klijenata.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const appointmentsByClient = new Map<
    string,
    Array<{ appointment_date: string }>
  >();

  for (const appointment of appointments ?? []) {
    if (!appointment.client_id || !appointment.appointment_date) continue;

    const current = appointmentsByClient.get(appointment.client_id) ?? [];
    current.push({ appointment_date: appointment.appointment_date });
    appointmentsByClient.set(appointment.client_id, current);
  }

  const result = (clients ?? []).map((client) => {
    const clientAppointments = appointmentsByClient.get(client.id) ?? [];
    const dates = clientAppointments
      .map((item) => item.appointment_date)
      .filter(Boolean);

    const past = dates.filter((date) => date <= today).sort().reverse();
    const future = dates.filter((date) => date >= today).sort();

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

  return result;
}

export async function getClientById(id: string): Promise<ClientDetails | null> {
  const supabase = await createClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes, is_active")
    .eq("id", id)
    .maybeSingle();

  if (clientError) throw new Error("Nije moguće dohvatiti klijenta.");
  if (!client) return null;

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select(`
      id, appointment_date, start_time, end_time, status,
      client_name, client_phone, client_email, internal_note,
      appointment_services (
        id, service_id, duration_minutes, sort_order,
        service:services (id, name, service_group)
      ),
      employee:employees (id, display_name),
      room:rooms (id, name)
    `)
    .eq("client_id", id)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false });

  if (appointmentsError) throw new Error("Nije moguće dohvatiti detalje klijenta.");

  const rows: ClientAppointmentRow[] = ((appointments ?? []) as RawClientAppointment[]).map((item) => {
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
      internal_note: item.internal_note ?? null,
      appointment_services: Array.isArray(item.appointment_services)
        ? item.appointment_services.map((entry) => {
            const service = getSingleRelation(entry.service);
            return {
              id: String(entry.id),
              service_id: String(entry.service_id),
              duration_minutes: Number(entry.duration_minutes ?? 0),
              sort_order: Number(entry.sort_order ?? 0),
              service: service
                ? { id: String(service.id), name: String(service.name ?? ""), service_group: service.service_group ?? null }
                : null,
            };
          })
        : [],
      employee: employee ? { id: String(employee.id), display_name: String(employee.display_name ?? "") } : null,
      room: room ? { id: String(room.id), name: String(room.name ?? "") } : null,
    };
  });

  const today = new Date().toISOString().slice(0, 10);
  const pastAppointments = rows.filter((item) => item.appointment_date < today);
  const upcomingAppointments = rows
    .filter((item) => item.appointment_date >= today)
    .sort((a, b) => `${a.appointment_date}${a.start_time}`.localeCompare(`${b.appointment_date}${b.start_time}`));

  const completed = rows.filter((item) => item.status === "completed");
  const cancelled = rows.filter((item) => item.status === "cancelled");
  const noShow = rows.filter((item) => item.status === "no_show");
  const scheduled = rows.filter((item) => item.status === "scheduled");
  const completedDates = [...new Set(completed.map((item) => item.appointment_date))].sort();
  const lastCompleted = completedDates.at(-1) ?? null;
  let averageDaysBetweenVisits: number | null = null;
  if (completedDates.length > 1) {
    const gaps = completedDates.slice(1).map((date, index) => daysBetween(completedDates[index], date));
    averageDaysBetweenVisits = Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length);
  }

  const serviceCounts = new Map<string, number>();
  const employeeCounts = new Map<string, number>();
  for (const appointment of rows) {
    for (const entry of appointment.appointment_services ?? []) {
      const name = entry.service?.name;
      if (name) serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
    }
    if (appointment.employee?.display_name) {
      const name = appointment.employee.display_name;
      employeeCounts.set(name, (employeeCounts.get(name) ?? 0) + 1);
    }
  }

  const favoriteService = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const favoriteEmployee = [...employeeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const noShowRate = rows.length ? Math.round((noShow.length / rows.length) * 100) : 0;
  const cancellationRate = rows.length ? Math.round((cancelled.length / rows.length) * 100) : 0;
  const alerts: string[] = [];
  if (noShow.length >= 2 || noShowRate >= 25) alerts.push("Povišen no-show rizik.");
  if (cancelled.length >= 2 || cancellationRate >= 25) alerts.push("Klijent često otkazuje termine.");
  if (lastCompleted && daysBetween(lastCompleted, today) > 120) {
    alerts.push(`Klijent nije bio ${daysBetween(lastCompleted, today)} dana.`);
  }
  if (favoriteService) alerts.push(`Najčešće rezervira: ${favoriteService}.`);

  const allDates = rows.map((item) => item.appointment_date);
  return {
    id: client.id,
    full_name: fullName(client.first_name, client.last_name),
    phone: client.phone,
    email: client.email,
    note: client.notes,
    internal_note: null,
    appointments_count: rows.length,
    last_appointment: allDates.filter((date) => date <= today).sort().reverse()[0] ?? null,
    next_appointment: allDates.filter((date) => date >= today).sort()[0] ?? null,
    pastAppointments,
    upcomingAppointments,
    insights: {
      total_appointments: rows.length,
      completed_appointments: completed.length,
      cancelled_appointments: cancelled.length,
      no_show_appointments: noShow.length,
      scheduled_appointments: scheduled.length,
      no_show_rate: noShowRate,
      cancellation_rate: cancellationRate,
      favorite_service: favoriteService,
      favorite_employee: favoriteEmployee,
      last_completed_appointment: lastCompleted,
      average_days_between_visits: averageDaysBetweenVisits,
      segment: getClientSegment({ completed: completed.length, cancelled: cancelled.length, noShow: noShow.length, lastCompleted, today }),
      alerts,
    },
  };
}

export async function getClientOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email, notes")
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
