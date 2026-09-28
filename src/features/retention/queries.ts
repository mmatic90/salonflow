import { createClient } from "@/lib/supabase/server";
import {
  canUseCapability,
  getCurrentUserPermissions,
} from "@/lib/permissions";
import { getTodayLocalDate } from "@/lib/utils";
import {
  deriveRetentionOverview,
  type RetentionOverview,
  type RetentionRawAction,
  type RetentionRawAppointment,
  type RetentionRawClient,
} from "@/features/retention/engine";

export type {
  MarketingEmailStatus,
  RetentionActionCode,
  RetentionCandidate,
  RetentionHistoryItem,
  RetentionOverview,
  RetentionPriority,
  RetentionReasonCode,
} from "@/features/retention/engine";

export async function getRetentionOverview(): Promise<RetentionOverview> {
  const permissions = await getCurrentUserPermissions();
  if (
    !permissions ||
    permissions.role !== "admin" ||
    !canUseCapability(permissions, "advanced_crm")
  ) {
    return {
      candidates: [],
      history: [],
      stats: { total: 0, high: 0, medium: 0, low: 0, snoozed: 0 },
    };
  }

  const supabase = await createClient();
  const organizationId = permissions.organizationId;

  const [clientsResult, appointmentsResult, actionsResult] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, first_name, last_name, phone, email, marketing_email_status",
      )
      .eq("organization_id", organizationId)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("client_id, appointment_date, status")
      .eq("organization_id", organizationId)
      .not("client_id", "is", null),
    supabase
      .from("crm_retention_actions")
      .select(
        "id, client_id, signal_key, reason_code, action, snoozed_until, created_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (appointmentsResult.error) throw new Error(appointmentsResult.error.message);
  if (actionsResult.error) throw new Error(actionsResult.error.message);

  return deriveRetentionOverview({
    clients: (clientsResult.data ?? []) as RetentionRawClient[],
    appointments: (appointmentsResult.data ?? []) as RetentionRawAppointment[],
    actions: (actionsResult.data ?? []) as RetentionRawAction[],
    today: getTodayLocalDate(),
  });
}
