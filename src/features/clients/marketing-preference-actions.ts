"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardUser } from "@/lib/page-guards";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import type { MarketingEmailStatus } from "@/features/clients/marketing-preferences";

type Result =
  | { ok: true; status: MarketingEmailStatus }
  | { ok: false; error: string };

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      unavailable: "Only salon administrators can change marketing preferences.",
      invalid: "Choose a valid marketing email preference.",
      missingClient: "Client not found.",
      emailRequired: "Add an email address before marking marketing email as allowed.",
      save: "Marketing preference could not be saved.",
    };
  }
  if (locale === "it") {
    return {
      unavailable: "Solo gli amministratori del salone possono modificare le preferenze marketing.",
      invalid: "Scegli una preferenza valida per le email marketing.",
      missingClient: "Cliente non trovato.",
      emailRequired: "Aggiungi un indirizzo email prima di consentire le email marketing.",
      save: "Impossibile salvare la preferenza marketing.",
    };
  }
  return {
    unavailable: "Samo administrator salona može mijenjati marketinške preference.",
    invalid: "Odaberi ispravnu marketinšku email preferencu.",
    missingClient: "Klijent nije pronađen.",
    emailRequired: "Dodaj email adresu prije nego označiš marketinški email kao dopušten.",
    save: "Marketinšku preferencu nije moguće spremiti.",
  };
}

function isStatus(value: unknown): value is MarketingEmailStatus {
  return ["unknown", "allowed", "not_allowed"].includes(String(value));
}

export async function updateClientMarketingPreferenceAction(input: {
  clientId: string;
  status: MarketingEmailStatus;
}): Promise<Result> {
  const permissions = await requireDashboardUser();
  const t = copy(permissions.organizationLocale);

  if (permissions.role !== "admin") {
    return { ok: false, error: t.unavailable };
  }
  if (!input.clientId || !isStatus(input.status)) {
    return { ok: false, error: t.invalid };
  }

  const supabase = await createClient();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email, marketing_email_status")
    .eq("organization_id", permissions.organizationId)
    .eq("id", input.clientId)
    .maybeSingle();

  if (clientError) return { ok: false, error: clientError.message };
  if (!client) return { ok: false, error: t.missingClient };

  if (input.status === "allowed" && !client.email?.trim()) {
    return { ok: false, error: t.emailRequired };
  }

  const previousStatus = (client.marketing_email_status || "unknown") as MarketingEmailStatus;
  if (previousStatus === input.status) {
    return { ok: true, status: input.status };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("clients")
    .update({
      marketing_email_status: input.status,
      marketing_email_consent_at: input.status === "allowed" ? now : null,
      marketing_email_consent_source: input.status === "allowed" ? "manual" : null,
      marketing_email_source: "manual",
      marketing_email_updated_at: now,
      marketing_email_updated_by: permissions.userId,
    })
    .eq("organization_id", permissions.organizationId)
    .eq("id", input.clientId);

  if (error) {
    console.error("updateClientMarketingPreferenceAction failed:", error.message);
    return { ok: false, error: t.save };
  }

  const label = [client.first_name, client.last_name].filter(Boolean).join(" ") || null;
  await writeAuditLog({
    action: "client_marketing_preference_changed",
    entityType: "client",
    entityId: client.id,
    entityLabel: label,
    details: {
      previous_status: previousStatus,
      new_status: input.status,
      source: "manual",
    },
  });

  revalidatePath(`/dashboard/clients/${input.clientId}`);
  revalidatePath(`/dashboard/clients/${input.clientId}/edit`);
  revalidatePath("/dashboard/retention");

  return { ok: true, status: input.status };
}
