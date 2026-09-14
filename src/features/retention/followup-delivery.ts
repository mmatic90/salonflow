import { createAdminClient } from "@/lib/supabase/admin";
import {
  getMarketingEmailDeliveryContext,
  type MarketingEmailDeliveryContext,
} from "@/lib/marketing/marketing-email";
import { ManagedEmailError } from "@/lib/email/managed-email";
import { sendRetentionFollowupEmail } from "@/lib/email/retention-followup-email";
import type {
  RetentionCandidate,
  RetentionReasonCode,
} from "@/features/retention/engine";
import type { AppLocale } from "@/lib/i18n";

type ClaimRow = {
  allowed: boolean;
  reason: string;
};

export type RetentionFollowupDeliveryResult = {
  status: "sent" | "failed" | "skipped";
  reason: string;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function salonAddress(organization: {
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  postal_code?: string | null;
}) {
  return [
    organization.address_line_1,
    organization.address_line_2,
    [organization.postal_code, organization.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

async function recordOutcome(args: {
  organizationId: string;
  signalKey: string;
  status: "sent" | "failed" | "skipped";
  reason?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_crm_retention_email_outcome", {
    p_organization_id: args.organizationId,
    p_signal_key: args.signalKey,
    p_status: args.status,
    p_failure_reason: args.reason ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function deliverRetentionFollowup(args: {
  organizationId: string;
  candidate: Pick<
    RetentionCandidate,
    "clientId" | "fullName" | "signalKey" | "reasonCode"
  >;
  locale: AppLocale;
  initiatedBy: string | null;
}): Promise<RetentionFollowupDeliveryResult> {
  const admin = createAdminClient();
  const { candidate } = args;

  const { data: claimData, error: claimError } = await admin.rpc(
    "claim_crm_retention_email_delivery",
    {
      p_organization_id: args.organizationId,
      p_client_id: candidate.clientId,
      p_signal_key: candidate.signalKey,
      p_reason_code: candidate.reasonCode,
      p_initiated_by: args.initiatedBy,
    },
  );

  if (claimError) {
    console.error("CRM follow-up claim failed:", claimError.message);
    return { status: "failed", reason: "claim_failed" };
  }

  const claim = (claimData?.[0] ?? null) as ClaimRow | null;
  if (!claim?.allowed) {
    return {
      status: "skipped",
      reason: claim?.reason || "claim_not_available",
    };
  }

  let marketing: MarketingEmailDeliveryContext;
  try {
    marketing = await getMarketingEmailDeliveryContext({
      organizationId: args.organizationId,
      clientId: candidate.clientId,
    });
  } catch (error) {
    console.error("CRM follow-up consent lookup failed:", error);
    try {
      await recordOutcome({
        organizationId: args.organizationId,
        signalKey: candidate.signalKey,
        status: "failed",
        reason: "consent_lookup_failed",
      });
    } catch (recordError) {
      console.error(
        "CRM follow-up consent failure outcome could not be recorded:",
        recordError,
      );
    }
    return { status: "failed", reason: "consent_lookup_failed" };
  }

  if (!marketing.eligible) {
    try {
      await recordOutcome({
        organizationId: args.organizationId,
        signalKey: candidate.signalKey,
        status: "skipped",
        reason: marketing.reason,
      });
    } catch (error) {
      console.error("CRM follow-up skipped outcome could not be recorded:", error);
      return { status: "failed", reason: "outcome_record_failed" };
    }
    return { status: "skipped", reason: marketing.reason };
  }

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select(
      "name, slug, phone, address_line_1, address_line_2, city, postal_code, logo_url",
    )
    .eq("id", args.organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    try {
      await recordOutcome({
        organizationId: args.organizationId,
        signalKey: candidate.signalKey,
        status: "failed",
        reason: "organization_load_failed",
      });
    } catch (recordError) {
      console.error(
        "CRM follow-up organization failure outcome could not be recorded:",
        recordError,
      );
    }
    return { status: "failed", reason: "organization_load_failed" };
  }

  try {
    await sendRetentionFollowupEmail({
      organizationId: args.organizationId,
      to: marketing.email,
      clientName: candidate.fullName,
      salonName: organization.name,
      salonPhone: organization.phone,
      salonAddress: salonAddress(organization),
      salonLogoUrl: organization.logo_url,
      bookingUrl: `${siteUrl()}/booking/${encodeURIComponent(organization.slug)}`,
      unsubscribeUrl: marketing.unsubscribeUrl,
      reasonCode: candidate.reasonCode as RetentionReasonCode,
      lang: args.locale,
    });
  } catch (error) {
    const reason =
      error instanceof ManagedEmailError ? error.code : "provider_send_failed";

    try {
      await recordOutcome({
        organizationId: args.organizationId,
        signalKey: candidate.signalKey,
        status: "failed",
        reason,
      });
    } catch (recordError) {
      console.error(
        "CRM follow-up failure outcome could not be recorded:",
        recordError,
      );
    }

    console.error("CRM follow-up email send failed:", error);
    return { status: "failed", reason };
  }

  try {
    await recordOutcome({
      organizationId: args.organizationId,
      signalKey: candidate.signalKey,
      status: "sent",
    });
  } catch (error) {
    console.error("CRM follow-up sent but outcome recording failed:", error);
    return { status: "failed", reason: "outcome_record_failed" };
  }

  return { status: "sent", reason: "sent" };
}
