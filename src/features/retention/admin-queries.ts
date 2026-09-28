import { createAdminClient } from "@/lib/supabase/admin";
import {
  deriveRetentionOverview,
  type RetentionOverview,
  type RetentionRawAction,
  type RetentionRawAppointment,
  type RetentionRawClient,
} from "@/features/retention/engine";

export async function getRetentionOverviewForOrganizationAdmin(args: {
  organizationId: string;
  today: string;
}): Promise<RetentionOverview> {
  const supabase = createAdminClient();

  const [clientsResult, appointmentsResult, actionsResult] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, first_name, last_name, phone, email, marketing_email_status",
      )
      .eq("organization_id", args.organizationId)
      .eq("is_active", true),
    supabase
      .from("appointments")
      .select("client_id, appointment_date, status")
      .eq("organization_id", args.organizationId)
      .not("client_id", "is", null),
    supabase
      .from("crm_retention_actions")
      .select(
        "id, client_id, signal_key, reason_code, action, snoozed_until, created_at",
      )
      .eq("organization_id", args.organizationId)
      .order("created_at", { ascending: false }),
  ]);

  if (clientsResult.error) throw new Error(clientsResult.error.message);
  if (appointmentsResult.error) throw new Error(appointmentsResult.error.message);
  if (actionsResult.error) throw new Error(actionsResult.error.message);

  return deriveRetentionOverview({
    clients: (clientsResult.data ?? []) as RetentionRawClient[],
    appointments: (appointmentsResult.data ?? []) as RetentionRawAppointment[],
    actions: (actionsResult.data ?? []) as RetentionRawAction[],
    today: args.today,
  });
}
