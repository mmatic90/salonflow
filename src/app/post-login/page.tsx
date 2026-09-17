import { redirect } from "next/navigation";
import { getPlatformAdminContext } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

export default async function PostLoginPage() {
  const platformAdmin = await getPlatformAdminContext();
  if (platformAdmin) {
    redirect("/platform");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    redirect("/login");
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: setupProgress, error: setupError } = await supabase
    .from("organization_setup_progress")
    .select("dismissed_at, completed_at")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (
    !setupError &&
    setupProgress &&
    !setupProgress.completed_at &&
    !setupProgress.dismissed_at
  ) {
    redirect("/dashboard/setup");
  }

  redirect("/dashboard");
}
