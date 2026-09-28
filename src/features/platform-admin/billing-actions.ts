"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

type BillingContactActionResult =
  | { ok: true; billingEmail: string | null }
  | { ok: false; error: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email || null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updatePlatformSalonBillingContactAction(input: {
  organizationId: string;
  billingEmail: unknown;
}): Promise<BillingContactActionResult> {
  await requirePlatformAdmin();

  if (!isUuid(input.organizationId)) {
    return { ok: false, error: "Neispravan ID salona." };
  }

  const billingEmail = normalizeEmail(input.billingEmail);
  if (billingEmail && !isValidEmail(billingEmail)) {
    return { ok: false, error: "Billing email nije ispravan." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ billing_email: billingEmail })
    .eq("id", input.organizationId)
    .select("id, billing_email")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Salon više ne postoji." };

  revalidatePath("/platform");
  revalidatePath(`/platform/salons/${input.organizationId}`);

  return { ok: true, billingEmail: data.billing_email ?? null };
}
