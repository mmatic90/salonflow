"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseAppointmentServicesJson,
  validateAppointmentServicesForEmployeeAndRoom,
} from "@/features/appointments/multi-service-helpers";
import { addMinutesToTimeString } from "@/features/appointments/time-helpers";
import type {
  AppointmentServiceInput,
  AppointmentStatus,
} from "@/features/appointments/types";
import {
  cancelScheduledSms,
  scheduleSms,
  sendInstantSms,
} from "@/lib/twilio/sms";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type AppointmentFormValues = {
  appointment_date: string;
  start_time: string;
  client_id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  service_id: string;
  employee_id: string;
  room_id: string;
  duration_minutes: string;
  status: string;
  client_note: string;
  internal_note: string;
  services_json: string;
};

export type ActionState = {
  error: string;
  values: AppointmentFormValues;
};

function normalizeDate(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: FormDataEntryValue | null) {
  const parsed = typeof value === "string" ? value.trim() : "";
  return parsed.length > 0 ? parsed : null;
}

function normalizeLower(value: string | null | undefined) {
  return (value || "").trim().toLowerCase();
}

function splitClientName(clientName: string) {
  const parts = clientName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return {
      firstName: parts[0] ?? "",
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function getFormValues(formData: FormData): AppointmentFormValues {
  return {
    appointment_date: normalizeDate(formData.get("appointment_date")),
    start_time: normalizeText(formData.get("start_time")),
    client_id: normalizeText(formData.get("client_id")),
    client_name: normalizeText(formData.get("client_name")),
    client_phone: normalizeText(formData.get("client_phone")),
    client_email: normalizeText(formData.get("client_email")),
    service_id: normalizeText(formData.get("service_id")),
    employee_id: normalizeText(formData.get("employee_id")),
    room_id: normalizeText(formData.get("room_id")),
    duration_minutes: normalizeText(formData.get("duration_minutes")),
    status: normalizeText(formData.get("status")) || "scheduled",
    client_note: normalizeText(formData.get("client_note")),
    internal_note: normalizeText(formData.get("internal_note")),
    services_json: normalizeText(formData.get("services_json")) || "[]",
  };
}

function revalidateAppointmentPaths(date: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/appointments?date=${date}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/time-grid");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/clients");
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

function isValidAppointmentStatus(value: string): value is AppointmentStatus {
  return [
    "scheduled",
    "confirmed",
    "completed",
    "cancelled",
    "no_show",
  ].includes(value);
}

function canTransitionAppointmentStatus(
  from: AppointmentStatus,
  to: AppointmentStatus,
) {
  if (from === to) return true;

  if (from === "scheduled") {
    return ["confirmed", "completed", "cancelled", "no_show"].includes(to);
  }

  if (from === "confirmed") {
    return ["scheduled", "completed", "cancelled", "no_show"].includes(to);
  }

  return false;
}

function formatSmsDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${day}.${month}.${year}`;
}

function formatSmsTime(time: string) {
  return time.slice(0, 5);
}

function buildAppointmentCreatedSms(args: {
  salonName: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return `Bok ${args.clientName}, vaš termin za "${args.serviceName}" uspješno je rezerviran za ${formatSmsDate(args.date)} u ${formatSmsTime(args.startTime)}. ${args.salonName}`;
}

function buildAppointmentReminderSms(args: {
  salonName: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return `Podsjetnik: sutra imate termin za "${args.serviceName}" u ${formatSmsTime(args.startTime)} (${formatSmsDate(args.date)}). ${args.salonName}`;
}

function buildAppointmentUpdatedSms(args: {
  salonName: string;
  clientName: string;
  serviceName: string;
  date: string;
  startTime: string;
}) {
  return `Bok ${args.clientName}, vaš termin za "${args.serviceName}" je izmijenjen. Novi termin je ${formatSmsDate(args.date)} u ${formatSmsTime(args.startTime)}. ${args.salonName}`;
}

function didAppointmentDateOrTimeChange(
  beforeAppointment: {
    appointment_date?: string | null;
    start_time?: string | null;
  } | null,
  nextValues: {
    appointment_date: string;
    start_time: string;
  },
) {
  if (!beforeAppointment) return false;

  const beforeDate = beforeAppointment.appointment_date ?? "";
  const beforeStartTime = (beforeAppointment.start_time ?? "").slice(0, 5);
  const nextStartTime = nextValues.start_time.slice(0, 5);

  return (
    beforeDate !== nextValues.appointment_date ||
    beforeStartTime !== nextStartTime
  );
}

function withTime(date: Date, hours: number, minutes = 0) {
  const copy = new Date(date);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

function isQuietHours(date: Date) {
  const hours = date.getHours();
  return hours < 8 || hours >= 20;
}

function moveToNextAllowedSendTime(date: Date) {
  const copy = new Date(date);

  if (copy.getHours() < 8) {
    return withTime(copy, 8, 0);
  }

  if (copy.getHours() >= 20) {
    copy.setDate(copy.getDate() + 1);
    return withTime(copy, 8, 0);
  }

  return copy;
}

function ensureNotInQuietHours(date: Date) {
  return isQuietHours(date) ? moveToNextAllowedSendTime(date) : date;
}

function getAppointmentStart(date: string, startTime: string) {
  return new Date(`${date}T${startTime}:00`);
}

function getReminder24hSendAt(date: string, startTime: string) {
  const appointmentStart = getAppointmentStart(date, startTime);
  const reminder = new Date(appointmentStart.getTime() - 24 * 60 * 60 * 1000);

  return ensureNotInQuietHours(reminder);
}

function getCreatedSmsSendAt() {
  return ensureNotInQuietHours(new Date());
}

function canScheduleWithTwilio(sendAt: Date) {
  const now = new Date();
  const diffMs = sendAt.getTime() - now.getTime();

  return diffMs >= 15 * 60 * 1000;
}

function isWithinAllowedSendHours(date: Date) {
  const hours = date.getHours();
  return hours >= 8 && hours < 20;
}

async function sendOrScheduleCreatedSms(args: {
  salonName: string;
  appointmentId: string;
  clientPhone: string | null;
  clientName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  status: AppointmentStatus;
}) {
  const supabase = await createClient();

  const {
    salonName,
    appointmentId,
    clientPhone,
    clientName,
    serviceName,
    appointmentDate,
    startTime,
    status,
  } = args;

  console.log("[SMS] sendOrScheduleCreatedSms args:", {
    salonName,
    appointmentId,
    clientPhone,
    clientName,
    appointmentDate,
    startTime,
    status,
  });

  if (!clientPhone || status !== "scheduled") {
    await supabase
      .from("appointments")
      .update({
        twilio_created_sms_sid: null,
      })
      .eq("id", appointmentId);

    return;
  }

  const now = new Date();

  try {
    if (isWithinAllowedSendHours(now)) {
      const createdSms = await sendInstantSms({
        to: clientPhone,
        message: buildAppointmentCreatedSms({
          salonName,
          clientName,
          serviceName,
          date: appointmentDate,
          startTime,
        }),
      });

      await supabase
        .from("appointments")
        .update({
          twilio_created_sms_sid: createdSms.sid,
        })
        .eq("id", appointmentId);

      return;
    }

    const sendAt = getCreatedSmsSendAt();

    if (!canScheduleWithTwilio(sendAt)) {
      await supabase
        .from("appointments")
        .update({
          twilio_created_sms_sid: null,
        })
        .eq("id", appointmentId);

      return;
    }

    const createdSms = await scheduleSms({
      to: clientPhone,
      message: buildAppointmentCreatedSms({
        salonName,
        clientName,
        serviceName,
        date: appointmentDate,
        startTime,
      }),
      sendAt,
    });

    await supabase
      .from("appointments")
      .update({
        twilio_created_sms_sid: createdSms.sid,
      })
      .eq("id", appointmentId);
  } catch (error) {
    console.error(
      "Greška pri slanju/schedulanju SMS potvrde:",
      JSON.stringify(error, null, 2),
    );
    console.error(error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function sendUpdatedSmsIfPossible(args: {
  salonName: string;
  appointmentId: string;
  clientPhone: string | null;
  clientName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  status: AppointmentStatus;
}) {
  const supabase = await createClient();

  const {
    salonName,
    appointmentId,
    clientPhone,
    clientName,
    serviceName,
    appointmentDate,
    startTime,
    status,
  } = args;

  console.log("[SMS] sendUpdatedSmsIfPossible args:", {
    salonName,
    appointmentId,
    clientPhone,
    clientName,
    appointmentDate,
    startTime,
    status,
  });

  if (!clientPhone || status !== "scheduled") {
    return;
  }

  try {
    const sms = await sendInstantSms({
      to: clientPhone,
      message: buildAppointmentUpdatedSms({
        salonName,
        clientName,
        serviceName,
        date: appointmentDate,
        startTime,
      }),
    });

    await supabase
      .from("appointments")
      .update({
        twilio_created_sms_sid: sms.sid,
      })
      .eq("id", appointmentId);
  } catch (error) {
    console.error(
      "Greška pri slanju SMS poruke o izmjeni termina:",
      JSON.stringify(error, null, 2),
    );
    console.error(error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function scheduleReminderIfPossible(args: {
  salonName: string;
  appointmentId: string;
  clientPhone: string | null;
  clientName: string;
  serviceName: string;
  appointmentDate: string;
  startTime: string;
  status: AppointmentStatus;
}) {
  const supabase = await createClient();

  const {
    salonName,
    appointmentId,
    clientPhone,
    clientName,
    serviceName,
    appointmentDate,
    startTime,
    status,
  } = args;

  console.log("[SMS] scheduleReminderIfPossible args:", {
    salonName,
    appointmentId,
    clientPhone,
    clientName,
    appointmentDate,
    startTime,
    status,
  });

  if (!clientPhone || status !== "scheduled") {
    await supabase
      .from("appointments")
      .update({
        twilio_reminder_24h_sid: null,
        reminder_24h_scheduled_at: null,
      })
      .eq("id", appointmentId);

    return;
  }

  const sendAt = getReminder24hSendAt(appointmentDate, startTime);

  console.log("[SMS] reminder sendAt:", sendAt.toISOString());
  console.log(
    "[SMS] reminder canScheduleWithTwilio:",
    canScheduleWithTwilio(sendAt),
  );

  if (!canScheduleWithTwilio(sendAt)) {
    await supabase
      .from("appointments")
      .update({
        twilio_reminder_24h_sid: null,
        reminder_24h_scheduled_at: null,
      })
      .eq("id", appointmentId);

    return;
  }

  try {
    const reminderSms = await scheduleSms({
      to: clientPhone,
      message: buildAppointmentReminderSms({
        salonName,
        clientName,
        serviceName,
        date: appointmentDate,
        startTime,
      }),
      sendAt,
    });

    await supabase
      .from("appointments")
      .update({
        twilio_reminder_24h_sid: reminderSms.sid,
        reminder_24h_scheduled_at: sendAt.toISOString(),
      })
      .eq("id", appointmentId);
  } catch (error) {
    console.error(
      "Greška pri zakazivanju 24h remindera:",
      JSON.stringify(error, null, 2),
    );
    console.error(error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function cancelExistingReminderIfAny(appointmentId: string) {
  const supabase = await createClient();

  const { data: existingAppointment, error } = await supabase
    .from("appointments")
    .select("twilio_reminder_24h_sid, twilio_created_sms_sid")
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    console.error("Greška pri dohvaćanju Twilio SID-eva:", error);
    return;
  }

  const reminderSid = existingAppointment?.twilio_reminder_24h_sid;
  const createdSid = existingAppointment?.twilio_created_sms_sid;

  if (reminderSid) {
    try {
      await cancelScheduledSms(reminderSid);
    } catch (error) {
      console.error("Greška pri otkazivanju 24h remindera:", error);
    }
  }

  if (createdSid) {
    try {
      await cancelScheduledSms(createdSid);
    } catch (error) {
      console.error("Greška pri otkazivanju create SMS poruke:", error);
    }
  }

  await supabase
    .from("appointments")
    .update({
      twilio_reminder_24h_sid: null,
      twilio_created_sms_sid: null,
      reminder_24h_scheduled_at: null,
    })
    .eq("id", appointmentId);
}

async function resolveClientId(args: {
  organizationId: string;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  clientNote: string | null;
}) {
  const supabase = await createClient();

  const {
    organizationId,
    clientId,
    clientName,
    clientPhone,
    clientEmail,
    clientNote,
  } = args;

  const { firstName, lastName } = splitClientName(clientName);
  const clientPayload = {
    organization_id: organizationId,
    first_name: firstName,
    last_name: lastName,
    phone: clientPhone,
    email: clientEmail,
    notes: clientNote,
  };

  if (clientId) {
    const { data: updatedClient, error } = await supabase
      .from("clients")
      .update(clientPayload)
      .eq("organization_id", organizationId)
      .eq("id", clientId)
      .select("id")
      .maybeSingle();

    if (error) {
      return {
        ok: false as const,
        error: error.message,
      };
    }

    if (!updatedClient) {
      return {
        ok: false as const,
        error: "Odabrani klijent nije pronađen u ovoj organizaciji.",
      };
    }

    return {
      ok: true as const,
      clientId: updatedClient.id,
    };
  }

  const { data: possibleMatches, error: searchError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email")
    .eq("organization_id", organizationId)
    .ilike("first_name", firstName)
    .ilike("last_name", lastName);

  if (searchError) {
    return {
      ok: false as const,
      error: searchError.message,
    };
  }

  const existing = (possibleMatches ?? []).find((item) => {
    const existingName = [item.first_name, item.last_name]
      .filter(Boolean)
      .join(" ");

    return (
      normalizeLower(existingName) === normalizeLower(clientName) &&
      normalizeLower(item.phone) === normalizeLower(clientPhone) &&
      normalizeLower(item.email) === normalizeLower(clientEmail)
    );
  });

  if (existing) {
    const { error } = await supabase
      .from("clients")
      .update(clientPayload)
      .eq("organization_id", organizationId)
      .eq("id", existing.id);

    if (error) {
      return {
        ok: false as const,
        error: error.message,
      };
    }

    return {
      ok: true as const,
      clientId: existing.id,
    };
  }

  const { data: createdClient, error: insertError } = await supabase
    .from("clients")
    .insert(clientPayload)
    .select("id")
    .single();

  if (insertError || !createdClient) {
    return {
      ok: false as const,
      error: insertError?.message || "Greška pri kreiranju klijenta.",
    };
  }

  return {
    ok: true as const,
    clientId: createdClient.id,
  };
}

async function validateAppointmentRequest(args: {
  organizationId: string;
  appointmentId?: string;
  appointmentDate: string;
  startTime: string;
  employeeId: string;
  roomId: string;
  items: AppointmentServiceInput[];
  status: AppointmentStatus;
}) {
  const supabase = await createClient();

  const {
    organizationId,
    appointmentId,
    appointmentDate,
    startTime,
    employeeId,
    roomId,
    items,
    status,
  } = args;

  if (!appointmentDate) {
    return { ok: false as const, message: "Datum je obavezan." };
  }

  if (!startTime) {
    return { ok: false as const, message: "Vrijeme početka je obavezno." };
  }

  if (!employeeId) {
    return { ok: false as const, message: "Zaposlenik je obavezan." };
  }

  if (!roomId) {
    return { ok: false as const, message: "Soba je obavezna." };
  }

  if (items.length === 0) {
    return { ok: false as const, message: "Potrebna je barem jedna usluga." };
  }

  const totalDuration = items.reduce(
    (sum, item) => sum + item.duration_minutes,
    0,
  );

  if (totalDuration <= 0) {
    return {
      ok: false as const,
      message: "Ukupno trajanje mora biti veće od 0.",
    };
  }

  const endTime = addMinutesToTimeString(startTime, totalDuration);
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  const [
    { data: salonHours, error: salonError },
    { data: employeeSchedule, error: employeeScheduleError },
    { data: existingAppointments, error: appointmentsError },
  ] = await Promise.all([
    supabase
      .from("salon_working_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("organization_id", organizationId),

    supabase.rpc("get_employee_effective_schedule", {
      p_employee_id: employeeId,
      p_date: appointmentDate,
    }),

    supabase
      .from("appointments")
      .select("id, employee_id, room_id, start_time, end_time, status")
      .eq("organization_id", organizationId)
      .eq("appointment_date", appointmentDate)
      .in("status", ["scheduled", "confirmed", "completed"]),
  ]);

  if (salonError) {
    return { ok: false as const, message: salonError.message };
  }

  if (employeeScheduleError) {
    return { ok: false as const, message: employeeScheduleError.message };
  }

  if (appointmentsError) {
    return { ok: false as const, message: appointmentsError.message };
  }

  const dayOfWeek = new Date(`${appointmentDate}T00:00:00`).getDay();
  const salonDay = (salonHours ?? []).find(
    (row) => row.day_of_week === dayOfWeek,
  );

  if (!salonDay || salonDay.is_closed) {
    return {
      ok: false as const,
      message: "Salon je zatvoren na odabrani datum.",
    };
  }

  const salonOpen = timeToMinutes(salonDay.opens_at);
  const salonClose = timeToMinutes(salonDay.closes_at);

  if (startMinutes < salonOpen || endMinutes > salonClose) {
    return {
      ok: false as const,
      message: "Termin mora biti unutar radnog vremena salona.",
    };
  }

  const effectiveRow = employeeSchedule?.[0];

  if (
    !effectiveRow?.is_working ||
    !effectiveRow?.start_time ||
    !effectiveRow?.end_time
  ) {
    return {
      ok: false as const,
      message: "Odabrani zaposlenik ne radi na odabrani datum.",
    };
  }

  const employeeStart = timeToMinutes(effectiveRow.start_time);
  const employeeEnd = timeToMinutes(effectiveRow.end_time);

  if (startMinutes < employeeStart || endMinutes > employeeEnd) {
    return {
      ok: false as const,
      message: "Termin mora biti unutar radnog vremena zaposlenika.",
    };
  }

  const filteredExisting = (existingAppointments ?? []).filter((item) =>
    appointmentId ? item.id !== appointmentId : true,
  );

  const employeeConflict = filteredExisting.some((item) => {
    if (item.employee_id !== employeeId) return false;

    return overlaps(
      startMinutes,
      endMinutes,
      timeToMinutes(item.start_time),
      timeToMinutes(item.end_time),
    );
  });

  if (employeeConflict) {
    return {
      ok: false as const,
      message: "Zaposlenik već ima termin u odabranom vremenu.",
    };
  }

  const roomConflict = filteredExisting.some((item) => {
    if (item.room_id !== roomId) return false;

    return overlaps(
      startMinutes,
      endMinutes,
      timeToMinutes(item.start_time),
      timeToMinutes(item.end_time),
    );
  });

  if (roomConflict) {
    return {
      ok: false as const,
      message: "Soba je već zauzeta u odabranom vremenu.",
    };
  }

  const primaryService = items[0];

  if (!isValidAppointmentStatus(status)) {
    return {
      ok: false as const,
      message: "Status termina nije valjan.",
    };
  }

  return {
    ok: true as const,
    totalDuration,
    primaryServiceId: primaryService.service_id,
    endTime,
  };
}

async function getCurrentAppointmentStatus(
  appointmentId: string,
  organizationId: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("status")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      message: error.message,
    };
  }

  if (!data || !isValidAppointmentStatus(data.status)) {
    return {
      ok: false as const,
      message: "Termin nije pronađen.",
    };
  }

  return {
    ok: true as const,
    status: data.status,
  };
}

export async function createAppointmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const values = getFormValues(formData);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Niste prijavljeni.", values };
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return { error: "Nemate pristup organizaciji.", values };
  }

  const organizationId = permissions.organizationId;

  const clientPhone = normalizeNullableText(formData.get("client_phone"));
  const clientEmail = normalizeNullableText(formData.get("client_email"));
  const clientNote = normalizeNullableText(formData.get("client_note"));
  const internalNote = normalizeNullableText(formData.get("internal_note"));

  if (!values.appointment_date) {
    return { error: "Datum je obavezan.", values };
  }

  if (!values.start_time) {
    return { error: "Vrijeme početka je obavezno.", values };
  }

  if (!values.client_name) {
    return { error: "Ime klijenta je obavezno.", values };
  }

  if (!values.employee_id) {
    return { error: "Zaposlenik je obavezan.", values };
  }

  if (!values.room_id) {
    return { error: "Soba je obavezna.", values };
  }

  if (!isValidAppointmentStatus(values.status)) {
    return { error: "Status termina nije valjan.", values };
  }

  const resolvedClient = await resolveClientId({
    organizationId,
    clientId: values.client_id,
    clientName: values.client_name,
    clientPhone,
    clientEmail,
    clientNote,
  });

  if (!resolvedClient.ok) {
    return { error: resolvedClient.error, values };
  }

  const parsedServices = parseAppointmentServicesJson(formData);

  if (!parsedServices.ok) {
    return { error: parsedServices.message, values };
  }

  const serviceItems = parsedServices.items;

  const serviceValidation = await validateAppointmentServicesForEmployeeAndRoom(
    {
      employeeId: values.employee_id,
      roomId: values.room_id,
      items: serviceItems,
    },
  );

  if (!serviceValidation.ok) {
    return {
      error: serviceValidation.message ?? "Greška validacije usluga.",
      values,
    };
  }

  const appointmentValidation = await validateAppointmentRequest({
    organizationId,
    appointmentDate: values.appointment_date,
    startTime: values.start_time,
    employeeId: values.employee_id,
    roomId: values.room_id,
    items: serviceItems,
    status: values.status,
  });

  if (!appointmentValidation.ok) {
    return { error: appointmentValidation.message, values };
  }

  const totalDuration = appointmentValidation.totalDuration;
  const primaryServiceId = appointmentValidation.primaryServiceId;
  const endTime = appointmentValidation.endTime;

  const { data: selectedServices, error: selectedServicesError } =
    await supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", organizationId)
      .in(
        "id",
        serviceItems.map((item) => item.service_id),
      );

  if (selectedServicesError) {
    return { error: selectedServicesError.message, values };
  }

  const serviceNameById = new Map(
    (selectedServices ?? []).map((service) => [service.id, service.name]),
  );
  const serviceName =
    serviceNameById.get(primaryServiceId) ?? "odabranu uslugu";

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      organization_id: organizationId,
      client_id: resolvedClient.clientId,
      client_name: values.client_name,
      client_phone: clientPhone,
      client_email: clientEmail,
      notes: clientNote,
      internal_notes: internalNote,
      employee_id: values.employee_id,
      room_id: values.room_id,
      appointment_date: values.appointment_date,
      start_time: values.start_time,
      end_time: endTime,
      status: values.status,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return {
      error: appointmentError?.message || "Greška pri spremanju termina.",
      values,
    };
  }

  const { error: appointmentServicesError } = await supabase
    .from("appointment_services")
    .insert(
      serviceItems.map((item, index) => ({
        organization_id: organizationId,
        appointment_id: appointment.id,
        service_id: item.service_id,
        service_name:
          serviceNameById.get(item.service_id) ?? "Nepoznata usluga",
        duration_minutes: item.duration_minutes,
        sort_order: index + 1,
      })),
    );

  if (appointmentServicesError) {
    await supabase
      .from("appointments")
      .delete()
      .eq("organization_id", organizationId)
      .eq("id", appointment.id);

    return {
      error: appointmentServicesError.message,
      values,
    };
  }

  await sendOrScheduleCreatedSms({
    salonName: permissions.organizationName,
    appointmentId: appointment.id,
    clientPhone,
    clientName: values.client_name,
    serviceName,
    appointmentDate: values.appointment_date,
    startTime: values.start_time,
    status: values.status,
  });

  await scheduleReminderIfPossible({
    salonName: permissions.organizationName,
    appointmentId: appointment.id,
    clientPhone,
    clientName: values.client_name,
    serviceName,
    appointmentDate: values.appointment_date,
    startTime: values.start_time,
    status: values.status,
  });

  await writeAuditLog({
    action: "appointment_created",
    entityType: "appointment",
    entityId: appointment.id,
    entityLabel: `${values.client_name} - ${values.appointment_date} ${values.start_time}`,
    details: {
      appointment_date: values.appointment_date,
      start_time: values.start_time,
      end_time: endTime,
      client_name: values.client_name,
      client_phone: clientPhone,
      client_email: clientEmail,
      employee_id: values.employee_id,
      room_id: values.room_id,
      service_id: primaryServiceId,
      services: serviceItems,
      status: values.status,
    },
  });

  revalidateAppointmentPaths(values.appointment_date);
  redirect(`/dashboard/appointments?date=${values.appointment_date}`);
}

export async function updateAppointmentAction(
  appointmentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const values = getFormValues(formData);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Niste prijavljeni.", values };
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return { error: "Nemate pristup organizaciji.", values };
  }

  const organizationId = permissions.organizationId;

  const clientPhone = normalizeNullableText(formData.get("client_phone"));
  const clientEmail = normalizeNullableText(formData.get("client_email"));
  const clientNote = normalizeNullableText(formData.get("client_note"));
  const internalNote = normalizeNullableText(formData.get("internal_note"));

  if (!values.appointment_date) {
    return { error: "Datum je obavezan.", values };
  }

  if (!values.start_time) {
    return { error: "Vrijeme početka je obavezno.", values };
  }

  if (!values.client_name) {
    return { error: "Ime klijenta je obavezno.", values };
  }

  if (!values.employee_id) {
    return { error: "Zaposlenik je obavezan.", values };
  }

  if (!values.room_id) {
    return { error: "Soba je obavezna.", values };
  }

  if (!isValidAppointmentStatus(values.status)) {
    return { error: "Status termina nije valjan.", values };
  }

  const { data: beforeAppointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  const currentStatusResult = await getCurrentAppointmentStatus(
    appointmentId,
    organizationId,
  );

  if (!currentStatusResult.ok) {
    return { error: currentStatusResult.message, values };
  }

  if (
    !canTransitionAppointmentStatus(currentStatusResult.status, values.status)
  ) {
    return {
      error: "Promjena statusa termina nije dozvoljena.",
      values,
    };
  }

  const resolvedClient = await resolveClientId({
    organizationId,
    clientId: values.client_id,
    clientName: values.client_name,
    clientPhone,
    clientEmail,
    clientNote,
  });

  if (!resolvedClient.ok) {
    return { error: resolvedClient.error, values };
  }

  const parsedServices = parseAppointmentServicesJson(formData);

  if (!parsedServices.ok) {
    return { error: parsedServices.message, values };
  }

  const serviceItems = parsedServices.items;

  const serviceValidation = await validateAppointmentServicesForEmployeeAndRoom(
    {
      employeeId: values.employee_id,
      roomId: values.room_id,
      items: serviceItems,
    },
  );

  if (!serviceValidation.ok) {
    return {
      error: serviceValidation.message ?? "Greška validacije usluga.",
      values,
    };
  }

  const appointmentValidation = await validateAppointmentRequest({
    organizationId,
    appointmentId,
    appointmentDate: values.appointment_date,
    startTime: values.start_time,
    employeeId: values.employee_id,
    roomId: values.room_id,
    items: serviceItems,
    status: values.status,
  });

  if (!appointmentValidation.ok) {
    return { error: appointmentValidation.message, values };
  }

  const totalDuration = appointmentValidation.totalDuration;
  const primaryServiceId = appointmentValidation.primaryServiceId;
  const endTime = appointmentValidation.endTime;

  const { data: selectedServices, error: selectedServicesError } =
    await supabase
      .from("services")
      .select("id, name")
      .eq("organization_id", organizationId)
      .in(
        "id",
        serviceItems.map((item) => item.service_id),
      );

  if (selectedServicesError) {
    return { error: selectedServicesError.message, values };
  }

  const serviceNameById = new Map(
    (selectedServices ?? []).map((service) => [service.id, service.name]),
  );
  const serviceName =
    serviceNameById.get(primaryServiceId) ?? "odabranu uslugu";

  await cancelExistingReminderIfAny(appointmentId);

  const { error: appointmentError } = await supabase
    .from("appointments")
    .update({
      client_id: resolvedClient.clientId,
      client_name: values.client_name,
      client_phone: clientPhone,
      client_email: clientEmail,
      notes: clientNote,
      internal_notes: internalNote,
      employee_id: values.employee_id,
      room_id: values.room_id,
      appointment_date: values.appointment_date,
      start_time: values.start_time,
      end_time: endTime,
      status: values.status,
    })
    .eq("organization_id", organizationId)
    .eq("id", appointmentId);

  if (appointmentError) {
    return {
      error: appointmentError.message,
      values,
    };
  }

  const { error: deleteServicesError } = await supabase
    .from("appointment_services")
    .delete()
    .eq("organization_id", organizationId)
    .eq("appointment_id", appointmentId);

  if (deleteServicesError) {
    return {
      error: deleteServicesError.message,
      values,
    };
  }

  const { error: insertServicesError } = await supabase
    .from("appointment_services")
    .insert(
      serviceItems.map((item, index) => ({
        organization_id: organizationId,
        appointment_id: appointmentId,
        service_id: item.service_id,
        service_name:
          serviceNameById.get(item.service_id) ?? "Nepoznata usluga",
        duration_minutes: item.duration_minutes,
        sort_order: index + 1,
      })),
    );

  if (insertServicesError) {
    return {
      error: insertServicesError.message,
      values,
    };
  }

  await scheduleReminderIfPossible({
    salonName: permissions.organizationName,
    appointmentId,
    clientPhone,
    clientName: values.client_name,
    serviceName,
    appointmentDate: values.appointment_date,
    startTime: values.start_time,
    status: values.status,
  });

  const shouldSendUpdatedSms = didAppointmentDateOrTimeChange(
    beforeAppointment,
    {
      appointment_date: values.appointment_date,
      start_time: values.start_time,
    },
  );

  if (shouldSendUpdatedSms) {
    await sendUpdatedSmsIfPossible({
      appointmentId,
      clientPhone,
      clientName: values.client_name,
      serviceName,
      appointmentDate: values.appointment_date,
      startTime: values.start_time,
      status: values.status,
    });
  }

  await writeAuditLog({
    action: "appointment_updated",
    entityType: "appointment",
    entityId: appointmentId,
    entityLabel: `${values.client_name} - ${values.appointment_date} ${values.start_time}`,
    details: {
      before: beforeAppointment,
      after: {
        client_id: resolvedClient.clientId,
        client_name: values.client_name,
        client_phone: clientPhone,
        client_email: clientEmail,
        notes: clientNote,
        internal_notes: internalNote,
        primary_service_id: primaryServiceId,
        employee_id: values.employee_id,
        room_id: values.room_id,
        appointment_date: values.appointment_date,
        start_time: values.start_time,
        end_time: endTime,
        duration_minutes: totalDuration,
        status: values.status,
        services: serviceItems,
      },
    },
  });

  revalidateAppointmentPaths(values.appointment_date);
  revalidatePath(`/dashboard/appointments/${appointmentId}/edit`);
  redirect(`/dashboard/appointments?date=${values.appointment_date}`);
}

export async function cancelAppointmentAction(
  appointmentId: string,
  appointmentDate: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Niste prijavljeni.");
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    throw new Error("Nemate pristup organizaciji.");
  }

  const organizationId = permissions.organizationId;

  const { data: beforeAppointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  const currentStatusResult = await getCurrentAppointmentStatus(
    appointmentId,
    organizationId,
  );

  if (!currentStatusResult.ok) {
    throw new Error(currentStatusResult.message);
  }

  if (
    !canTransitionAppointmentStatus(currentStatusResult.status, "cancelled")
  ) {
    throw new Error("Otkazivanje ovog termina nije dozvoljeno.");
  }

  await cancelExistingReminderIfAny(appointmentId);

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("organization_id", organizationId)
    .eq("id", appointmentId);

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: "appointment_cancelled",
    entityType: "appointment",
    entityId: appointmentId,
    entityLabel:
      beforeAppointment?.client_name ?? `appointment ${appointmentId}`,
    details: {
      before: beforeAppointment,
      after: {
        status: "cancelled",
      },
    },
  });

  revalidateAppointmentPaths(appointmentDate);
  revalidatePath(`/dashboard/appointments/${appointmentId}/edit`);
}

export async function quickUpdateAppointmentStatusAction(
  appointmentId: string,
  status: "completed" | "no_show" | "cancelled",
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Niste prijavljeni.",
    };
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      ok: false,
      message: "Nemate pristup organizaciji.",
    };
  }

  const organizationId = permissions.organizationId;

  const { data: beforeAppointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  const currentStatusResult = await getCurrentAppointmentStatus(
    appointmentId,
    organizationId,
  );

  if (!currentStatusResult.ok) {
    return {
      ok: false,
      message: currentStatusResult.message,
    };
  }

  if (!canTransitionAppointmentStatus(currentStatusResult.status, status)) {
    return {
      ok: false,
      message: "Promjena statusa nije dozvoljena.",
    };
  }

  await cancelExistingReminderIfAny(appointmentId);

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("organization_id", organizationId)
    .eq("id", appointmentId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await writeAuditLog({
    action: "appointment_status_changed",
    entityType: "appointment",
    entityId: appointmentId,
    entityLabel:
      beforeAppointment?.client_name ?? `appointment ${appointmentId}`,
    details: {
      before: beforeAppointment,
      after: {
        status,
      },
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/time-grid");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/clients");

  return {
    ok: true,
    message:
      status === "completed"
        ? "Termin je označen kao odrađen."
        : status === "no_show"
          ? "Termin je označen kao no-show."
          : "Termin je označen kao otkazan.",
  };
}

export async function deleteAppointmentAction(
  appointmentId: string,
  appointmentDate: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      message: "Niste prijavljeni.",
    };
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      ok: false,
      message: "Nemate pristup organizaciji.",
    };
  }

  const organizationId = permissions.organizationId;

  const { data: beforeAppointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  await cancelExistingReminderIfAny(appointmentId);

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("organization_id", organizationId)
    .eq("id", appointmentId);

  if (error) {
    return {
      ok: false,
      message: error.message,
    };
  }

  await writeAuditLog({
    action: "appointment_deleted",
    entityType: "appointment",
    entityId: appointmentId,
    entityLabel:
      beforeAppointment?.client_name ?? `appointment ${appointmentId}`,
    details: {
      before: beforeAppointment,
    },
  });

  revalidateAppointmentPaths(appointmentDate);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/time-grid");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/clients");

  return {
    ok: true,
    message: "Termin je obrisan.",
  };
}
