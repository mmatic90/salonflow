import { createClient } from "@/lib/supabase/server";

type ValidationArgs = {
  organizationId: string;
  appointmentId?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  employeeId: string;
  roomId: string | null;
};

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

export async function validateAppointmentRuntime(args: ValidationArgs) {
  const supabase = await createClient();
  const startMinutes = timeToMinutes(args.startTime);
  const endMinutes = timeToMinutes(args.endTime);

  const [scheduleResult, appointmentsResult] = await Promise.all([
    supabase.rpc("get_employee_effective_schedule", {
      p_employee_id: args.employeeId,
      p_date: args.appointmentDate,
    }),
    supabase
      .from("appointments")
      .select("id, employee_id, room_id, start_time, end_time")
      .eq("organization_id", args.organizationId)
      .eq("appointment_date", args.appointmentDate)
      .in("status", ["scheduled", "confirmed", "completed"]),
  ]);

  if (scheduleResult.error) {
    return { ok: false as const, message: scheduleResult.error.message };
  }

  if (appointmentsResult.error) {
    return { ok: false as const, message: appointmentsResult.error.message };
  }

  const schedule = scheduleResult.data?.[0];
  if (!schedule?.is_working || !schedule.start_time || !schedule.end_time) {
    return {
      ok: false as const,
      message: "Odabrani zaposlenik ne radi na odabrani datum.",
    };
  }

  const employeeStart = timeToMinutes(schedule.start_time);
  const employeeEnd = timeToMinutes(schedule.end_time);
  if (startMinutes < employeeStart || endMinutes > employeeEnd) {
    return {
      ok: false as const,
      message: "Termin mora biti unutar radnog vremena zaposlenika.",
    };
  }

  const existing = (appointmentsResult.data ?? []).filter(
    (item) => item.id !== args.appointmentId,
  );

  const employeeConflict = existing.some(
    (item) =>
      item.employee_id === args.employeeId &&
      overlaps(
        startMinutes,
        endMinutes,
        timeToMinutes(item.start_time),
        timeToMinutes(item.end_time),
      ),
  );

  if (employeeConflict) {
    return {
      ok: false as const,
      message: "Zaposlenik već ima termin u odabranom vremenu.",
    };
  }

  if (args.roomId) {
    const roomConflict = existing.some(
      (item) =>
        item.room_id === args.roomId &&
        overlaps(
          startMinutes,
          endMinutes,
          timeToMinutes(item.start_time),
          timeToMinutes(item.end_time),
        ),
    );

    if (roomConflict) {
      return {
        ok: false as const,
        message: "Soba je već zauzeta u odabranom vremenu.",
      };
    }
  }

  return { ok: true as const };
}

export function appointmentDatabaseErrorMessage(message: string) {
  if (message.includes("EMPLOYEE_NOT_WORKING")) {
    return "Odabrani zaposlenik ne radi na odabrani datum ili termin nije unutar njegovog radnog vremena.";
  }
  if (message.includes("EMPLOYEE_APPOINTMENT_OVERLAP")) {
    return "Zaposlenik već ima termin u odabranom vremenu.";
  }
  if (message.includes("ROOM_APPOINTMENT_OVERLAP")) {
    return "Soba je već zauzeta u odabranom vremenu.";
  }
  return message;
}
