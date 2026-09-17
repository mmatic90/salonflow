"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseCapability } from "@/lib/permissions";
import { requireAdminForSettings } from "@/lib/page-guards";

export type RetentionAutomationSettingsResult =
  | { ok: true }
  | { ok: false; error: string };

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      unavailable: "Retention automation requires the Pro plan.",
      invalid: "The automation settings are not valid.",
      save: "The retention automation settings could not be saved.",
    };
  }

  if (locale === "it") {
    return {
      unavailable: "L'automazione retention richiede il piano Pro.",
      invalid: "Le impostazioni dell'automazione non sono valide.",
      save: "Non è stato possibile salvare le impostazioni dell'automazione retention.",
    };
  }

  return {
    unavailable: "Retention automatizacija zahtijeva Pro plan.",
    invalid: "Postavke automatizacije nisu ispravne.",
    save: "Postavke retention automatizacije nije moguće spremiti.",
  };
}

export async function saveRetentionAutomationSettings(input: {
  enabled: boolean;
  dailyLimit: number;
}): Promise<RetentionAutomationSettingsResult> {
  const permissions = await requireAdminForSettings();
  const t = copy(permissions.organizationLocale);

  if (!canUseCapability(permissions, "automations")) {
    return { ok: false, error: t.unavailable };
  }

  if (
    typeof input.enabled !== "boolean" ||
    !Number.isInteger(input.dailyLimit) ||
    input.dailyLimit < 1 ||
    input.dailyLimit > 20
  ) {
    return { ok: false, error: t.invalid };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_retention_automation_settings")
    .update({
      enabled: input.enabled,
      daily_limit: input.dailyLimit,
    })
    .eq("organization_id", permissions.organizationId);

  if (error) {
    console.error("saveRetentionAutomationSettings failed:", error.message);
    return { ok: false, error: t.save };
  }

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/retention-automation");
  return { ok: true };
}
