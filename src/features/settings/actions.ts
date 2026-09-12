"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireAdminForSettings } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

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
    throw new Error(getDictionary("hr").settings.actionMessages.notSignedIn);
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
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const durationMinutes = Number(formData.get("duration_minutes") ?? 0);
    const priceRaw = String(formData.get("price") ?? "").trim();
    const price = priceRaw ? Number(priceRaw.replace(",", ".")) : null;
    const category = String(formData.get("category") ?? "").trim();
    const isOnlineBookable = formData.get("is_online_bookable") === "on";

    if (!name) return { error: t.serviceNameRequired, success: "" };
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return { error: t.durationPositive, success: "" };
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return { error: t.invalidPrice, success: "" };
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
      is_online_bookable: isOnlineBookable,
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
    return { error: "", success: t.serviceAdded };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t.genericError,
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
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      return { error: t.roomNameRequired, success: "" };
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

    return { error: "", success: t.roomAdded };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t.genericError,
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
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const name = String(formData.get("name") ?? "").trim();
    const quantity = Number(formData.get("quantity_total") ?? 0);

    if (!name) {
      return { error: t.equipmentNameRequired, success: "" };
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: t.quantityPositive, success: "" };
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

    return { error: "", success: t.equipmentAdded };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : t.genericError,
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
          t.serviceDeleteBlocked,
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
      message: t.serviceDeleted,
    };
  } catch {
    return {
      ok: false,
      message: t.serviceDeleteError,
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
          t.roomDeleteBlocked,
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
      message: t.roomDeleted,
    };
  } catch {
    return {
      ok: false,
      message: t.roomDeleteError,
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
          t.equipmentDeleteBlocked,
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
      message: t.equipmentDeleted,
    };
  } catch {
    return {
      ok: false,
      message: t.equipmentDeleteError,
    };
  }
}


export async function bulkUpdateServicesAction(
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number | null;
    category: string | null;
    is_active: boolean;
    is_online_bookable: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    for (const item of items) {
      if (!item.name.trim()) {
        return { ok: false, message: "Svaka usluga mora imati naziv." };
      }

      if (!Number.isFinite(item.duration_minutes) || item.duration_minutes <= 0) {
        return { ok: false, message: "Trajanje svake usluge mora biti veće od 0." };
      }

      if (item.price !== null && (!Number.isFinite(item.price) || item.price < 0)) {
        return { ok: false, message: "Cijena usluge nije ispravna." };
      }
    }

    const ids = items.map((item) => item.id);
    const { data: beforeItems } = await supabase
      .from("services")
      .select("*")
      .eq("organization_id", permissions.organizationId)
      .in("id", ids);

    for (const item of items) {
      const { error } = await supabase
        .from("services")
        .update({
          name: item.name.trim(),
          description: item.description?.trim() || null,
          duration_minutes: item.duration_minutes,
          price: item.price,
          category: item.category?.trim() || null,
          is_active: Boolean(item.is_active),
          is_online_bookable: Boolean(item.is_online_bookable),
        })
        .eq("organization_id", permissions.organizationId)
        .eq("id", item.id);

      if (error) return { ok: false, message: error.message };
    }

    await writeAuditLog({
      action: "services_bulk_updated",
      entityType: "service",
      entityLabel: "bulk update services",
      details: { before: beforeItems ?? [], after: items },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/services");
    return { ok: true, message: "Izmjene usluga su spremljene." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Došlo je do greške pri spremanju.",
    };
  }
}


export async function bulkUpdateRoomsAction(
  items: Array<{ id: string; name: string; is_active: boolean }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    for (const item of items) {
      if (!item.name.trim()) {
        return { ok: false, message: "Svaka soba mora imati naziv." };
      }
    }

    const ids = items.map((item) => item.id);
    const { data: beforeItems } = await supabase
      .from("rooms")
      .select("*")
      .eq("organization_id", permissions.organizationId)
      .in("id", ids);

    for (const item of items) {
      const { error } = await supabase
        .from("rooms")
        .update({
          name: item.name.trim(),
          is_active: Boolean(item.is_active),
        })
        .eq("organization_id", permissions.organizationId)
        .eq("id", item.id);

      if (error) return { ok: false, message: error.message };
    }

    await writeAuditLog({
      action: "rooms_bulk_updated",
      entityType: "room",
      entityLabel: "bulk update rooms",
      details: { before: beforeItems ?? [], after: items },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/rooms");
    return { ok: true, message: "Izmjene soba su spremljene." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Došlo je do greške pri spremanju.",
    };
  }
}


export async function bulkUpdateEquipmentAction(
  items: Array<{
    id: string;
    name: string;
    quantity_total: number;
    is_active: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    for (const item of items) {
      if (!item.name.trim()) {
        return { ok: false, message: "Svaka oprema mora imati naziv." };
      }

      if (!Number.isFinite(item.quantity_total) || item.quantity_total <= 0) {
        return { ok: false, message: "Količina svake opreme mora biti veća od 0." };
      }
    }

    const ids = items.map((item) => item.id);
    const { data: beforeItems } = await supabase
      .from("equipment")
      .select("*")
      .eq("organization_id", permissions.organizationId)
      .in("id", ids);

    for (const item of items) {
      const { error } = await supabase
        .from("equipment")
        .update({
          name: item.name.trim(),
          quantity_total: item.quantity_total,
          is_active: Boolean(item.is_active),
        })
        .eq("organization_id", permissions.organizationId)
        .eq("id", item.id);

      if (error) return { ok: false, message: error.message };
    }

    await writeAuditLog({
      action: "equipment_bulk_updated",
      entityType: "equipment",
      entityLabel: "bulk update equipment",
      details: { before: beforeItems ?? [], after: items },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/equipment");
    return { ok: true, message: "Izmjene opreme su spremljene." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Došlo je do greške pri spremanju.",
    };
  }
}


export async function bulkUpdateServiceRoomsAction(
  items: Array<{ service_id: string; room_ids: string[] }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const serviceIds = items
      .map((item) => item.service_id)
      .filter((id) => typeof id === "string" && id.length > 0);

    const { data: beforeRows } = await supabase
      .from("service_rooms")
      .select("*")
      .eq("organization_id", permissions.organizationId)
      .in("service_id", serviceIds);

    const rows = items.flatMap((item) =>
      item.room_ids
        .filter((roomId) => typeof roomId === "string" && roomId.length > 0)
        .map((roomId) => ({
          organization_id: permissions.organizationId,
          service_id: item.service_id,
          room_id: roomId,
        })),
    );

    if (serviceIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("service_rooms")
        .delete()
        .eq("organization_id", permissions.organizationId)
        .in("service_id", serviceIds);

      if (deleteError) return { ok: false, message: deleteError.message };
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("service_rooms").insert(rows);
      if (insertError) return { ok: false, message: insertError.message };
    }

    await writeAuditLog({
      action: "service_rooms_bulk_updated",
      entityType: "service_room_mapping",
      entityLabel: "bulk update service rooms",
      details: { before: beforeRows ?? [], after: rows },
    });

    revalidatePath("/dashboard/settings/service-rooms");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");

    return { ok: true, message: "Mapiranje usluga i soba je spremljeno." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Došlo je do greške pri spremanju.",
    };
  }
}


export async function bulkUpdateEmployeeServicesAction(
  items: Array<{ employee_id: string; service_ids: string[] }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const employeeIds = items
      .map((item) => item.employee_id)
      .filter((id) => typeof id === "string" && id.length > 0);

    const { data: beforeRows } = await supabase
      .from("employee_services")
      .select("*")
      .eq("organization_id", permissions.organizationId)
      .in("employee_id", employeeIds);

    const rows = items.flatMap((item) =>
      item.service_ids
        .filter((serviceId) => typeof serviceId === "string" && serviceId.length > 0)
        .map((serviceId) => ({
          organization_id: permissions.organizationId,
          employee_id: item.employee_id,
          service_id: serviceId,
        })),
    );

    if (employeeIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("employee_services")
        .delete()
        .eq("organization_id", permissions.organizationId)
        .in("employee_id", employeeIds);

      if (deleteError) return { ok: false, message: deleteError.message };
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("employee_services").insert(rows);
      if (insertError) return { ok: false, message: insertError.message };
    }

    await writeAuditLog({
      action: "employee_services_bulk_updated",
      entityType: "employee_service_mapping",
      entityLabel: "bulk update employee services",
      details: { before: beforeRows ?? [], after: rows },
    });

    revalidatePath("/dashboard/settings/employee-services");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/schedule");

    return { ok: true, message: "Mapiranje zaposlenika i usluga je spremljeno." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Došlo je do greške pri spremanju.",
    };
  }
}


export async function bulkUpdateServiceEquipmentAction(
  items: Array<{ service_id: string; equipment_ids: string[] }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const serviceIds = items
      .map((item) => item.service_id)
      .filter((id) => typeof id === "string" && id.length > 0);

    const { data: beforeRows } = await supabase
      .from("service_equipment")
      .select("*")
      .eq("organization_id", permissions.organizationId)
      .in("service_id", serviceIds);

    const rows = items.flatMap((item) =>
      item.equipment_ids
        .filter((equipmentId) => typeof equipmentId === "string" && equipmentId.length > 0)
        .map((equipmentId) => ({
          organization_id: permissions.organizationId,
          service_id: item.service_id,
          equipment_id: equipmentId,
        })),
    );

    if (serviceIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("service_equipment")
        .delete()
        .eq("organization_id", permissions.organizationId)
        .in("service_id", serviceIds);

      if (deleteError) return { ok: false, message: deleteError.message };
    }

    if (rows.length > 0) {
      const { error: insertError } = await supabase.from("service_equipment").insert(rows);
      if (insertError) return { ok: false, message: insertError.message };
    }

    await writeAuditLog({
      action: "service_equipment_bulk_updated",
      entityType: "service_equipment_mapping",
      entityLabel: "bulk update service equipment",
      details: { before: beforeRows ?? [], after: rows },
    });

    revalidatePath("/dashboard/settings/service-equipment");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");

    return { ok: true, message: "Mapiranje usluga i opreme je spremljeno." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Došlo je do greške pri spremanju.",
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
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    for (const item of items) {
      if (!item.is_closed && (!item.opens_at || !item.closes_at)) {
        return {
          ok: false,
          message: "Za radne dane moraš unijeti vrijeme otvaranja i zatvaranja.",
        };
      }
    }

    const { data: beforeRows } = await supabase
      .from("salon_working_hours")
      .select("*")
      .eq("organization_id", permissions.organizationId);

    const { error: deleteError } = await supabase
      .from("salon_working_hours")
      .delete()
      .eq("organization_id", permissions.organizationId);

    if (deleteError) return { ok: false, message: deleteError.message };

    const payload = items.map((item) => ({
      organization_id: permissions.organizationId,
      day_of_week: item.day_of_week,
      opens_at: item.is_closed ? "00:00" : item.opens_at,
      closes_at: item.is_closed ? "00:00" : item.closes_at,
      is_closed: item.is_closed,
    }));

    const { error } = await supabase.from("salon_working_hours").insert(payload);
    if (error) return { ok: false, message: error.message };

    const newlyClosedDays = payload
      .filter((item) => {
        if (!item.is_closed) return false;
        const previous = (beforeRows ?? []).find(
          (row) => Number(row.day_of_week) === item.day_of_week,
        );
        return !previous?.is_closed;
      })
      .map((item) => item.day_of_week);

    if (newlyClosedDays.length > 0) {
      const { error: defaultScheduleError } = await supabase
        .from("employee_default_schedule")
        .update({
          is_working: false,
          start_time: null,
          end_time: null,
        })
        .eq("organization_id", permissions.organizationId)
        .in("day_of_week", newlyClosedDays);

      if (defaultScheduleError) {
        return { ok: false, message: defaultScheduleError.message };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: futureOverrides, error: futureOverridesError } = await supabase
        .from("employee_schedule_overrides")
        .select("id, schedule_date")
        .eq("organization_id", permissions.organizationId)
        .eq("is_working", true)
        .gte("schedule_date", today.toISOString().slice(0, 10));

      if (futureOverridesError) {
        return { ok: false, message: futureOverridesError.message };
      }

      const overrideIdsToDisable = (futureOverrides ?? [])
        .filter((row) =>
          newlyClosedDays.includes(
            new Date(`${row.schedule_date}T00:00:00`).getDay(),
          ),
        )
        .map((row) => row.id);

      if (overrideIdsToDisable.length > 0) {
        const { error: overrideUpdateError } = await supabase
          .from("employee_schedule_overrides")
          .update({
            is_working: false,
            start_time: null,
            end_time: null,
            reason: "salon_closed",
          })
          .eq("organization_id", permissions.organizationId)
          .in("id", overrideIdsToDisable);

        if (overrideUpdateError) {
          return { ok: false, message: overrideUpdateError.message };
        }
      }
    }

    await writeAuditLog({
      action: "salon_hours_bulk_updated",
      entityType: "salon_working_hours",
      entityLabel: "bulk update salon hours",
      details: { before: beforeRows ?? [], after: payload },
    });

    revalidatePath("/dashboard/settings/salon-hours");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/calendar/time-grid");

    return { ok: true, message: "Radno vrijeme salona je spremljeno." };
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
    email: string | null;
    phone: string | null;
    color: string | null;
    is_active: boolean;
  }>,
) {
  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    for (const item of items) {
      if (!item.display_name.trim()) {
        return { ok: false, message: "Svaki djelatnik mora imati ime." };
      }
    }

    const ids = items.map((item) => item.id);
    const { data: beforeItems, error: fetchError } = await supabase
      .from("employees")
      .select("id, user_id, first_name, last_name, email, phone, color, is_active")
      .eq("organization_id", permissions.organizationId)
      .in("id", ids);

    if (fetchError) return { ok: false, message: fetchError.message };

    for (const item of items) {
      const { firstName, lastName } = splitDisplayName(item.display_name);

      const { error: employeeError } = await supabase
        .from("employees")
        .update({
          first_name: firstName,
          last_name: lastName,
          email: item.email?.trim() || null,
          phone: item.phone?.trim() || null,
          color: item.color?.trim() || "#2563eb",
          is_active: Boolean(item.is_active),
        })
        .eq("organization_id", permissions.organizationId)
        .eq("id", item.id);

      if (employeeError) {
        return {
          ok: false,
          message: `Greška za djelatnika "${item.display_name}": ${employeeError.message}`,
        };
      }

      const beforeEmployee = (beforeItems ?? []).find((row) => row.id === item.id);

      if (beforeEmployee?.user_id) {
        const { error: membershipError } = await supabase
          .from("organization_members")
          .update({
            display_name: item.display_name.trim(),
            is_active: Boolean(item.is_active),
          })
          .eq("organization_id", permissions.organizationId)
          .eq("user_id", beforeEmployee.user_id);

        if (membershipError) {
          return {
            ok: false,
            message: `Greška pri spremanju članstva za "${item.display_name}": ${membershipError.message}`,
          };
        }
      }
    }

    await writeAuditLog({
      action: "employee_updated",
      entityType: "employee",
      entityLabel: "bulk update employees",
      details: { before: beforeItems ?? [], after: items },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/employees");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/appointments/new");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/schedule");

    return { ok: true, message: "Izmjene djelatnika su spremljene." };
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
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const { data: beforeEmployee, error: fetchError } = await supabase
      .from("employees")
      .select("id, user_id, first_name, last_name, color, is_active")
      .eq("organization_id", permissions.organizationId)
      .eq("id", employeeId)
      .maybeSingle();

    if (fetchError) return { ok: false, message: fetchError.message };
    if (!beforeEmployee) return { ok: false, message: "Djelatnik nije pronađen." };

    const { error: employeeError } = await supabase
      .from("employees")
      .update({ is_active: false })
      .eq("organization_id", permissions.organizationId)
      .eq("id", employeeId);

    if (employeeError) return { ok: false, message: employeeError.message };

    if (beforeEmployee.user_id) {
      const { error: membershipError } = await supabase
        .from("organization_members")
        .update({ is_active: false })
        .eq("organization_id", permissions.organizationId)
        .eq("user_id", beforeEmployee.user_id);

      if (membershipError) return { ok: false, message: membershipError.message };

      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

      if (serviceRoleKey && supabaseUrl) {
        const { createClient: createAdminClient } = await import("@supabase/supabase-js");
        const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const { error: signOutError } = await adminClient.auth.admin.signOut(
          beforeEmployee.user_id,
          "global",
        );
        if (signOutError) console.error("Greška pri global sign out:", signOutError);
      }
    }

    const displayName =
      [beforeEmployee.first_name, beforeEmployee.last_name].filter(Boolean).join(" ") ||
      "Djelatnik";

    await writeAuditLog({
      action: "employee_deactivated",
      entityType: "employee",
      entityId: employeeId,
      entityLabel: displayName,
      details: { before: beforeEmployee, after: { is_active: false } },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/settings/employees");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/schedule");

    return { ok: true, message: "Djelatnik je deaktiviran." };
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
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, user_id, first_name, last_name")
      .eq("organization_id", permissions.organizationId)
      .eq("id", employeeId)
      .maybeSingle();

    if (employeeError) return { ok: false, message: employeeError.message };
    if (!employee?.user_id) {
      return { ok: false, message: "Djelatnik nema povezan korisnički račun." };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return {
        ok: false,
        message: "Nedostaje SUPABASE_SERVICE_ROLE_KEY ili SUPABASE URL.",
      };
    }

    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: resetError } = await adminClient.auth.admin.updateUserById(
      employee.user_id,
      { password: "1234" },
    );

    if (resetError) return { ok: false, message: resetError.message };

    const displayName =
      [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
      "Djelatnik";

    await writeAuditLog({
      action: "employee_password_reset",
      entityType: "employee",
      entityId: employeeId,
      entityLabel: displayName,
      details: { reset_to: "1234" },
    });

    return { ok: true, message: "Lozinka je resetirana na 1234." };
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
  const values: EmployeeFormValues = {
    display_name: String(formData.get("display_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim(),
    color_hex: String(formData.get("color_hex") ?? "").trim(),
    password: String(formData.get("password") ?? "1234").trim(),
  };

  try {
    const supabase = await requireUser();
    const permissions = await requireAdminForSettings();
    const t = getDictionary(permissions.organizationLocale).settings.actionMessages;

    if (!values.display_name) {
      return { error: "Ime djelatnika je obavezno.", success: "", values };
    }
    if (!values.email) {
      return { error: "Email je obavezan.", success: "", values };
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

    const { createClient: createAdminClient } = await import("@supabase/supabase-js");
    const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email: values.email,
        password: values.password || "1234",
        email_confirm: true,
        user_metadata: { display_name: values.display_name },
      });

    if (createUserError || !createdUser.user) {
      return {
        error: createUserError?.message || "Nije moguće kreirati korisnika.",
        success: "",
        values,
      };
    }

    const userId = createdUser.user.id;
    const { firstName, lastName } = splitDisplayName(values.display_name);

    const { error: membershipError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: permissions.organizationId,
        user_id: userId,
        role: "employee",
        display_name: values.display_name,
        is_active: true,
      });

    if (membershipError) {
      await adminClient.auth.admin.deleteUser(userId);
      return { error: membershipError.message, success: "", values };
    }

    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .insert({
        organization_id: permissions.organizationId,
        user_id: userId,
        first_name: firstName,
        last_name: lastName,
        phone: values.phone || null,
        email: values.email,
        color: values.color_hex || "#2563eb",
        is_active: true,
      })
      .select("id")
      .single();

    if (employeeError || !employee) {
      await supabase
        .from("organization_members")
        .delete()
        .eq("organization_id", permissions.organizationId)
        .eq("user_id", userId);
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
        email: values.email,
        phone: values.phone || null,
        color: values.color_hex || "#2563eb",
        user_id: userId,
      },
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/settings/employees");
    revalidatePath("/dashboard/appointments");
    revalidatePath("/dashboard/calendar");
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
      values,
    };
  }
}

