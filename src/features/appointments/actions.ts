"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import type { AppointmentStatus } from "@/features/appointments/types";

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

function revalidateAppointmentPaths(date?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/appointments");
  if (date) revalidatePath(`/dashboard/appointments?date=${date}`);
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/time-grid");
  revalidatePath("/dashboard/reports");
  revalidatePath("/dashboard/clients");
}

async function getCurrentAppointmentStatus(
  appointmentId: string,
  organizationId: string,
  locale: AppLocale,
) {
  const supabase = await createClient();
  const t = getDictionary(locale).appointments.actionMessages;

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
      message: t.appointmentNotFound,
    };
  }

  return {
    ok: true as const,
    status: data.status,
  };
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
      message: getDictionary("hr").appointments.actionMessages.notSignedIn,
    };
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      ok: false,
      message: getDictionary("hr").appointments.actionMessages.noOrganization,
    };
  }

  const organizationId = permissions.organizationId;
  const locale = permissions.organizationLocale;
  const t = getDictionary(locale).appointments.actionMessages;

  const { data: beforeAppointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  const currentStatusResult = await getCurrentAppointmentStatus(
    appointmentId,
    organizationId,
    locale,
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
      message: t.statusChangeNotAllowed,
    };
  }

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

  revalidateAppointmentPaths(beforeAppointment?.appointment_date ?? undefined);

  return {
    ok: true,
    message:
      status === "completed"
        ? t.markedCompleted
        : status === "no_show"
          ? t.markedNoShow
          : t.markedCancelled,
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
      message: getDictionary("hr").appointments.actionMessages.notSignedIn,
    };
  }

  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      ok: false,
      message: getDictionary("hr").appointments.actionMessages.noOrganization,
    };
  }

  const organizationId = permissions.organizationId;
  const t = getDictionary(permissions.organizationLocale).appointments.actionMessages;

  const { data: beforeAppointment, error: beforeError } = await supabase
    .from("appointments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", appointmentId)
    .maybeSingle();

  if (beforeError) {
    return {
      ok: false,
      message: beforeError.message,
    };
  }

  if (!beforeAppointment) {
    return {
      ok: false,
      message: t.appointmentNotFound,
    };
  }

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
      beforeAppointment.client_name ?? `appointment ${appointmentId}`,
    details: {
      before: beforeAppointment,
    },
  });

  revalidateAppointmentPaths(appointmentDate);

  return {
    ok: true,
    message: t.deleted,
  };
}
