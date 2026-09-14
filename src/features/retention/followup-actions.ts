"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { canUseCapability } from "@/lib/permissions";
import { requireDashboardUser } from "@/lib/page-guards";
import { getMarketingEmailDeliveryContext } from "@/lib/marketing/marketing-email";
import { ManagedEmailError } from "@/lib/email/managed-email";
import { sendRetentionFollowupEmail } from "@/lib/email/retention-followup-email";
import {
  getRetentionOverview,
  type RetentionReasonCode,
} from "@/features/retention/queries";

type Result =
  | { ok: true; status: "sent" }
  | { ok: false; status: "failed" | "skipped"; error: string };

type ClaimRow = {
  allowed: boolean;
  reason: string;
};

function isReason(value: unknown): value is RetentionReasonCode {
  return [
    "overdue_cadence",
    "inactive_client",
    "no_future_booking",
    "attendance_risk",
  ].includes(String(value));
}

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      unavailable: "CRM follow-up email requires the Pro plan.",
      invalid: "The CRM follow-up request is not valid.",
      stale: "This CRM signal is no longer current. Refresh the list.",
      duplicate: "A follow-up email was already sent for this CRM signal.",
      inProgress: "A follow-up email for this CRM signal is already being processed.",
      unknown: "Marketing email consent has not been recorded for this client.",
      notAllowed: "This client has opted out of marketing email.",
      missingEmail: "This client does not have an email address.",
      missingClient: "The client is no longer available.",
      sendFailed: "The follow-up email could not be sent. You can try again later.",
    };
  }

  if (locale === "it") {
    return {
      unavailable: "L'email CRM di follow-up richiede il piano Pro.",
      invalid: "La richiesta di follow-up CRM non è valida.",
      stale: "Questo segnale CRM non è più attuale. Aggiorna l'elenco.",
      duplicate: "È già stata inviata un'email di follow-up per questo segnale CRM.",
      inProgress: "Un'email di follow-up per questo segnale CRM è già in elaborazione.",
      unknown: "Per questo cliente non è registrato il consenso alle email marketing.",
      notAllowed: "Questo cliente ha disattivato le email marketing.",
      missingEmail: "Questo cliente non ha un indirizzo email.",
      missingClient: "Il cliente non è più disponibile.",
      sendFailed: "Non è stato possibile inviare l'email di follow-up. Puoi riprovare più tardi.",
    };
  }

  return {
    unavailable: "CRM follow-up email zahtijeva Pro plan.",
    invalid: "CRM follow-up zahtjev nije ispravan.",
    stale: "Ovaj CRM signal više nije aktualan. Osvježi listu.",
    duplicate: "Follow-up email za ovaj CRM signal već je poslan.",
    inProgress: "Follow-up email za ovaj CRM signal već se obrađuje.",
    unknown: "Za ovog klijenta nije zabilježen pristanak na marketinški email.",
    notAllowed: "Klijent se odjavio s marketinških emailova.",
    missingEmail: "Klijent nema email adresu.",
    missingClient: "Klijent više nije dostupan.",
    sendFailed: "Follow-up email nije moguće poslati. Pokušaj ponovno kasnije.",
  };
}

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
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

export async function sendRetentionFollowupEmailAction(input: {
  clientId: string;
  signalKey: string;
  reasonCode: RetentionReasonCode;
}): Promise<Result> {
  const permissions = await requireDashboardUser();
  const locale = permissions.organizationLocale;
  const t = copy(locale);

  if (
    permissions.role !== "admin" ||
    !canUseCapability(permissions, "advanced_crm")
  ) {
    return { ok: false, status: "skipped", error: t.unavailable };
  }

  if (
    !input.clientId ||
    !input.signalKey ||
    input.signalKey.length > 220 ||
    !isReason(input.reasonCode)
  ) {
    return { ok: false, status: "skipped", error: t.invalid };
  }

  const overview = await getRetentionOverview();
  const candidate = overview.candidates.find(
    (item) =>
      item.clientId === input.clientId &&
      item.signalKey === input.signalKey &&
      item.reasonCode === input.reasonCode,
  );

  if (!candidate) {
    return { ok: false, status: "skipped", error: t.stale };
  }

  const admin = createAdminClient();
  const { data: claimData, error: claimError } = await admin.rpc(
    "claim_crm_retention_email_delivery",
    {
      p_organization_id: permissions.organizationId,
      p_client_id: input.clientId,
      p_signal_key: input.signalKey,
      p_reason_code: input.reasonCode,
      p_initiated_by: permissions.userId,
    },
  );

  if (claimError) {
    console.error("CRM follow-up claim failed:", claimError.message);
    return { ok: false, status: "failed", error: t.sendFailed };
  }

  const claim = (claimData?.[0] ?? null) as ClaimRow | null;
  if (!claim?.allowed) {
    if (claim?.reason === "already_sent") {
      return { ok: false, status: "skipped", error: t.duplicate };
    }
    if (claim?.reason === "in_progress") {
      return { ok: false, status: "skipped", error: t.inProgress };
    }
    return { ok: false, status: "skipped", error: t.invalid };
  }

  const marketing = await getMarketingEmailDeliveryContext({
    organizationId: permissions.organizationId,
    clientId: input.clientId,
  });

  if (!marketing.eligible) {
    await recordOutcome({
      organizationId: permissions.organizationId,
      signalKey: input.signalKey,
      status: "skipped",
      reason: marketing.reason,
    });

    const error =
      marketing.reason === "not_allowed"
        ? t.notAllowed
        : marketing.reason === "missing_email"
          ? t.missingEmail
          : marketing.reason === "missing_client"
            ? t.missingClient
            : t.unknown;

    revalidatePath("/dashboard/retention");
    return { ok: false, status: "skipped", error };
  }

  const { data: organization, error: organizationError } = await admin
    .from("organizations")
    .select(
      "name, slug, phone, address_line_1, address_line_2, city, postal_code, logo_url",
    )
    .eq("id", permissions.organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    await recordOutcome({
      organizationId: permissions.organizationId,
      signalKey: input.signalKey,
      status: "failed",
      reason: "organization_load_failed",
    });
    return { ok: false, status: "failed", error: t.sendFailed };
  }

  try {
    await sendRetentionFollowupEmail({
      organizationId: permissions.organizationId,
      to: marketing.email,
      clientName: candidate.fullName,
      salonName: organization.name,
      salonPhone: organization.phone,
      salonAddress: salonAddress(organization),
      salonLogoUrl: organization.logo_url,
      bookingUrl: `${siteUrl()}/booking/${encodeURIComponent(organization.slug)}`,
      unsubscribeUrl: marketing.unsubscribeUrl,
      reasonCode: input.reasonCode,
      lang: locale,
    });
  } catch (error) {
    const reason =
      error instanceof ManagedEmailError ? error.code : "provider_send_failed";

    try {
      await recordOutcome({
        organizationId: permissions.organizationId,
        signalKey: input.signalKey,
        status: "failed",
        reason,
      });
    } catch (recordError) {
      console.error("CRM follow-up failure outcome could not be recorded:", recordError);
    }

    console.error("CRM follow-up email send failed:", error);
    revalidatePath("/dashboard/retention");
    return { ok: false, status: "failed", error: t.sendFailed };
  }

  try {
    await recordOutcome({
      organizationId: permissions.organizationId,
      signalKey: input.signalKey,
      status: "sent",
    });
  } catch (error) {
    // Delivery already happened. Keep this visible in logs rather than attempting
    // another send from the same request. A later hardening step may add provider
    // idempotency keys if the provider abstraction supports them.
    console.error("CRM follow-up sent but outcome recording failed:", error);
    return { ok: false, status: "failed", error: t.sendFailed };
  }

  revalidatePath("/dashboard/retention");
  revalidatePath(`/dashboard/clients/${input.clientId}`);

  return { ok: true, status: "sent" };
}
