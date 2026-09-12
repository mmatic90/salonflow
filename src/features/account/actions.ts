"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getDictionary } from "@/lib/i18n";

export type AccountActionState = {
  error: string;
  success: string;
};

export async function updateAccountProfileAction(
  _prevState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  const t = getDictionary(permissions?.organizationLocale ?? "hr").account;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: t.notSignedIn,
      success: "",
    };
  }

  const displayName = String(formData.get("display_name") ?? "").trim();
  const colorHex = String(formData.get("color_hex") ?? "").trim();

  if (!displayName) {
    return {
      error: t.displayNameRequired,
      success: "",
    };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("id", user.id);

  if (profileError) {
    return {
      error: profileError.message,
      success: "",
    };
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (employee?.id) {
    const payload: {
      display_name: string;
      color_hex?: string;
    } = {
      display_name: displayName,
    };

    if (colorHex) {
      payload.color_hex = colorHex;
    }

    const { error: employeeError } = await supabase
      .from("employees")
      .update(payload)
      .eq("id", employee.id);

    if (employeeError) {
      return {
        error: employeeError.message,
        success: "",
      };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/account");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/calendar/time-grid");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/clients");

  return {
    error: "",
    success: t.saved,
  };
}
