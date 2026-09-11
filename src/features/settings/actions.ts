"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireAdminForSettings } from "@/lib/page-guards";

export type SettingsActionState = {
  error: string;
  success: string;
};

export type EmployeeFormValues = {
  display_name: string;
  email: string;
  phone: string;
  color_hex: string;
  password: string;
};

export type EmployeeActionState = {
  error: string;
  success: string;
  values: EmployeeFormValues;
};

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() || displayName.trim(),
    lastName: parts.length ? parts.join(" ") : null,
  };
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Niste prijavljeni.");
  }

  return supabase;
}

export async function createServiceAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const durationMinutes = Number(formData.get("duration_minutes") ?? 0);
    const priceRaw = String(formData.get("price") ?? "").trim();
    const price = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
    const category = String(formData.get("category") ?? "").trim();

    if (!name) return { error: "Naziv usluge je obavezan.", success: "" };
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return { error: "Trajanje mora biti veće od 0.", success: "" };
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return { error: "Cijena nije ispravna.", success: "" };
    }

    const payload = {
      organization_id: permissions.organizationId,
      name,
      description: description || null,
      duration_minutes: durationMinutes,
      price,
      currency: "EUR",
      category: category || null,
      is_active: true,
      is_online_bookable: false,
    };

    const { data, error } = await supabase
      .from("services")
      .insert(payload)
      .select("id")
      .single();

    if (error) return { error: error.message, success: "" };

    await writeAuditLog({
      action: "service_created",
      entityType: "service",
      entityId: data?.id ?? null,
      entityLabel: name,
      details: payload,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/services");
    return { error: "", success: "Usluga je dodana." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Došlo je do greške.",
      success: "",
    };
  }
}

export async function createRoomAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return { error: "Naziv sobe je obavezan.", success: "" };
    }

    const payload = {
      organization_id: permissions.organizationId,
      name,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("rooms")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return { error: error.message, success: "" };
    }

    await writeAuditLog({
      action: "room_created",
      entityType: "room",
      entityId: data?.id ?? null,
      entityLabel: name,
      details: payload,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/rooms");

    return { error: "", success: "Soba je dodana." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Došlo je do greške.",
      success: "",
    };
  }
}

export async function createEquipmentAction(
  _prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();

    const name = String(formData.get("name") ?? "").trim();
    const quantity = Number(formData.get("quantity_total") ?? 0);

    if (!name) {
      return { error: "Naziv opreme je obavezan.", success: "" };
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: "Količina mora biti veća od 0.", success: "" };
    }

    const payload = {
      name,
      organization_id: permissions.organizationId,
      quantity_total: quantity,
      is_active: true,
    };

    const { data, error } = await supabase
      .from("equipment")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return { error: error.message, success: "" };
    }

    await writeAuditLog({
      action: "equipment_created",
      entityType: "equipment",
      entityId: data?.id ?? null,
      entityLabel: name,
      details: payload,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/equipment");

    return { error: "", success: "Oprema je dodana." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Došlo je do greške.",
      success: "",
    };
  }
}

export async function deleteServiceAction(serviceId: string) {
  try {
    const supabase = await requireUser();

    const { data: beforeItem } = await supabase
      .from("services")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();

    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", serviceId);

    if (error) {
      return {
        ok: false,
        message:
          "Uslugu nije moguće obrisati jer je već povezana s drugim podacima ili se koristi u sustavu.",
      };
    }

    await writeAuditLog({
      action: "service_deleted",
      entityType: "service",
      entityId: serviceId,
      entityLabel: beforeItem?.name ?? null,
      details: {
        before: beforeItem,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/services");

    return {
      ok: true,
      message: "Usluga je obrisana.",
    };
  } catch {
    return {
      ok: false,
      message: "Došlo je do greške prilikom brisanja usluge.",
    };
  }
}

export async function deleteRoomAction(roomId: string) {
  try {
    const supabase = await requireUser();

    const { data: beforeItem } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle();

    const { error } = await supabase.from("rooms").delete().eq("id", roomId);

    if (error) {
      return {
        ok: false,
        message:
          "Sobu nije moguće obrisati jer je već povezana s drugim podacima ili se koristi u sustavu.",
      };
    }

    await writeAuditLog({
      action: "room_deleted",
      entityType: "room",
      entityId: roomId,
      entityLabel: beforeItem?.name ?? null,
      details: {
        before: beforeItem,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/rooms");

    return {
      ok: true,
      message: "Soba je obrisana.",
    };
  } catch {
    return {
      ok: false,
      message: "Došlo je do greške prilikom brisanja sobe.",
    };
  }
}

export async function deleteEquipmentAction(equipmentId: string) {
  try {
    const supabase = await requireUser();

    const { data: beforeItem } = await supabase
      .from("equipment")
      .select("*")
      .eq("id", equipmentId)
      .maybeSingle();

    const { error } = await supabase
      .from("equipment")
      .delete()
      .eq("id", equipmentId);

    if (error) {
      return {
        ok: false,
        message:
          "Opremu nije moguće obrisati jer je već povezana s drugim podacima ili se koristi u sustavu.",
      };
    }

    await writeAuditLog({
      action: "equipment_deleted",
      entityType: "equipment",
      entityId: equipmentId,
      entityLabel: beforeItem?.name ?? null,
      details: {
        before: beforeItem,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/equipment");

    return {
      ok: true,
      message: "Oprema je obrisana.",
    };
  } catch {
    return {
      ok: false,
      message: "Došlo je do greške prilikom brisanja opreme.",
    };
  }
}

export async function bulkUpdateServicesAction(
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number | null;
    service_group: string | null;
    priority_room: string | null;
    is_active: boolean;
    is_online_bookable: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();

    for (const item of items) {
      if (!item.name.trim()) {
        return {
          ok: false,
          message: "Svaka usluga mora imati naziv.",
        };
      }

      if (
        !Number.isFinite(item.duration_minutes) ||
        item.duration_minutes <= 0
      ) {
        return {
          ok: false,
          message: "Trajanje svake usluge mora biti veće od 0.",
        };
      }
    }

    const ids = items.map((item) => item.id);

    const { data: beforeItems } = await supabase
      .from("services")
      .select("*")
      .in("id", ids);

    const payload = items.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      description: item.description?.trim() || null,
      duration_minutes: item.duration_minutes,
      price_cents:
        item.price_cents === null || item.price_cents === undefined
          ? null
          : Number(item.price_cents),
      service_group: item.service_group?.trim() || null,
      priority_room: item.priority_room?.trim() || null,
      is_active: Boolean(item.is_active),
      is_online_bookable: Boolean(item.is_online_bookable),
    }));

    const { error } = await supabase
      .from("services")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await writeAuditLog({
      action: "services_bulk_updated",
      entityType: "service",
      entityLabel: "bulk update services",
      details: {
        before: beforeItems ?? [],
        after: payload,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/services");

    return {
      ok: true,
      message: "Izmjene usluga su spremljene.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateRoomsAction(
  items: Array<{
    id: string;
    name: string;
    is_active: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();

    for (const item of items) {
      if (!item.name.trim()) {
        return {
          ok: false,
          message: "Svaka soba mora imati naziv.",
        };
      }
    }

    const ids = items.map((item) => item.id);

    const { data: beforeItems } = await supabase
      .from("rooms")
      .select("*")
      .in("id", ids);

    const payload = items.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      is_active: item.is_active,
    }));

    const { error } = await supabase
      .from("rooms")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await writeAuditLog({
      action: "rooms_bulk_updated",
      entityType: "room",
      entityLabel: "bulk update rooms",
      details: {
        before: beforeItems ?? [],
        after: payload,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/rooms");

    return {
      ok: true,
      message: "Izmjene soba su spremljene.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateEquipmentAction(
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    is_active: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();

    for (const item of items) {
      if (!item.name.trim()) {
        return {
          ok: false,
          message: "Svaka oprema mora imati naziv.",
        };
      }

      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        return {
          ok: false,
          message: "Količina svake opreme mora biti veća od 0.",
        };
      }
    }

    const ids = items.map((item) => item.id);

    const { data: beforeItems } = await supabase
      .from("equipment")
      .select("*")
      .in("id", ids);

    const payload = items.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      quantity: item.quantity,
      is_active: item.is_active,
    }));

    const { error } = await supabase
      .from("equipment")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await writeAuditLog({
      action: "equipment_bulk_updated",
      entityType: "equipment",
      entityLabel: "bulk update equipment",
      details: {
        before: beforeItems ?? [],
        after: payload,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/equipment");

    return {
      ok: true,
      message: "Izmjene opreme su spremljene.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateServiceRoomsAction(
  items: Array<{
    service_id: string;
    room_ids: string[];
  }>,
) {
  try {
    const supabase = await requireUser();

    const serviceIds = items
      .map((item) => item.service_id)
      .filter((id) => typeof id === "string" && id.length > 0);

    const { data: beforeRows } = await supabase
      .from("service_rooms")
      .select("*")
      .in("service_id", serviceIds);

    const rows = items.flatMap((item) =>
      item.room_ids
        .filter((roomId) => typeof roomId === "string" && roomId.length > 0)
        .map((roomId) => ({
          service_id: item.service_id,
          room_id: roomId,
        })),
    );

    if (serviceIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("service_rooms")
        .delete()
        .in("service_id", serviceIds);

      if (deleteError) {
        return {
          ok: false,
          message: deleteError.message,
        };
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("service_rooms")
        .insert(rows);

      if (insertError) {
        return {
          ok: false,
          message: insertError.message,
        };
      }
    }

    await writeAuditLog({
      action: "service_rooms_bulk_updated",
      entityType: "service_room_mapping",
      entityLabel: "bulk update service rooms",
      details: {
        before: beforeRows ?? [],
        after: rows,
      },
    });

    revalidatePath("/dashboard/settings/service-rooms");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/[id]/edit");

    return {
      ok: true,
      message: "Mapiranje usluga i soba je spremljeno.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateEmployeeServicesAction(
  items: Array<{
    employee_id: string;
    service_ids: string[];
  }>,
) {
  try {
    const supabase = await requireUser();

    const employeeIds = items
      .map((item) => item.employee_id)
      .filter((id) => typeof id === "string" && id.length > 0);

    const { data: beforeRows } = await supabase
      .from("employee_services")
      .select("*")
      .in("employee_id", employeeIds);

    const rows = items.flatMap((item) =>
      item.service_ids
        .filter(
          (serviceId) => typeof serviceId === "string" && serviceId.length > 0,
        )
        .map((serviceId) => ({
          employee_id: item.employee_id,
          service_id: serviceId,
        })),
    );

    if (employeeIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("employee_services")
        .delete()
        .in("employee_id", employeeIds);

      if (deleteError) {
        return {
          ok: false,
          message: deleteError.message,
        };
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("employee_services")
        .insert(rows);

      if (insertError) {
        return {
          ok: false,
          message: insertError.message,
        };
      }
    }

    await writeAuditLog({
      action: "employee_services_bulk_updated",
      entityType: "employee_service_mapping",
      entityLabel: "bulk update employee services",
      details: {
        before: beforeRows ?? [],
        after: rows,
      },
    });

    revalidatePath("/dashboard/settings/employee-services");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/[id]/edit");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");

    return {
      ok: true,
      message: "Mapiranje zaposlenika i usluga je spremljeno.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateServiceEquipmentAction(
  items: Array<{
    service_id: string;
    equipment_ids: string[];
  }>,
) {
  try {
    const supabase = await requireUser();

    const serviceIds = items
      .map((item) => item.service_id)
      .filter((id) => typeof id === "string" && id.length > 0);

    const { data: beforeRows } = await supabase
      .from("service_equipment")
      .select("*")
      .in("service_id", serviceIds);

    const rows = items.flatMap((item) =>
      item.equipment_ids
        .filter(
          (equipmentId) =>
            typeof equipmentId === "string" && equipmentId.length > 0,
        )
        .map((equipmentId) => ({
          service_id: item.service_id,
          equipment_id: equipmentId,
        })),
    );

    if (serviceIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("service_equipment")
        .delete()
        .in("service_id", serviceIds);

      if (deleteError) {
        return {
          ok: false,
          message: deleteError.message,
        };
      }
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("service_equipment")
        .insert(rows);

      if (insertError) {
        return {
          ok: false,
          message: insertError.message,
        };
      }
    }

    await writeAuditLog({
      action: "service_equipment_bulk_updated",
      entityType: "service_equipment_mapping",
      entityLabel: "bulk update service equipment",
      details: {
        before: beforeRows ?? [],
        after: rows,
      },
    });

    revalidatePath("/dashboard/settings/service-equipment");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/[id]/edit");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");

    return {
      ok: true,
      message: "Mapiranje usluga i opreme je spremljeno.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateSalonWorkingHoursAction(
  items: Array<{
    day_of_week: number;
    opens_at: string;
    closes_at: string;
    is_closed: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();

    for (const item of items) {
      if (!item.is_closed) {
        if (!item.opens_at || !item.closes_at) {
          return {
            ok: false,
            message:
              "Za radne dane moraš unijeti vrijeme otvaranja i zatvaranja.",
          };
        }
      }
    }

    const { data: beforeRows } = await supabase
      .from("salon_working_hours")
      .select("*");

    const payload = items.map((item) => ({
      day_of_week: item.day_of_week,
      opens_at: item.is_closed ? "00:00" : item.opens_at,
      closes_at: item.is_closed ? "00:00" : item.closes_at,
      is_closed: item.is_closed,
    }));

    const { error } = await supabase
      .from("salon_working_hours")
      .upsert(payload, { onConflict: "day_of_week" });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    await writeAuditLog({
      action: "salon_hours_bulk_updated",
      entityType: "salon_working_hours",
      entityLabel: "bulk update salon hours",
      details: {
        before: beforeRows ?? [],
        after: payload,
      },
    });

    revalidatePath("/dashboard/settings/salon-hours");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments/[id]/edit");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");

    return {
      ok: true,
      message: "Radno vrijeme salona je spremljeno.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju.",
    };
  }
}

export async function bulkUpdateServiceGroupLimitsAction(
  items: Array<{
    group_name: string;
    max_parallel: number;
  }>,
) {
  try {
    const supabase = await requireUser();

    for (const item of items) {
      if (!item.group_name.trim()) {
        return {
          ok: false,
          message: "Svaka grupa mora imati naziv.",
        };
      }

      if (!Number.isFinite(item.max_parallel) || item.max_parallel <= 0) {
        return {
          ok: false,
          message: "Limit mora biti veći od 0.",
        };
      }
    }

    const payload = items.map((item) => ({
      group_name: item.group_name.trim(),
      max_parallel: item.max_parallel,
    }));

    const groupNames = items.map((item) => item.group_name.trim());

    const { data: beforeRows } = await supabase
      .from("service_group_limits")
      .select("*")
      .in("group_name", groupNames);

    if (groupNames.length > 0) {
      const { error: deleteError } = await supabase
        .from("service_group_limits")
        .delete()
        .in("group_name", groupNames);

      if (deleteError) {
        return {
          ok: false,
          message: deleteError.message,
        };
      }
    }

    if (payload.length > 0) {
      const { error: insertError } = await supabase
        .from("service_group_limits")
        .insert(payload);

      if (insertError) {
        return {
          ok: false,
          message: insertError.message,
        };
      }
    }

    await writeAuditLog({
      action: "service_group_limits_bulk_updated",
      entityType: "service_group_limit",
      entityLabel: "bulk update service group limits",
      details: {
        before: beforeRows ?? [],
        after: payload,
      },
    });

    revalidatePath("/dashboard/settings/group-limits");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/[id]/edit");

    return {
      ok: true,
      message: "Group limits su spremljeni.",
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Greška pri spremanju.",
    };
  }
}

export async function bulkUpdateEmployeesAction(
  items: Array<{
    id: string;
    display_name: string;
    color_hex: string | null;
    is_active: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();

    for (const item of items) {
      if (!item.display_name.trim()) {
        return {
          ok: false,
          message: "Svaki djelatnik mora imati ime.",
        };
      }
    }

    const ids = items.map((item) => item.id);

    const { data: beforeItems, error: fetchError } = await supabase
      .from("employees")
      .select("id, display_name, color_hex, is_active, profile_id")
      .in("id", ids);

    if (fetchError) {
      return {
        ok: false,
        message: fetchError.message,
      };
    }

    for (const item of items) {
      const beforeEmployee = (beforeItems ?? []).find(
        (row) => row.id === item.id,
      );

      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          display_name: item.display_name.trim(),
          color_hex: item.color_hex?.trim() || null,
          is_active: item.is_active,
        })
        .eq("id", item.id);

      if (employeeError) {
        return {
          ok: false,
          message: `Greška za djelatnika "${item.display_name}": ${employeeError.message}`,
        };
      }

      if (beforeEmployee?.profile_id) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            display_name: item.display_name.trim(),
          })
          .eq("id", beforeEmployee.profile_id);

        if (profileError) {
          return {
            ok: false,
            message: `Greška pri spremanju profila za "${item.display_name}": ${profileError.message}`,
          };
        }
      }
    }

    await writeAuditLog({
      action: "employee_updated",
      entityType: "employee",
      entityLabel: "bulk update employees",
      details: {
        before: beforeItems ?? [],
        after: items.map((item) => ({
          id: item.id,
          display_name: item.display_name.trim(),
          color_hex: item.color_hex?.trim() || null,
          is_active: item.is_active,
        })),
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/employees");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments/[id]/edit");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");
    revalidatePath("/dashboard/schedule");

    return {
      ok: true,
      message: "Izmjene djelatnika su spremljene.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri spremanju djelatnika.",
    };
  }
}

export async function deactivateEmployeeAction(employeeId: string) {
  try {
    const supabase = await requireUser();

    const { data: beforeEmployee, error: fetchError } = await supabase
      .from("employees")
      .select("id, display_name, color_hex, is_active, profile_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (fetchError) {
      return {
        ok: false,
        message: fetchError.message,
      };
    }

    if (!beforeEmployee) {
      return {
        ok: false,
        message: "Djelatnik nije pronađen.",
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return {
        ok: false,
        message: "Nedostaje SUPABASE_SERVICE_ROLE_KEY ili SUPABASE URL.",
      };
    }

    const { createClient: createAdminClient } =
      await import("@supabase/supabase-js");

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: employeeError } = await supabase
      .from("employees")
      .update({ is_active: false })
      .eq("id", employeeId);

    if (employeeError) {
      return {
        ok: false,
        message: employeeError.message,
      };
    }

    if (beforeEmployee.profile_id) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", beforeEmployee.profile_id);

      if (profileError) {
        return {
          ok: false,
          message: profileError.message,
        };
      }

      const { error: signOutError } = await adminClient.auth.admin.signOut(
        beforeEmployee.profile_id,
        "global",
      );

      if (signOutError) {
        console.error("Greška pri global sign out:", signOutError);
      }
    }

    await writeAuditLog({
      action: "employee_deactivated",
      entityType: "employee",
      entityId: employeeId,
      entityLabel: beforeEmployee.display_name,
      details: {
        before: beforeEmployee,
        after: {
          is_active: false,
          profile_is_active: false,
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/employees");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments/[id]/edit");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");
    revalidatePath("/dashboard/schedule");

    return {
      ok: true,
      message: "Djelatnik je deaktiviran.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri deaktivaciji djelatnika.",
    };
  }
}

export async function resetEmployeePasswordAction(employeeId: string) {
  try {
    const supabase = await requireUser();

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, display_name, profile_id")
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) {
      return {
        ok: false,
        message: employeeError.message,
      };
    }

    if (!employee?.profile_id) {
      return {
        ok: false,
        message: "Djelatnik nema povezan korisnički račun.",
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return {
        ok: false,
        message: "Nedostaje SUPABASE_SERVICE_ROLE_KEY ili SUPABASE URL.",
      };
    }

    const { createClient: createAdminClient } =
      await import("@supabase/supabase-js");

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { error: resetError } = await adminClient.auth.admin.updateUserById(
      employee.profile_id,
      {
        password: "1234",
      },
    );

    if (resetError) {
      return {
        ok: false,
        message: resetError.message,
      };
    }

    await writeAuditLog({
      action: "employee_password_reset",
      entityType: "employee",
      entityId: employeeId,
      entityLabel: employee.display_name,
      details: {
        reset_to: "1234",
      },
    });

    return {
      ok: true,
      message: "Lozinka je resetirana na 1234.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri resetiranju lozinke.",
    };
  }
}

export async function createEmployeeAction(
  _prevState: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  try {
    const supabase = await requireUser();

    const values: EmployeeFormValues = {
      display_name: String(formData.get("display_name") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim(),
      color_hex: String(formData.get("color_hex") ?? "").trim(),
      password: String(formData.get("password") ?? "1234").trim(),
    };

    if (!values.display_name) {
      return {
        error: "Ime djelatnika je obavezno.",
        success: "",
        values,
      };
    }

    if (!values.email) {
      return {
        error: "Email je obavezan.",
        success: "",
        values,
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return {
        error: "Nedostaje SUPABASE_SERVICE_ROLE_KEY ili SUPABASE URL.",
        success: "",
        values,
      };
    }

    const { createClient: createAdminClient } =
      await import("@supabase/supabase-js");

    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email: values.email,
        password: values.password || "1234",
        email_confirm: true,
        user_metadata: {
          display_name: values.display_name,
        },
      });

    if (createUserError || !createdUser.user) {
      return {
        error: createUserError?.message || "Nije moguće kreirati korisnika.",
        success: "",
        values,
      };
    }

    const userId = createdUser.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      email: values.email,
      display_name: values.display_name,
      phone: values.phone || null,
      is_active: true,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(userId);

      return {
        error: profileError.message,
        success: "",
        values,
      };
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .insert({
        profile_id: userId,
        display_name: values.display_name,
        phone: values.phone || null,
        email: values.email,
        color_hex: values.color_hex || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (employeeError || !employee) {
      await supabase.from("profiles").delete().eq("id", userId);
      await adminClient.auth.admin.deleteUser(userId);

      return {
        error: employeeError?.message || "Nije moguće kreirati djelatnika.",
        success: "",
        values,
      };
    }

    await writeAuditLog({
      action: "employee_created",
      entityType: "employee",
      entityId: employee.id,
      entityLabel: values.display_name,
      details: {
        display_name: values.display_name,
        email: values.email,
        phone: values.phone || null,
        color_hex: values.color_hex || null,
        profile_id: userId,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/employees");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/appointments/[id]/edit");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");
    revalidatePath("/dashboard/schedule");

    return {
      error: "",
      success: "Djelatnik je uspješno dodan.",
      values: {
        display_name: "",
        email: "",
        phone: "",
        color_hex: "",
        password: "",
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Došlo je do greške pri dodavanju djelatnika.",
      success: "",
      values: {
        display_name: String(formData.get("display_name") ?? "").trim(),
        email: String(formData.get("email") ?? "")
          .trim()
          .toLowerCase(),
        phone: String(formData.get("phone") ?? "").trim(),
        color_hex: String(formData.get("color_hex") ?? "").trim(),
        password: String(formData.get("password") ?? "1234").trim(),
      },
    };
  }
}
