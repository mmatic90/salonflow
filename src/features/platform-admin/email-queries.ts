import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

function currentUtcMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export type PlatformSalonEmailOverview = {
  organizationId: string;
  provider: "salonflow" | "custom";
  managedEmailEnabled: boolean;
  fromName: string | null;
  replyToEmail: string | null;
  monthlyLimitOverride: number | null;
  periodStart: string;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
};

export async function getPlatformSalonEmailOverview(
  organizationId: string,
): Promise<PlatformSalonEmailOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();
  const periodStart = currentUtcMonthStart();

  const [settingsResult, usageResult, organizationResult] = await Promise.all([
    supabase
      .from("organization_email_settings")
      .select(
        "provider, managed_email_enabled, from_name, reply_to_email, monthly_limit_override",
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_email_usage")
      .select("attempted_count, sent_count, failed_count")
      .eq("organization_id", organizationId)
      .eq("period_start", periodStart)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name, email")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (usageResult.error) throw new Error(usageResult.error.message);
  if (organizationResult.error) throw new Error(organizationResult.error.message);
  if (!organizationResult.data) throw new Error("Salon više ne postoji.");

  const settings = settingsResult.data;
  const usage = usageResult.data;
  const organization = organizationResult.data;

  return {
    organizationId: String(organization.id),
    provider: settings?.provider === "custom" ? "custom" : "salonflow",
    managedEmailEnabled: settings?.managed_email_enabled ?? true,
    fromName: settings?.from_name ?? organization.name ?? null,
    replyToEmail: settings?.reply_to_email ?? organization.email ?? null,
    monthlyLimitOverride: settings?.monthly_limit_override ?? null,
    periodStart,
    attemptedCount: usage?.attempted_count ?? 0,
    sentCount: usage?.sent_count ?? 0,
    failedCount: usage?.failed_count ?? 0,
  };
}
