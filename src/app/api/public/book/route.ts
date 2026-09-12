import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

type Slot = {
  start_time: string;
  end_time: string;
  employee_id: string;
  employee_name: string;
  room_id: string;
  room_name: string;
};

export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for");

    const ip =
      forwardedFor?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimit = await checkRateLimit({
      ip,
      endpoint: "public-booking",
      limit: 5,
      windowMinutes: 10,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error:
            "Previše pokušaja rezervacije. Molimo pokušajte ponovno za nekoliko minuta.",
        },
        { status: 429 },
      );
    }
    const body = await request.json();

    const organizationSlug = String(body.organizationSlug ?? "").trim();
    const serviceId = String(body.serviceId ?? "").trim();
    const date = String(body.date ?? "").trim();

    const fullName = String(body.fullName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim() || null;
    const note = String(body.note ?? "").trim() || null;
    const lang = body.lang === "en" || body.lang === "it" ? body.lang : "hr";

    const slot = body.slot as Slot | null;

    if (!organizationSlug || !serviceId || !date || !fullName || (!phone && !email) || !slot) {
      return NextResponse.json(
        { error: "Ime, kontakt podatak, usluga, datum i termin su obavezni." },
        { status: 400 },
      );
    }

    const normalizedPhone = phone.replace(/\s+/g, "");
    const hasCroatianPhone =
      normalizedPhone.startsWith("+385") ||
      normalizedPhone.startsWith("00385") ||
      normalizedPhone.startsWith("09");

    if (phone && !hasCroatianPhone && !email) {
      return NextResponse.json(
        {
          error:
            "SMS potvrde šalju se samo na hrvatske brojeve. Ako nemate hrvatski broj, unesite email.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, slug, is_active")
      .eq("slug", organizationSlug)
      .eq("is_active", true)
      .maybeSingle();

    if (organizationError) {
      return NextResponse.json({ error: organizationError.message }, { status: 500 });
    }

    if (!organization) {
      return NextResponse.json({ error: "Salon nije pronađen." }, { status: 404 });
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
      return NextResponse.json(
        { error: serviceError.message },
        { status: 500 },
      );
    }

    if (!service) {
      return NextResponse.json(
        { error: "Odabrana usluga nije dostupna za online rezervacije." },
        { status: 404 },
      );
    }

    // Spriječi dupli klik / dupli submit:
    // isti broj + ista usluga + isti datum + isto vrijeme unutar zadnjih 60 sekundi
    const { data: recentDuplicateRequest, error: recentDuplicateError } =
      await supabase
        .from("online_booking_requests")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("client_phone", phone)
        .eq("service_id", serviceId)
        .eq("requested_date", date)
        .eq("start_time", slot.start_time)
        .gte("created_at", new Date(Date.now() - 60 * 1000).toISOString())
        .limit(1);

    if (recentDuplicateError) {
      return NextResponse.json(
        { error: recentDuplicateError.message },
        { status: 500 },
      );
    }

    if (recentDuplicateRequest && recentDuplicateRequest.length > 0) {
      return NextResponse.json(
        { error: "Zahtjev je već poslan. Molimo pričekajte." },
        { status: 400 },
      );
    }

    const { data: existingRequest, error: existingRequestError } =
      await supabase
        .from("online_booking_requests")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("requested_date", date)
        .eq("start_time", slot.start_time)
        .eq("suggested_employee_id", slot.employee_id)
        .eq("status", "pending")
        .maybeSingle();

    if (existingRequestError) {
      return NextResponse.json(
        { error: existingRequestError.message },
        { status: 500 },
      );
    }

    if (existingRequest) {
      return NextResponse.json(
        {
          error:
            "Za ovaj termin već postoji zahtjev za rezervaciju. Molimo odaberi drugi termin.",
        },
        { status: 409 },
      );
    }

    const { data: existingAppointment, error: existingAppointmentError } =
      await supabase
        .from("appointments")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("appointment_date", date)
        .eq("start_time", slot.start_time)
        .eq("employee_id", slot.employee_id)
        .in("status", ["scheduled", "confirmed", "completed"])
        .maybeSingle();

    if (existingAppointmentError) {
      return NextResponse.json(
        { error: existingAppointmentError.message },
        { status: 500 },
      );
    }

    if (existingAppointment) {
      return NextResponse.json(
        {
          error:
            "Termin je u međuvremenu rezerviran. Molimo odaberi drugi termin.",
        },
        { status: 409 },
      );
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("online_booking_requests")
      .insert({
        organization_id: organization.id,
        service_id: serviceId,
        requested_date: date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration_minutes: service.duration_minutes,

        suggested_employee_id: slot.employee_id,
        suggested_room_id: slot.room_id,

        final_employee_id: slot.employee_id,
        final_room_id: slot.room_id,
        final_duration_minutes: service.duration_minutes,

        client_full_name: fullName,
        client_phone: phone,
        client_email: email,
        client_note: note,
        language: lang,

        status: "pending",
      })
      .select("id")
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json(
        {
          error:
            requestError?.message ||
            "Greška pri spremanju zahtjeva za rezervaciju.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      requestId: requestRow.id,
      message:
        "Zahtjev za rezervaciju je poslan. Salon će provjeriti termin i poslati potvrdu.",
    });
  } catch (error) {
    console.error("Public booking route failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Došlo je do neočekivane greške pri rezervaciji.",
      },
      { status: 500 },
    );
  }
}
