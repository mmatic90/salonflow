"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForSettings } from "@/lib/page-guards";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null, maxLength: number) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, maxLength) : null;
}

export async function updateSalonProfileAction(formData: FormData) {
  const permissions = await requireAdminForSettings();
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const email = clean(formData.get("email"), 320);
  const phone = clean(formData.get("phone"), 80);
  const addressLine1 = clean(formData.get("address_line_1"), 160);
  const addressLine2 = clean(formData.get("address_line_2"), 160);
  const postalCode = clean(formData.get("postal_code"), 32);
  const city = clean(formData.get("city"), 120);

  if (name.length < 2 || name.length > 120) {
    throw new Error("Naziv salona mora imati između 2 i 120 znakova.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Email salona nije ispravan.");
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      email,
      phone,
      address_line_1: addressLine1,
      address_line_2: addressLine2,
      postal_code: postalCode,
      city,
    })
    .eq("id", permissions.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/setup");
  revalidatePath("/dashboard/settings/profile");
}
