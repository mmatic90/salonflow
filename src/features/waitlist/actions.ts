"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireDashboardUser } from "@/lib/page-guards";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function revalidateWaitlist() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/waitlist");
}

function validatePreferenceRange(formData: FormData) {
  const dateFrom = nullable(formData, "preferred_date_from");
  const dateTo = nullable(formData, "preferred_date_to");
  const timeFrom = nullable(formData, "preferred_time_from");
  const timeTo = nullable(formData, "preferred_time_to");

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("Početni datum ne može biti nakon završnog datuma.");
  }

  if ((timeFrom && !timeTo) || (!timeFrom && timeTo)) {
    throw new Error("Za vremenski raspon unesite i početno i završno vrijeme.");
  }

  if (timeFrom && timeTo && timeFrom >= timeTo) {
    throw new Error("Početno vrijeme mora biti prije završnog vremena.");
  }

  return { dateFrom, dateTo, timeFrom, timeTo };
}

export async function createWaitlistEntryAction(formData: FormData) {
  const permissions = await requireDashboardUser();
  const clientId = text(formData, "client_id");
  const serviceId = text(formData, "service_id");
  const preferredEmployeeId = nullable(formData, "preferred_employee_id");
  const notes = nullable(formData, "notes");
  const { dateFrom, dateTo, timeFrom, timeTo } = validatePreferenceRange(formData);

  if (!clientId || !serviceId) {
    throw new Error("Klijent i usluga su obavezni.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist_entries").insert({
    organization_id: permissions.organizationId,
    client_id: clientId,
    service_id: serviceId,
    preferred_employee_id: preferredEmployeeId,
    preferred_date_from: dateFrom,
    preferred_date_to: dateTo,
    preferred_time_from: timeFrom,
    preferred_time_to: timeTo,
    notes,
    status: "waiting",
  });

  if (error) {
    throw new Error(error.message || "Nije moguće dodati klijenta na listu čekanja.");
  }

  revalidateWaitlist();
}

export async function updateWaitlistEntryAction(
  entryId: string,
  formData: FormData,
) {
  const permissions = await requireDashboardUser();
  const clientId = text(formData, "client_id");
  const serviceId = text(formData, "service_id");
  const preferredEmployeeId = nullable(formData, "preferred_employee_id");
  const notes = nullable(formData, "notes");
  const { dateFrom, dateTo, timeFrom, timeTo } = validatePreferenceRange(formData);

  if (!clientId || !serviceId) {
    throw new Error("Klijent i usluga su obavezni.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_entries")
    .update({
      client_id: clientId,
      service_id: serviceId,
      preferred_employee_id: preferredEmployeeId,
      preferred_date_from: dateFrom,
      preferred_date_to: dateTo,
      preferred_time_from: timeFrom,
      preferred_time_to: timeTo,
      notes,
    })
    .eq("id", entryId)
    .eq("organization_id", permissions.organizationId)
    .eq("status", "waiting");

  if (error) {
    throw new Error(error.message || "Nije moguće ažurirati listu čekanja.");
  }

  revalidateWaitlist();
}

export async function cancelWaitlistEntryAction(entryId: string) {
  const permissions = await requireDashboardUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("waitlist_entries")
    .update({ status: "cancelled", booked_appointment_id: null })
    .eq("id", entryId)
    .eq("organization_id", permissions.organizationId)
    .eq("status", "waiting");

  if (error) {
    throw new Error(error.message || "Nije moguće ukloniti zapis s liste čekanja.");
  }

  revalidateWaitlist();
}
