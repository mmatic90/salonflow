"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

const MAX_MONTHLY_EMAIL_OVERRIDE = 1_000_000;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

type EmailQuotaActionResult =
  | { ok: true; monthlyLimitOverride: number | null }
  | { ok: false; error: string };

export async function updatePlatformSalonEmailQuotaAction(input: {
  organizationId: string;
  monthlyLimitOverride: number | null;
}): Promise<EmailQuotaActionResult> {
  await requirePlatformAdmin();

  if (!isUuid(input.organizationId)) {
    return { ok: false, error: "Neispravan ID salona." };
  }

  if (
    input.monthlyLimitOverride !== null &&
    (!Number.isInteger(input.monthlyLimitOverride) ||
      input.monthlyLimitOverride <= 0 ||
      input.monthlyLimitOverride > MAX_MONTHLY_EMAIL_OVERRIDE)
  ) {
    return {
      ok: false,
      error: `Mjesečni limit mora biti cijeli broj između 1 i ${MAX_MONTHLY_EMAIL_OVERRIDE.toLocaleString("hr-HR")}.`,
    };
  }

  const supabase = createAdminClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", input.organizationId)
    .maybeSingle();

  if (organizationError) {
    return { ok: false, error: organizationError.message };
  }
  if (!organization) {
    return { ok: false, error: "Salon više ne postoji." };
  }

  const { data, error } = await supabase
    .from("organization_email_settings")
    .upsert(
      {
        organization_id: input.organizationId,
        monthly_limit_override: input.monthlyLimitOverride,
      },
      { onConflict: "organization_id" },
    )
    .select("monthly_limit_override")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/platform/salons/${input.organizationId}`);
  revalidatePath("/dashboard/settings/notifications");

  return {
    ok: true,
    monthlyLimitOverride: data?.monthly_limit_override ?? null,
  };
}
