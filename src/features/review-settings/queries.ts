import { createClient } from "@/lib/supabase/server";

export type ReviewSettings = {
  enabled: boolean;
  googleReviewUrl: string | null;
  delayHours: 2 | 24;
  enabledAt: string | null;
};

export async function getReviewSettings(
  organizationId: string,
): Promise<ReviewSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_review_settings")
    .select("enabled, google_review_url, delay_hours, enabled_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    enabled: data?.enabled ?? false,
    googleReviewUrl: data?.google_review_url ?? null,
    delayHours: data?.delay_hours === 2 ? 2 : 24,
    enabledAt: data?.enabled_at ?? null,
  };
}
