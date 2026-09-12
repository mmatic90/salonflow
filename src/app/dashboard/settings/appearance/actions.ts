"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminForSettings } from "@/lib/page-guards";

export async function updateOrganizationPreferencesAction(formData: FormData) {
  const permissions = await requireAdminForSettings();
  const supabase = await createClient();

  const localeRaw = String(formData.get("locale") ?? "hr");
  const themeRaw = String(formData.get("theme") ?? "sand");

  const locale = localeRaw === "en" || localeRaw === "it" ? localeRaw : "hr";
  const theme =
    themeRaw === "rose" || themeRaw === "slate" ? themeRaw : "sand";

  const { error } = await supabase
    .from("organizations")
    .update({ locale, theme })
    .eq("id", permissions.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/appearance");
}
