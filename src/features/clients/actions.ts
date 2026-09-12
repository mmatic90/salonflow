"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { requireDashboardUser } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

export type ClientFormValues = {
  full_name: string;
  phone: string;
  email: string;
  note: string;
  allergies_sensitivities: string;
  contraindications: string;
  treatment_preferences: string;
};

export type ClientActionState = {
  error: string;
  values: ClientFormValues;
};

function normalizeText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNullableText(value: FormDataEntryValue | null) {
  const parsed = normalizeText(value);
  return parsed.length > 0 ? parsed : null;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts.shift() ?? "",
    lastName: parts.length > 0 ? parts.join(" ") : null,
  };
}

function getFormValues(formData: FormData): ClientFormValues {
  return {
    full_name: normalizeText(formData.get("full_name")),
    phone: normalizeText(formData.get("phone")),
    email: normalizeText(formData.get("email")),
    note: normalizeText(formData.get("note")),
    allergies_sensitivities: normalizeText(
      formData.get("allergies_sensitivities"),
    ),
    contraindications: normalizeText(formData.get("contraindications")),
    treatment_preferences: normalizeText(formData.get("treatment_preferences")),
  };
}

function revalidateClientPaths(clientId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
  revalidatePath("/dashboard/clients/new");
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/appointments/new");
  if (clientId) {
    revalidatePath(`/dashboard/clients/${clientId}`);
    revalidatePath(`/dashboard/clients/${clientId}/edit`);
  }
}

export async function createClientAction(
  _prevState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const permissions = await requireDashboardUser();
  const supabase = await createClient();
  const t = getDictionary(permissions.organizationLocale).clients.actionMessages;
  const values = getFormValues(formData);

  if (!values.full_name) {
    return { error: t.nameRequired, values };
  }

  const { firstName, lastName } = splitFullName(values.full_name);
  const payload = {
    organization_id: permissions.organizationId,
    first_name: firstName,
    last_name: lastName,
    phone: normalizeNullableText(formData.get("phone")),
    email: normalizeNullableText(formData.get("email")),
    notes: normalizeNullableText(formData.get("note")),
    allergies_sensitivities: normalizeNullableText(
      formData.get("allergies_sensitivities"),
    ),
    contraindications: normalizeNullableText(formData.get("contraindications")),
    treatment_preferences: normalizeNullableText(
      formData.get("treatment_preferences"),
    ),
    marketing_consent: false,
    is_active: true,
  };

  const { data: client, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("id")
    .single();

  if (error || !client) {
    return { error: error?.message || t.saveError, values };
  }

  await writeAuditLog({
    action: "client_created",
    entityType: "client",
    entityId: client.id,
    entityLabel: values.full_name,
    details: payload,
  });

  revalidateClientPaths(client.id);
  redirect("/dashboard/clients");
}

export async function updateClientAction(
  clientId: string,
  _prevState: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const permissions = await requireDashboardUser();
  const supabase = await createClient();
  const t = getDictionary(permissions.organizationLocale).clients.actionMessages;
  const values = getFormValues(formData);

  if (!values.full_name) {
    return { error: t.nameRequired, values };
  }

  const { data: beforeClient, error: beforeError } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, email, notes, allergies_sensitivities, contraindications, treatment_preferences, is_active",
    )
    .eq("organization_id", permissions.organizationId)
    .eq("id", clientId)
    .maybeSingle();

  if (beforeError) {
    return { error: beforeError.message, values };
  }

  const { firstName, lastName } = splitFullName(values.full_name);
  const payload = {
    first_name: firstName,
    last_name: lastName,
    phone: normalizeNullableText(formData.get("phone")),
    email: normalizeNullableText(formData.get("email")),
    notes: normalizeNullableText(formData.get("note")),
    allergies_sensitivities: normalizeNullableText(
      formData.get("allergies_sensitivities"),
    ),
    contraindications: normalizeNullableText(formData.get("contraindications")),
    treatment_preferences: normalizeNullableText(
      formData.get("treatment_preferences"),
    ),
  };

  const { error } = await supabase
    .from("clients")
    .update(payload)
    .eq("organization_id", permissions.organizationId)
    .eq("id", clientId);

  if (error) {
    return { error: error.message, values };
  }

  await writeAuditLog({
    action: "client_updated",
    entityType: "client",
    entityId: clientId,
    entityLabel: values.full_name,
    details: { before: beforeClient, after: payload },
  });

  revalidateClientPaths(clientId);
  redirect(`/dashboard/clients/${clientId}`);
}

export async function deleteClientAction(clientId: string) {
  const permissions = await requireDashboardUser();
  const supabase = await createClient();
  const t = getDictionary(permissions.organizationLocale).clients.actionMessages;

  const { data: clientBefore, error: beforeError } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, email, notes, allergies_sensitivities, contraindications, treatment_preferences, is_active",
    )
    .eq("organization_id", permissions.organizationId)
    .eq("id", clientId)
    .maybeSingle();

  if (beforeError) {
    return { ok: false, message: beforeError.message };
  }

  const { error } = await supabase
    .from("clients")
    .update({ is_active: false })
    .eq("organization_id", permissions.organizationId)
    .eq("id", clientId);

  if (error) {
    return { ok: false, message: error.message };
  }

  const entityLabel = clientBefore
    ? [clientBefore.first_name, clientBefore.last_name].filter(Boolean).join(" ")
    : null;

  await writeAuditLog({
    action: "client_deleted",
    entityType: "client",
    entityId: clientId,
    entityLabel,
    details: {
      soft_delete: true,
      before: clientBefore,
      after: { is_active: false },
    },
  });

  revalidateClientPaths(clientId);
  return { ok: true, message: t.removed };
}
