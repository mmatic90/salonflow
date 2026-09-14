"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseCapability } from "@/lib/permissions";
import { requireDashboardUser } from "@/lib/page-guards";
import { getTodayLocalDate } from "@/lib/utils";
import {
  getRetentionOverview,
  type RetentionActionCode,
  type RetentionReasonCode,
} from "@/features/retention/queries";

type RetentionActionResult =
  | { ok: true; action: RetentionActionCode }
  | { ok: false; error: string };

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      unavailable: "Retention actions require the Pro plan.",
      invalid: "The CRM action is not valid.",
      stale: "This CRM signal is no longer current. Refresh the list.",
      save: "The CRM action could not be saved.",
    };
  }

  if (locale === "it") {
    return {
      unavailable: "Le azioni retention richiedono il piano Pro.",
      invalid: "L'azione CRM non è valida.",
      stale: "Questo segnale CRM non è più attuale. Aggiorna l'elenco.",
      save: "Non è stato possibile salvare l'azione CRM.",
    };
  }

  return {
    unavailable: "CRM retention akcije zahtijevaju Pro plan.",
    invalid: "CRM akcija nije ispravna.",
    stale: "Ovaj CRM signal više nije aktualan. Osvježi listu.",
    save: "CRM akciju nije moguće spremiti.",
  };
}

function isAction(value: unknown): value is RetentionActionCode {
  return ["contacted", "snoozed", "resolved", "ignored"].includes(
    String(value),
  );
}

function isReason(value: unknown): value is RetentionReasonCode {
  return [
    "overdue_cadence",
    "inactive_client",
    "no_future_booking",
    "attendance_risk",
  ].includes(String(value));
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function createRetentionAction(input: {
  clientId: string;
  signalKey: string;
  reasonCode: RetentionReasonCode;
  action: RetentionActionCode;
  snoozeDays?: number;
}): Promise<RetentionActionResult> {
  const permissions = await requireDashboardUser();
  const t = copy(permissions.organizationLocale);

  if (
    permissions.role !== "admin" ||
    !canUseCapability(permissions, "advanced_crm")
  ) {
    return { ok: false, error: t.unavailable };
  }

  if (
    !input.clientId ||
    !input.signalKey ||
    input.signalKey.length > 220 ||
    !isReason(input.reasonCode) ||
    !isAction(input.action)
  ) {
    return { ok: false, error: t.invalid };
  }

  const snoozeDays = input.action === "snoozed" ? input.snoozeDays : undefined;
  if (
    input.action === "snoozed" &&
    snoozeDays !== 7 &&
    snoozeDays !== 14 &&
    snoozeDays !== 30
  ) {
    return { ok: false, error: t.invalid };
  }

  const overview = await getRetentionOverview();
  const currentCandidate = overview.candidates.find(
    (candidate) =>
      candidate.clientId === input.clientId &&
      candidate.signalKey === input.signalKey &&
      candidate.reasonCode === input.reasonCode,
  );

  if (!currentCandidate) {
    return { ok: false, error: t.stale };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("crm_retention_actions").insert({
    organization_id: permissions.organizationId,
    client_id: input.clientId,
    signal_key: input.signalKey,
    reason_code: input.reasonCode,
    action: input.action,
    snoozed_until:
      input.action === "snoozed" && snoozeDays
        ? addDays(getTodayLocalDate(), snoozeDays)
        : null,
    created_by: permissions.userId,
  });

  if (error) {
    console.error("createRetentionAction failed:", error.message);
    return { ok: false, error: t.save };
  }

  revalidatePath("/dashboard/retention");
  revalidatePath(`/dashboard/clients/${input.clientId}`);

  return { ok: true, action: input.action };
}
