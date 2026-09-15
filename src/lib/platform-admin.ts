import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type PlatformAdminContext = {
  userId: string;
  email: string | null;
  displayName: string;
};

export async function getPlatformAdminContext(): Promise<PlatformAdminContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: platformAdmin, error } = await supabase
    .from("platform_admins")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !platformAdmin) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName:
      platformAdmin.display_name ??
      user.user_metadata?.display_name ??
      user.email ??
      "Platform admin",
  };
}

export async function requirePlatformAdmin() {
  const context = await getPlatformAdminContext();
  if (context) return context;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/dashboard" : "/login");
}
