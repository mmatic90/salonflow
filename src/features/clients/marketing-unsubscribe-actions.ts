"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function unsubscribeMarketingEmailAction(token: string) {
  if (!isUuid(token)) {
    redirect("/unsubscribe/invalid");
  }

  const supabase = createAdminClient();
  const { data: tokenRow, error: tokenError } = await supabase
    .from("client_marketing_unsubscribe_tokens")
    .select("organization_id, client_id")
    .eq("token", token)
    .maybeSingle();

  if (tokenError || !tokenRow) {
    redirect("/unsubscribe/invalid");
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, marketing_email_status")
    .eq("organization_id", tokenRow.organization_id)
    .eq("id", tokenRow.client_id)
    .maybeSingle();

  if (clientError || !client) {
    redirect("/unsubscribe/invalid");
  }

  if (client.marketing_email_status !== "not_allowed") {
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        marketing_email_status: "not_allowed",
        marketing_email_consent_at: null,
        marketing_email_consent_source: null,
        marketing_email_source: "unsubscribe",
        marketing_email_updated_at: new Date().toISOString(),
        marketing_email_updated_by: null,
      })
      .eq("organization_id", tokenRow.organization_id)
      .eq("id", tokenRow.client_id);

    if (updateError) {
      throw new Error("Unable to save unsubscribe preference.");
    }
  }

  redirect(`/unsubscribe/${token}?done=1`);
}
