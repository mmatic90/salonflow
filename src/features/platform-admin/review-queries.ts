import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export type PlatformReviewAutomationOverview = {
  enabled: boolean;
  configured: boolean;
  delayHours: 2 | 24;
  enabledAt: string | null;
};

export async function getPlatformReviewAutomationOverview(
  organizationId: string,
): Promise<PlatformReviewAutomationOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organization_review_settings")
    .select("enabled, google_review_url, delay_hours, enabled_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    enabled: data?.enabled === true,
    configured: Boolean(data?.enabled && data?.google_review_url),
    delayHours: data?.delay_hours === 2 ? 2 : 24,
    enabledAt: data?.enabled_at ?? null,
  };
}
