"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdminForSettings } from "@/lib/page-guards";
import type { OrganizationTheme } from "@/lib/permissions";

const allowedThemes = new Set<OrganizationTheme>([
  "sand",
  "rose",
  "slate",
  "sage",
  "ocean",
  "plum",
]);

export async function updateOrganizationPreferencesAction(formData: FormData) {
  const permissions = await requireAdminForSettings();
  const supabase = await createClient();

  const localeRaw = String(formData.get("locale") ?? "hr");
  const themeRaw = String(formData.get("theme") ?? "sand") as OrganizationTheme;

  const locale = localeRaw === "en" || localeRaw === "it" ? localeRaw : "hr";
  const theme: OrganizationTheme = allowedThemes.has(themeRaw) ? themeRaw : "sand";

  const { error } = await supabase
    .from("organizations")
    .update({ locale, theme })
    .eq("id", permissions.organizationId);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings/appearance");
}
