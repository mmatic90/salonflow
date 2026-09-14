import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import {
  appointmentDatabaseErrorMessage,
  validateAppointmentRuntime,
} from "@/features/appointments/runtime-validation";
import { refreshWaitlistOpportunitiesAfterOccupiedSlot } from "@/features/waitlist/opportunities";
import { sendBookingAcceptedEmail } from "@/lib/email/booking-email";
import type { AppLocale } from "@/lib/i18n";

function value(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

function addMinutes(startTime: string, minutes: number) {
  const [hours, mins] = startTime.slice(0, 5).split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const nextHours = Math.floor(total / 60) % 24;
  const nextMinutes = total % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function splitClientName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? fullName.trim(), lastName: null };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function formatDate(date: string, locale: AppLocale) {
  const localeCode = locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getSalonAddress(organization: {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
}) {
  return [
    organization.address_line_1,
    organization.address_line_2,
    [organization.postal_code, organization.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function waitlistIdFromRequest(request: Request, body: Record<string, unknown>) {
  const explicitId = value(body.waitlist_id);
  if (explicitId) return explicitId;

  const referrer = request.headers.get("referer");
  if (!referrer) return null;

  try {
    return new URL(referrer).searchParams.get("waitlistId")?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const permissions = await getCurrentUserPermissions();
    if (!permissions) {
      return NextResponse.json(
        { error: "Niste prijavljeni ili nemate aktivan salon." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const organizationId = permissions.organizationId;
    const waitlistId = waitlistIdFromRequest(request, body);
    const appointmentDate = value(body.appointment_date);
    const startTime = value(body.start_time);
    const clientName = value(body.client_name);
    const clientPhone = value(body.client_phone) || null;
    const clientEmail = value(body.client_email) || null;
    const clientIdInput = value(body.client_id);
    const employeeId = value(body.employee_id);
    const roomId = value(body.room_id);
    const serviceId = value(body.service_id);
    const notes = value(body.notes) || null;

    if (
      !appointmentDate ||
      !startTime ||
      !clientName ||
      !employeeId ||
      !roomId ||
      !serviceId
    ) {
      return NextResponse.json(
        {
          error:
            "Datum, vrijeme, klijent, zaposlenik, soba i usluga su obavezni.",
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const [
      { data: employee, error: employeeError },
      { data: service, error: serviceError },
      { data: room, error: roomError },
    ] = await Promise.all([
      supabase
        .from("employees")
        .select("id")
        .eq("id", employeeId)
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("services")
        .select("id, name, duration_minutes, price")
        .eq("id", serviceId)
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase
        .from("rooms")
        .select("id")
        .eq("id", roomId)
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    if (employeeError) {
      return NextResponse.json({ error: employeeError.message }, { status: 400 });
    }
    if (serviceError) {
      return NextResponse.json({ error: serviceError.message }, { status: 400 });
    }
    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 400 });
    }
    if (!employee) {
      return NextResponse.json(
        { error: "Odabrani zaposlenik nije dostupan u ovom salonu." },
        { status: 400 },
      );
    }
    if (!service) {
      return NextResponse.json(
        { error: "Odabrana usluga nije dostupna u ovom salonu." },
        { status: 400 },
      );
    }
    if (!room) {
      return NextResponse.json(
        { error: "Odabrana soba nije dostupna u ovom salonu." },
        { status: 400 },
      );
    }

    const [employeeMappingResult, roomMappingResult] = await Promise.all([
      supabase
        .from("employee_services")
        .select("employee_id")
        .eq("organization_id", organizationId)
        .eq("employee_id", employeeId)
        .eq("service_id", serviceId)
        .maybeSingle(),
      supabase
        .from("service_rooms")
        .select("room_id")
        .eq("organization_id", organizationId)
        .eq("service_id", serviceId)
        .eq("room_id", roomId)
        .maybeSingle(),
    ]);

    if (employeeMappingResult.error) {
      return NextResponse.json(
        { error: employeeMappingResult.error.message },
        { status: 400 },
      );
    }
    if (roomMappingResult.error) {
      return NextResponse.json(
        { error: roomMappingResult.error.message },
        { status: 400 },
      );
    }
    if (!employeeMappingResult.data) {
      return NextResponse.json(
        { error: "Odabrani zaposlenik ne radi ovu uslugu." },
        { status: 400 },
      );
    }
    if (!roomMappingResult.data) {
      return NextResponse.json(
        { error: "Odabrana usluga ne može se izvoditi u odabranoj sobi." },
        { status: 400 },
      );
    }

    const durationMinutes = Number(service.duration_minutes ?? 0);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return NextResponse.json(
        { error: "Odabrana usluga nema valjano trajanje." },
        { status: 400 },
      );
    }

    const endTime = addMinutes(startTime, durationMinutes);
    const runtimeValidation = await validateAppointmentRuntime({
      organizationId,
      appointmentDate,
      startTime,
      endTime,
      employeeId,
      roomId,
    });
    if (!runtimeValidation.ok) {
      return NextResponse.json(
        { error: runtimeValidation.message },
        { status: 400 },
      );
    }

    let clientId: string | null = null;
    const { firstName, lastName } = splitClientName(clientName);

    if (clientIdInput) {
      const { data: existingClient, error: existingClientError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientIdInput)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (existingClientError) {
        return NextResponse.json(
          { error: existingClientError.message },
          { status: 400 },
        );
      }
      if (!existingClient) {
        return NextResponse.json(
          { error: "Odabrani klijent ne pripada ovom salonu." },
          { status: 400 },
        );
      }

      const { error: clientUpdateError } = await supabase
        .from("clients")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: clientPhone,
          email: clientEmail,
        })
        .eq("id", existingClient.id)
        .eq("organization_id", organizationId);

      if (clientUpdateError) {
        return NextResponse.json(
          {
            error:
              clientUpdateError.message ||
              "Podatke klijenta nije moguće ažurirati.",
          },
          { status: 400 },
        );
      }

      clientId = existingClient.id;
    } else {
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: organizationId,
          first_name: firstName,
          last_name: lastName,
          phone: clientPhone,
          email: clientEmail,
          is_active: true,
        })
        .select("id")
        .single();
      if (clientError || !newClient) {
        return NextResponse.json(
          {
            error:
              clientError?.message || "Klijenta nije moguće spremiti.",
          },
          { status: 400 },
        );
      }
      clientId = newClient.id;
    }

    const parsedPrice = service.price == null ? null : Number(service.price);
    const price = Number.isFinite(parsedPrice) ? parsedPrice : null;
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        organization_id: organizationId,
        client_id: clientId,
        employee_id: employeeId,
        room_id: roomId,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        status: "scheduled",
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        notes,
        total_price: price,
        created_by: permissions.userId,
      })
      .select("id")
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        {
          error: appointmentDatabaseErrorMessage(
            appointmentError?.message || "Termin nije moguće spremiti.",
          ),
        },
        { status: 400 },
      );
    }

    const { error: appointmentServiceError } = await supabase
      .from("appointment_services")
      .insert({
        organization_id: organizationId,
        appointment_id: appointment.id,
        service_id: service.id,
        service_name: service.name,
        duration_minutes: durationMinutes,
        price,
        sort_order: 0,
      });

    if (appointmentServiceError) {
      await supabase.from("appointments").delete().eq("id", appointment.id);
      return NextResponse.json(
        { error: appointmentServiceError.message },
        { status: 400 },
      );
    }

    if (waitlistId && clientId) {
      const { error: waitlistError } = await supabase
        .from("waitlist_entries")
        .update({
          status: "booked",
          booked_appointment_id: appointment.id,
          matched_date: null,
          matched_start_time: null,
          matched_end_time: null,
          matched_employee_id: null,
          matched_room_id: null,
          matched_at: null,
        })
        .eq("id", waitlistId)
        .eq("organization_id", organizationId)
        .eq("status", "waiting")
        .eq("client_id", clientId)
        .eq("service_id", service.id);

      if (waitlistError) {
        console.error(
          "Waitlist entry could not be closed after booking:",
          waitlistError.message,
        );
      }
    }

    try {
      await refreshWaitlistOpportunitiesAfterOccupiedSlot({
        organizationId,
        date: appointmentDate,
        startTime,
        endTime,
        employeeId,
        roomId,
      });
    } catch (waitlistSyncError) {
      console.error("Waitlist opportunities could not be refreshed:", waitlistSyncError);
    }

    if (clientEmail) {
      try {
        const { data: organization } = await supabase
          .from("organizations")
          .select(
            "name, phone, address_line_1, address_line_2, city, postal_code, logo_url",
          )
          .eq("id", organizationId)
          .maybeSingle();

        await sendBookingAcceptedEmail({
          to: clientEmail,
          salonName: organization?.name ?? permissions.organizationName,
          salonPhone: organization?.phone ?? null,
          salonAddress: organization ? getSalonAddress(organization) : null,
          salonLogoUrl: organization?.logo_url ?? null,
          serviceName: service.name,
          date: formatDate(appointmentDate, permissions.organizationLocale),
          time: startTime.slice(0, 5),
          lang: permissions.organizationLocale,
        });
      } catch (emailError) {
        console.error("Appointment confirmation email could not be sent:", emailError);
      }
    }

    return NextResponse.json({
      ok: true,
      appointmentId: appointment.id,
      redirectTo: `/dashboard/calendar?date=${appointmentDate}`,
    });
  } catch (error) {
    console.error("Greška pri stvaranju termina:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Termin nije moguće spremiti.",
      },
      { status: 500 },
    );
  }
}
