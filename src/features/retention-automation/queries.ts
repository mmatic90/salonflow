import { createClient } from "@/lib/supabase/server";
import { getRetentionOverview } from "@/features/retention/queries";
import type {
  RetentionPriority,
  RetentionReasonCode,
} from "@/features/retention/engine";

export type RetentionAutomationSettings = {
  enabled: boolean;
  dailyLimit: number;
  enabledAt: string | null;
  lastRunLocalDate: string | null;
  lastRunAt: string | null;
  lastRunStatus: "never" | "processing" | "completed" | "failed";
  lastRunCandidates: number;
  lastRunSent: number;
  lastRunSkipped: number;
  lastRunFailed: number;
  lastRunError: string | null;
};

export type RetentionAutomationPreviewItem = {
  clientId: string;
  fullName: string;
  reasonCode: RetentionReasonCode;
  priority: RetentionPriority;
};

export type RetentionAutomationPreview = {
  totalCandidates: number;
  consentEligible: number;
  nextRunCount: number;
  items: RetentionAutomationPreviewItem[];
};

export async function getRetentionAutomationSettings(
  organizationId: string,
): Promise<RetentionAutomationSettings> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_retention_automation_settings")
    .select(
      "enabled, daily_limit, enabled_at, last_run_local_date, last_run_at, last_run_status, last_run_candidates, last_run_sent, last_run_skipped, last_run_failed, last_run_error",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    enabled: data?.enabled ?? false,
    dailyLimit: data?.daily_limit ?? 5,
    enabledAt: data?.enabled_at ?? null,
    lastRunLocalDate: data?.last_run_local_date ?? null,
    lastRunAt: data?.last_run_at ?? null,
    lastRunStatus:
      data?.last_run_status === "processing" ||
      data?.last_run_status === "completed" ||
      data?.last_run_status === "failed"
        ? data.last_run_status
        : "never",
    lastRunCandidates: data?.last_run_candidates ?? 0,
    lastRunSent: data?.last_run_sent ?? 0,
    lastRunSkipped: data?.last_run_skipped ?? 0,
    lastRunFailed: data?.last_run_failed ?? 0,
    lastRunError: data?.last_run_error ?? null,
  };
}

export async function getRetentionAutomationPreview(
  dailyLimit: number,
): Promise<RetentionAutomationPreview> {
  const overview = await getRetentionOverview();
  const eligible = overview.candidates.filter(
    (candidate) =>
      candidate.marketingEmailStatus === "allowed" && Boolean(candidate.email?.trim()),
  );

  return {
    totalCandidates: overview.candidates.length,
    consentEligible: eligible.length,
    nextRunCount: Math.min(eligible.length, dailyLimit),
    items: eligible.slice(0, Math.max(dailyLimit, 8)).map((candidate) => ({
      clientId: candidate.clientId,
      fullName: candidate.fullName,
      reasonCode: candidate.reasonCode,
      priority: candidate.priority,
    })),
  };
}
