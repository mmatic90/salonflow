import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicBookingAvailability } from "@/features/public-booking/availability";
import type { AppointmentServiceInput } from "@/features/appointments/types";

type PublicAvailabilityBody = {
  organizationSlug?: string;
  date?: string;
  serviceId?: string;
};

function isExpiredTrial(organization: {
  lifecycle_status: string | null;
  trial_ends_at: string | null;
}) {
  if (organization.lifecycle_status !== "trial") return false;
  if (!organization.trial_ends_at) return true;

  const trialEnd = new Date(organization.trial_ends_at).getTime();
  return !Number.isFinite(trialEnd) || trialEnd <= Date.now();
}

export async function POST(request: Request) {
  let body: PublicAvailabilityBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Neispravan JSON payload." },
      { status: 400 },
    );
  }

  const organizationSlug =
    typeof body.organizationSlug === "string" ? body.organizationSlug.trim() : "";
  const date = typeof body.date === "string" ? body.date : "";
  const serviceId =
    typeof body.serviceId === "string" ? body.serviceId.trim() : "";

  if (!organizationSlug || !date || !serviceId) {
    return NextResponse.json(
      { error: "Datum i usluga su obavezni." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, lifecycle_status, trial_ends_at")
    .eq("slug", organizationSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 });
  }

  if (!organization) {
    return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });
  }

  if (isExpiredTrial(organization)) {
    return NextResponse.json(
      { error: "Online rezervacije trenutačno nisu dostupne." },
      { status: 403 },
    );
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id, organization_id, duration_minutes, is_active, is_online_bookable")
    .eq("organization_id", organization.id)
    .eq("id", serviceId)
    .eq("is_active", true)
    .eq("is_online_bookable", true)
    .maybeSingle();

  if (serviceError) {
    return NextResponse.json({ error: serviceError.message }, { status: 500 });
  }

  if (!service) {
    return NextResponse.json(
      { error: "Usluga nije dostupna za online rezervacije." },
      { status: 404 },
    );
  }

  const items: AppointmentServiceInput[] = [
    {
      service_id: service.id,
      duration_minutes: service.duration_minutes,
    },
  ];

  try {
    const result = await getPublicBookingAvailability({
      organizationId: organization.id,
      date,
      items,
      intervalMinutes: 30,
      maxSuggestions: 999,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Greška pri dohvaćanju dostupnosti.",
      },
      { status: 500 },
    );
  }
}
