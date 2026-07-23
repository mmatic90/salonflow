"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type SetupActionState = {
  error: string;
  success: string;
};

type SetupContextResult =
  | {
      ok: true;
      organizationId: string;
      userId: string;
    }
  | {
      ok: false;
      error: string;
    };

const EMPTY_STATE: SetupActionState = { error: "", success: "" };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function getSetupContext(): Promise<SetupContextResult> {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    return {
      ok: false,
      error: "Niste prijavljeni ili nemate aktivan salon.",
    };
  }

  const canManageSetup =
    permissions.organizationRole === "owner" ||
    permissions.organizationRole === "admin" ||
    permissions.organizationRole === "manager";

  if (!canManageSetup) {
    return {
      ok: false,
      error: "Nemate ovlasti za uređivanje osnovnih podataka salona.",
    };
  }

  return {
    ok: true,
    organizationId: permissions.organizationId,
    userId: permissions.userId,
  };
}

function refreshSetupPaths() {
  revalidatePath("/dashboard/setup");
  revalidatePath("/dashboard/appointments/new");
  revalidatePath("/dashboard/settings");
}

export async function createSetupEmployeeAction(
  _previousState: SetupActionState = EMPTY_STATE,
  formData: FormData,
): Promise<SetupActionState> {
  const context = await getSetupContext();
  if (!context.ok) return { error: context.error, success: "" };

  const firstName = text(formData, "first_name");
  const lastName = text(formData, "last_name");
  const color = text(formData, "color") || "#776B5D";

  if (!firstName) {
    return { error: "Ime zaposlenika je obavezno.", success: "" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    organization_id: context.organizationId,
    first_name: firstName,
    last_name: lastName || null,
    color,
    is_active: true,
  });

  if (error) return { error: error.message, success: "" };

  refreshSetupPaths();
  return { error: "", success: "Zaposlenik je dodan." };
}

export async function createSetupServiceAction(
  _previousState: SetupActionState = EMPTY_STATE,
  formData: FormData,
): Promise<SetupActionState> {
  const context = await getSetupContext();
  if (!context.ok) return { error: context.error, success: "" };

  const name = text(formData, "name");
  const durationMinutes = Number(text(formData, "duration_minutes"));
  const rawPrice = text(formData, "price").replace(",", ".");
  const price = rawPrice ? Number(rawPrice) : null;

  if (!name) return { error: "Naziv usluge je obavezan.", success: "" };
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    return {
      error: "Trajanje usluge mora biti pozitivan broj minuta.",
      success: "",
    };
  }
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    return { error: "Cijena usluge nije valjana.", success: "" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    organization_id: context.organizationId,
    name,
    duration_minutes: durationMinutes,
    price,
    is_active: true,
  });

  if (error) return { error: error.message, success: "" };

  refreshSetupPaths();
  return { error: "", success: "Usluga je dodana." };
}

export async function createSetupRoomAction(
  _previousState: SetupActionState = EMPTY_STATE,
  formData: FormData,
): Promise<SetupActionState> {
  const context = await getSetupContext();
  if (!context.ok) return { error: context.error, success: "" };

  const name = text(formData, "name");
  if (!name) return { error: "Naziv sobe je obavezan.", success: "" };

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert({
    organization_id: context.organizationId,
    name,
    is_active: true,
  });

  if (error) return { error: error.message, success: "" };

  refreshSetupPaths();
  return { error: "", success: "Soba je dodana." };
}
