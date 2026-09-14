"use server";

import { revalidatePath } from "next/cache";
import { canUseCapability } from "@/lib/permissions";
import { requireDashboardUser } from "@/lib/page-guards";
import { deliverRetentionFollowup } from "@/features/retention/followup-delivery";
import {
  getRetentionOverview,
  type RetentionReasonCode,
} from "@/features/retention/queries";

type Result =
  | { ok: true; status: "sent" }
  | { ok: false; status: "failed" | "skipped"; error: string };

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

function deliveryError(reason: string, t: ReturnType<typeof copy>) {
  if (reason === "already_sent") return t.duplicate;
  if (reason === "in_progress") return t.inProgress;
  if (reason === "unknown") return t.unknown;
  if (reason === "not_allowed") return t.notAllowed;
  if (reason === "missing_email") return t.missingEmail;
  if (reason === "missing_client") return t.missingClient;
  return t.sendFailed;
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

  const result = await deliverRetentionFollowup({
    organizationId: permissions.organizationId,
    candidate,
    locale,
    initiatedBy: permissions.userId,
  });

  revalidatePath("/dashboard/retention");
  revalidatePath(`/dashboard/clients/${input.clientId}`);

  if (result.status === "sent") {
    return { ok: true, status: "sent" };
  }

  return {
    ok: false,
    status: result.status,
    error: deliveryError(result.reason, t),
  };
}
