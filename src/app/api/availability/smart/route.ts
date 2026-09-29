import { NextResponse } from "next/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getSmartAvailability } from "@/features/availability/smart-availability";
import type { AppointmentServiceInput } from "@/features/appointments/types";

type SmartAvailabilityRequestBody = {
  date?: string;
  items?: AppointmentServiceInput[];
  excludeAppointmentId?: string;
};

function normalizeItems(items: unknown): AppointmentServiceInput[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      service_id:
        typeof item?.service_id === "string" ? item.service_id.trim() : "",
      duration_minutes: Number(item?.duration_minutes ?? 0),
    }))
    .filter(
      (item) =>
        item.service_id.length > 0 &&
        Number.isFinite(item.duration_minutes) &&
        item.duration_minutes > 0,
    );
}

export async function POST(request: Request) {
  let body: SmartAvailabilityRequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Neispravan JSON payload." },
      { status: 400 },
    );
  }

  const date = typeof body.date === "string" ? body.date : "";
  const items = normalizeItems(body.items);
  const excludeAppointmentId =
    typeof body.excludeAppointmentId === "string" &&
    body.excludeAppointmentId.trim()
      ? body.excludeAppointmentId.trim()
      : undefined;

  if (!date || items.length === 0) {
    return NextResponse.json(
      { error: "Date i items su obavezni." },
      { status: 400 },
    );
  }

  const permissions = await getCurrentUserPermissions();
  if (!permissions) {
    return NextResponse.json({ error: "Niste prijavljeni." }, { status: 401 });
  }

  try {
    const result = await getSmartAvailability({
      date,
      items,
      excludeAppointmentId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Smart availability lookup failed:", error);
    return NextResponse.json(
      { error: "Greška pri dohvaćanju dostupnosti." },
      { status: 500 },
    );
  }
}
