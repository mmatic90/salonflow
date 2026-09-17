import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type MarketingEmailStatus = "unknown" | "allowed" | "not_allowed";
export type MarketingPreferenceSource =
  | "manual"
  | "online_booking"
  | "unsubscribe"
  | "import"
  | "legacy";

export type MarketingPreferenceEvent = {
  id: string;
  previousStatus: MarketingEmailStatus | null;
  newStatus: MarketingEmailStatus;
  source: MarketingPreferenceSource;
  createdAt: string;
};

export type ClientMarketingPreference = {
  status: MarketingEmailStatus;
  consentAt: string | null;
  consentSource: MarketingPreferenceSource | null;
  source: MarketingPreferenceSource;
  updatedAt: string | null;
  canEdit: boolean;
  hasEmail: boolean;
  history: MarketingPreferenceEvent[];
};

export async function getClientMarketingPreference(
  clientId: string,
): Promise<ClientMarketingPreference | null> {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return null;

  const supabase = await createClient();
  const [clientResult, historyResult] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, email, marketing_email_status, marketing_email_consent_at, marketing_email_consent_source, marketing_email_source, marketing_email_updated_at",
      )
      .eq("organization_id", permissions.organizationId)
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("client_marketing_preference_events")
      .select("id, previous_status, new_status, source, created_at")
      .eq("organization_id", permissions.organizationId)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (clientResult.error) {
    throw new Error(clientResult.error.message);
  }
  if (!clientResult.data) return null;
  if (historyResult.error) {
    throw new Error(historyResult.error.message);
  }

  const status = (clientResult.data.marketing_email_status ||
    "unknown") as MarketingEmailStatus;
  const source = (clientResult.data.marketing_email_source ||
    "legacy") as MarketingPreferenceSource;

  return {
    status,
    consentAt: clientResult.data.marketing_email_consent_at ?? null,
    consentSource:
      (clientResult.data.marketing_email_consent_source as MarketingPreferenceSource | null) ??
      null,
    source,
    updatedAt: clientResult.data.marketing_email_updated_at ?? null,
    canEdit: permissions.role === "admin",
    hasEmail: Boolean(clientResult.data.email?.trim()),
    history: (historyResult.data ?? []).map((event) => ({
      id: event.id,
      previousStatus:
        (event.previous_status as MarketingEmailStatus | null) ?? null,
      newStatus: event.new_status as MarketingEmailStatus,
      source: event.source as MarketingPreferenceSource,
      createdAt: event.created_at,
    })),
  };
}
