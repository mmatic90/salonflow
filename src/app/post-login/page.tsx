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

  redirect(membership ? "/dashboard" : "/onboarding");
}
