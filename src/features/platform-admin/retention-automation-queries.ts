import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformRetentionAutomationOverview = {
  enabled: boolean;
  dailyLimit: number;
  enabledAt: string | null;
  lastRunLocalDate: string | null;
  lastRunAt: string | null;
  lastRunStatus: string;
  lastRunCandidates: number;
  lastRunSent: number;
  lastRunSkipped: number;
  lastRunFailed: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
};

export async function getPlatformRetentionAutomationOverview(
  organizationId: string,
): Promise<PlatformRetentionAutomationOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  const [settingsResult, deliveriesResult] = await Promise.all([
    supabase
      .from("organization_retention_automation_settings")
      .select(
        "enabled, daily_limit, enabled_at, last_run_local_date, last_run_at, last_run_status, last_run_candidates, last_run_sent, last_run_skipped, last_run_failed",
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("crm_retention_email_deliveries")
      .select("status")
      .eq("organization_id", organizationId),
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (deliveriesResult.error) throw new Error(deliveriesResult.error.message);

  const statuses = (deliveriesResult.data ?? []).map((row) => row.status);

  return {
    enabled: settingsResult.data?.enabled ?? false,
    dailyLimit: settingsResult.data?.daily_limit ?? 5,
    enabledAt: settingsResult.data?.enabled_at ?? null,
    lastRunLocalDate: settingsResult.data?.last_run_local_date ?? null,
    lastRunAt: settingsResult.data?.last_run_at ?? null,
    lastRunStatus: settingsResult.data?.last_run_status ?? "never",
    lastRunCandidates: settingsResult.data?.last_run_candidates ?? 0,
    lastRunSent: settingsResult.data?.last_run_sent ?? 0,
    lastRunSkipped: settingsResult.data?.last_run_skipped ?? 0,
    lastRunFailed: settingsResult.data?.last_run_failed ?? 0,
    totalSent: statuses.filter((status) => status === "sent").length,
    totalFailed: statuses.filter((status) => status === "failed").length,
    totalSkipped: statuses.filter((status) => status === "skipped").length,
  };
}
