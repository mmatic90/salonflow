import { createAdminClient } from "@/lib/supabase/admin";

export type MarketingEmailDeliveryContext =
  | {
      eligible: true;
      email: string;
      unsubscribeUrl: string;
    }
  | {
      eligible: false;
      reason: "not_allowed" | "unknown" | "missing_email" | "missing_client";
    };

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function getMarketingEmailDeliveryContext(args: {
  organizationId: string;
  clientId: string;
}): Promise<MarketingEmailDeliveryContext> {
  const supabase = createAdminClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, email, marketing_email_status")
    .eq("organization_id", args.organizationId)
    .eq("id", args.clientId)
    .eq("is_active", true)
    .maybeSingle();

  if (clientError) throw new Error(clientError.message);
  if (!client) return { eligible: false, reason: "missing_client" };
  if (!client.email?.trim()) return { eligible: false, reason: "missing_email" };
  if (client.marketing_email_status === "not_allowed") {
    return { eligible: false, reason: "not_allowed" };
  }
  if (client.marketing_email_status !== "allowed") {
    return { eligible: false, reason: "unknown" };
  }

  const tokenResult = await supabase
    .from("client_marketing_unsubscribe_tokens")
    .select("token")
    .eq("organization_id", args.organizationId)
    .eq("client_id", args.clientId)
    .maybeSingle();

  if (tokenResult.error) throw new Error(tokenResult.error.message);

  let tokenRow = tokenResult.data;

  if (!tokenRow) {
    const insertResult = await supabase
      .from("client_marketing_unsubscribe_tokens")
      .insert({
        organization_id: args.organizationId,
        client_id: args.clientId,
      })
      .select("token")
      .single();
    if (insertResult.error) throw new Error(insertResult.error.message);
    tokenRow = insertResult.data;
  }

  return {
    eligible: true,
    email: client.email.trim(),
    unsubscribeUrl: `${getSiteUrl()}/unsubscribe/${tokenRow.token}`,
  };
}
