"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

type SetupContextResult =
  | {
      ok: true;
      organizationId: string;
    }
  | {
      ok: false;
      error: string;
    };

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
  };
}

function refreshSetupPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/setup");
  revalidatePath("/dashboard/appointments/new");
  revalidatePath("/dashboard/settings");
}

function redirectWithMessage(type: "success" | "error", message: string): never {
  redirect(`/dashboard/setup?${type}=${encodeURIComponent(message)}`);
}

export async function createSetupEmployeeAction(formData: FormData): Promise<void> {
  const context = await getSetupContext();
  if (!context.ok) redirectWithMessage("error", context.error);

  const firstName = text(formData, "first_name");
  const lastName = text(formData, "last_name");
  const color = text(formData, "color") || "#776B5D";

  if (!firstName) {
    redirectWithMessage("error", "Ime zaposlenika je obavezno.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert({
    organization_id: context.organizationId,
    first_name: firstName,
    last_name: lastName || null,
    color,
    is_active: true,
  });

  if (error) {
    console.error("Greška pri dodavanju zaposlenika:", error);
    redirectWithMessage("error", error.message || "Zaposlenika nije moguće dodati.");
  }

  refreshSetupPaths();
  redirectWithMessage("success", "Zaposlenik je dodan.");
}

export async function createSetupServiceAction(formData: FormData): Promise<void> {
  const context = await getSetupContext();
  if (!context.ok) redirectWithMessage("error", context.error);

  const name = text(formData, "name");
  const durationMinutes = Number(text(formData, "duration_minutes"));
  const rawPrice = text(formData, "price").replace(",", ".");
  const price = rawPrice ? Number(rawPrice) : null;

  if (!name) {
    redirectWithMessage("error", "Naziv usluge je obavezan.");
  }

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    redirectWithMessage(
      "error",
      "Trajanje usluge mora biti pozitivan broj minuta.",
    );
  }

  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    redirectWithMessage("error", "Cijena usluge nije valjana.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    organization_id: context.organizationId,
    name,
    duration_minutes: durationMinutes,
    price,
    is_active: true,
  });

  if (error) {
    console.error("Greška pri dodavanju usluge:", error);
    redirectWithMessage("error", error.message || "Uslugu nije moguće dodati.");
  }

  refreshSetupPaths();
  redirectWithMessage("success", "Usluga je dodana.");
}

export async function createSetupRoomAction(formData: FormData): Promise<void> {
  const context = await getSetupContext();
  if (!context.ok) redirectWithMessage("error", context.error);

  const name = text(formData, "name");
  if (!name) {
    redirectWithMessage("error", "Naziv sobe je obavezan.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("rooms").insert({
    organization_id: context.organizationId,
    name,
    is_active: true,
  });

  if (error) {
    console.error("Greška pri dodavanju sobe:", error);
    redirectWithMessage("error", error.message || "Sobu nije moguće dodati.");
  }

  refreshSetupPaths();
  redirectWithMessage("success", "Soba je dodana.");
}
