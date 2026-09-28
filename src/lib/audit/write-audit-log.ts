"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

type WriteAuditLogArgs = {
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: Record<string, unknown>;
};

export async function writeAuditLog({
  action,
  entityType,
  entityId = null,
  entityLabel = null,
  details = {},
}: WriteAuditLogArgs) {
  try {
    const permissions = await getCurrentUserPermissions();
    if (!permissions) return;

    const supabase = await createClient();
    const { error } = await supabase.from("audit_logs").insert({
      organization_id: permissions.organizationId,
      actor_user_id: permissions.userId,
      actor_email: permissions.email,
      actor_display_name: permissions.displayName,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_label: entityLabel,
      details,
    });

    if (error && error.code !== "PGRST205") {
      console.warn("Audit log insert failed:", error.message);
    }
  } catch (error) {
    console.warn(
      "Audit log write failed:",
      error instanceof Error ? error.message : String(error),
    );
  }
}
