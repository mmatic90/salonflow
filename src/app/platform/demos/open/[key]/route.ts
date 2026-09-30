import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSelectedOrganizationId } from "@/lib/organization-selection";
import { isShowcaseDemoKey } from "@/features/platform-admin/showcase-demo-config";

export async function GET(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const platformAdmin = await requirePlatformAdmin();
  const { key } = await context.params;

  if (!isShowcaseDemoKey(key)) {
    return NextResponse.redirect(new URL("/platform/demos", request.url));
  }

  const supabase = createAdminClient();
  const { data: registry, error: registryError } = await supabase
    .from("showcase_demo_organizations")
    .select("organization_id")
    .eq("demo_key", key)
    .maybeSingle();

  if (registryError || !registry?.organization_id) {
    return NextResponse.redirect(new URL("/platform/demos", request.url));
  }

  const organizationId = String(registry.organization_id);
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", organizationId)
    .eq("user_id", platformAdmin.userId)
    .eq("is_active", true)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.redirect(new URL("/platform/demos", request.url));
  }

  await setSelectedOrganizationId(organizationId);
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
