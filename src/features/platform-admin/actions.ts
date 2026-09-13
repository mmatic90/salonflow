"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

type SalonStatusActionResult =
  | { ok: true; isActive: boolean }
  | { ok: false; error: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function setPlatformSalonActiveAction(
  organizationId: string,
  isActive: boolean,
): Promise<SalonStatusActionResult> {
  await requirePlatformAdmin();

  if (!isUuid(organizationId)) {
    return { ok: false, error: "Neispravan ID salona." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ is_active: isActive })
    .eq("id", organizationId)
    .select("id, is_active")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Salon više ne postoji." };
  }

  revalidatePath("/platform");
  revalidatePath(`/platform/salons/${organizationId}`);
  revalidatePath("/dashboard", "layout");

  return { ok: true, isActive: data.is_active !== false };
}
