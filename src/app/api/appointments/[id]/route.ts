import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import {
  appointmentDatabaseErrorMessage,
  validateAppointmentRuntime,
} from "@/features/appointments/runtime-validation";
import {
  refreshWaitlistOpportunitiesAfterOccupiedSlot,
  refreshWaitlistOpportunitiesForFreedSlot,
} from "@/features/waitlist/opportunities";

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
  return {
    first_name: parts.shift() || fullName.trim(),
    last_name: parts.join(" ") || null,
  };
}

function blocksAvailability(status: string | null | undefined) {
  return ["scheduled", "confirmed", "completed"].includes(status ?? "");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const permissions = await getCurrentUserPermissions();
    if (!permissions) {
      return NextResponse.json(
        { error: "Niste prijavljeni ili nemate aktivan salon." },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const organizationId = permissions.organizationId;
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
    const internalNotes = value(body.internal_notes) || null;
    const status = value(body.status) || "scheduled";

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

    if (
      !["scheduled", "confirmed", "completed", "cancelled", "no_show"].includes(
        status,
      )
    ) {
      return NextResponse.json(
        { error: "Status termina nije valjan." },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: existingAppointment, error: existingAppointmentError } =
      await supabase
        .from("appointments")
        .select(
          "id, appointment_date, start_time, end_time, employee_id, room_id, status",
        )
        .eq("id", id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (existingAppointmentError) {
      return NextResponse.json(
        { error: existingAppointmentError.message },
        { status: 400 },
      );
    }
    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Termin nije pronađen." },
        { status: 404 },
      );
    }

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
        { error: "Odabrani zaposlenik nije dostupan." },
        { status: 400 },
      );
    }
    if (!service) {
      return NextResponse.json(
        { error: "Odabrana usluga nije dostupna." },
        { status: 400 },
      );
    }
    if (!room) {
      return NextResponse.json(
        { error: "Odabrana soba nije dostupna." },
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
    if (blocksAvailability(status)) {
      const runtimeValidation = await validateAppointmentRuntime({
        organizationId,
        appointmentId: id,
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
    }

    let clientId: string | null = null;
    if (clientIdInput) {
      const { data: existingClient, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientIdInput)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (clientError) {
        return NextResponse.json(
          { error: clientError.message },
          { status: 400 },
        );
      }
      if (!existingClient) {
        return NextResponse.json(
          { error: "Odabrani klijent ne pripada ovom salonu." },
          { status: 400 },
        );
      }
      clientId = existingClient.id;
    } else {
      const nameParts = splitClientName(clientName);
      const { data: newClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: organizationId,
          ...nameParts,
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
    const { error: appointmentError } = await supabase
      .from("appointments")
      .update({
        client_id: clientId,
        employee_id: employeeId,
        room_id: roomId,
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: endTime,
        status,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail,
        notes,
        internal_notes: internalNotes,
        total_price: price,
      })
      .eq("id", id)
      .eq("organization_id", organizationId);

    if (appointmentError) {
      return NextResponse.json(
        { error: appointmentDatabaseErrorMessage(appointmentError.message) },
        { status: 400 },
      );
    }

    const { error: deleteServiceError } = await supabase
      .from("appointment_services")
      .delete()
      .eq("appointment_id", id)
      .eq("organization_id", organizationId);
    if (deleteServiceError) {
      return NextResponse.json(
        { error: deleteServiceError.message },
        { status: 400 },
      );
    }

    const { error: insertServiceError } = await supabase
      .from("appointment_services")
      .insert({
        organization_id: organizationId,
        appointment_id: id,
        service_id: service.id,
        service_name: service.name,
        duration_minutes: durationMinutes,
        price,
        sort_order: 0,
      });
    if (insertServiceError) {
      return NextResponse.json(
        { error: insertServiceError.message },
        { status: 400 },
      );
    }

    const previousStart = existingAppointment.start_time?.slice(0, 5) ?? "";
    const previousEnd = existingAppointment.end_time?.slice(0, 5) ?? "";
    const previousWasBlocking = blocksAvailability(existingAppointment.status);
    const nextIsBlocking = blocksAvailability(status);
    const oldSlotChanged =
      existingAppointment.appointment_date !== appointmentDate ||
      previousStart !== startTime.slice(0, 5) ||
      previousEnd !== endTime.slice(0, 5) ||
      existingAppointment.employee_id !== employeeId ||
      existingAppointment.room_id !== roomId;

    try {
      if (
        previousWasBlocking &&
        existingAppointment.employee_id &&
        previousStart &&
        previousEnd &&
        (oldSlotChanged || !nextIsBlocking)
      ) {
        await refreshWaitlistOpportunitiesForFreedSlot({
          organizationId,
          date: existingAppointment.appointment_date,
          startTime: previousStart,
          endTime: previousEnd,
          employeeId: existingAppointment.employee_id,
        });
      }

      if (nextIsBlocking) {
        await refreshWaitlistOpportunitiesAfterOccupiedSlot({
          organizationId,
          date: appointmentDate,
          startTime,
          endTime,
          employeeId,
          roomId,
        });
      }
    } catch (waitlistSyncError) {
      console.error("Waitlist opportunities could not be synchronized:", waitlistSyncError);
    }

    return NextResponse.json({
      ok: true,
      redirectTo: `/dashboard/calendar?date=${appointmentDate}`,
    });
  } catch (error) {
    console.error("Greška pri uređivanju termina:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Termin nije moguće urediti.",
      },
      { status: 500 },
    );
  }
}
