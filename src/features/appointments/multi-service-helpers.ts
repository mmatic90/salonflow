import { createClient } from "@/lib/supabase/server";
import { calculateTotalDuration } from "@/features/appointments/calculate-total-duration";
import type { AppointmentServiceInput } from "@/features/appointments/types";
import { getCurrentUserPermissions } from "@/lib/permissions";

export function parseAppointmentServicesJson(
  formData: FormData,
):
  | { ok: true; items: AppointmentServiceInput[] }
  | { ok: false; message: string } {
  const raw = String(formData.get("services_json") ?? "[]");

  let parsed: AppointmentServiceInput[] = [];

  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      ok: false,
      message: "Neispravan format odabranih usluga.",
    };
  }

  const items = parsed
    .map((item) => ({
      service_id: String(item.service_id ?? "").trim(),
      duration_minutes: Number(item.duration_minutes ?? 0),
    }))
    .filter((item) => item.service_id && item.duration_minutes > 0);

  if (items.length === 0) {
    return {
      ok: false,
      message: "Potrebna je barem jedna usluga.",
    };
  }

  return {
    ok: true,
    items,
  };
}

export async function validateAppointmentServicesForEmployeeAndRoom(args: {
  employeeId: string;
  roomId: string;
  items: AppointmentServiceInput[];
}) {
  const { employeeId, roomId, items } = args;
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      ok: false,
      message: "Nemate pristup aktivnom salonu.",
    };
  }

  const serviceIds = items.map((item) => item.service_id);

  const [
    { data: employeeAllowed, error: employeeAllowedError },
    { data: roomAllowed, error: roomAllowedError },
  ] = await Promise.all([
    supabase
      .from("employee_services")
      .select("service_id")
      .eq("organization_id", permissions.organizationId)
      .eq("employee_id", employeeId)
      .in("service_id", serviceIds),

    supabase
      .from("service_rooms")
      .select("service_id")
      .eq("organization_id", permissions.organizationId)
      .eq("room_id", roomId)
      .in("service_id", serviceIds),
  ]);

  if (employeeAllowedError) {
    return {
      ok: false,
      message: employeeAllowedError.message,
    };
  }

  if (roomAllowedError) {
    return {
      ok: false,
      message: roomAllowedError.message,
    };
  }

  const employeeSet = new Set(
    (employeeAllowed ?? []).map((row) => row.service_id),
  );
  const roomSet = new Set((roomAllowed ?? []).map((row) => row.service_id));

  for (const item of items) {
    if (!employeeSet.has(item.service_id)) {
      return {
        ok: false,
        message:
          "Odabrani zaposlenik ne može raditi jednu ili više odabranih usluga.",
      };
    }

    if (!roomSet.has(item.service_id)) {
      return {
        ok: false,
        message:
          "Odabrana soba nije dozvoljena za jednu ili više odabranih usluga.",
      };
    }
  }

  return {
    ok: true,
    totalDuration: calculateTotalDuration(items),
    primaryServiceId: items[0].service_id,
  };
}
