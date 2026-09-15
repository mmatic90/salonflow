"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  isSalonLifecycleStatus,
  isSalonPlanCode,
  type SalonLifecycleStatus,
  type SalonPlanCode,
} from "@/lib/plans";

type SalonStatusActionResult =
  | { ok: true; isActive: boolean }
  | { ok: false; error: string };

type SalonLifecycleActionResult =
  | {
      ok: true;
      planCode: SalonPlanCode;
      lifecycleStatus: SalonLifecycleStatus;
      trialEndsAt: string | null;
      isActive: boolean;
    }
  | { ok: false; error: string };

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function revalidateSalon(organizationId: string) {
  revalidatePath("/platform");
  revalidatePath(`/platform/salons/${organizationId}`);
  revalidatePath("/dashboard", "layout");
}

export async function updatePlatformSalonLifecycleAction(input: {
  organizationId: string;
  planCode: unknown;
  lifecycleStatus: unknown;
  trialEndsOn?: unknown;
}): Promise<SalonLifecycleActionResult> {
  await requirePlatformAdmin();

  if (!isUuid(input.organizationId)) {
    return { ok: false, error: "Neispravan ID salona." };
  }
  if (!isSalonPlanCode(input.planCode)) {
    return { ok: false, error: "Odabrani plan nije ispravan." };
  }
  if (!isSalonLifecycleStatus(input.lifecycleStatus)) {
    return { ok: false, error: "Odabrani status nije ispravan." };
  }

  const trialEndsOn =
    typeof input.trialEndsOn === "string" && input.trialEndsOn.trim()
      ? input.trialEndsOn.trim()
      : null;

  if (trialEndsOn && !validDate(trialEndsOn)) {
    return { ok: false, error: "Datum završetka triala nije ispravan." };
  }
  if (input.lifecycleStatus === "trial" && !trialEndsOn) {
    return { ok: false, error: "Trial status mora imati datum završetka." };
  }

  const supabase = createAdminClient();
  const { data: current, error: currentError } = await supabase
    .from("organizations")
    .select(
      "id, plan_code, lifecycle_status, trial_started_at, trial_ends_at, is_active",
    )
    .eq("id", input.organizationId)
    .maybeSingle();

  if (currentError) return { ok: false, error: currentError.message };
  if (!current) return { ok: false, error: "Salon više ne postoji." };

  const now = new Date().toISOString();
  const planChanged = current.plan_code !== input.planCode;
  const enteringTrial =
    input.lifecycleStatus === "trial" && current.lifecycle_status !== "trial";
  const trialStartedAt =
    enteringTrial && !current.trial_started_at ? now : current.trial_started_at;
  const trialEndsAt = trialEndsOn
    ? `${trialEndsOn}T23:59:59.999Z`
    : current.trial_ends_at;

  if (
    input.lifecycleStatus === "trial" &&
    trialStartedAt &&
    trialEndsAt &&
    new Date(trialEndsAt).getTime() <= new Date(trialStartedAt).getTime()
  ) {
    return {
      ok: false,
      error: "Završetak triala mora biti nakon početka triala.",
    };
  }

  const updatePayload = {
    plan_code: input.planCode,
    lifecycle_status: input.lifecycleStatus,
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    plan_changed_at: planChanged ? now : undefined,
  };

  const { data, error } = await supabase
    .from("organizations")
    .update(updatePayload)
    .eq("id", input.organizationId)
    .select(
      "id, plan_code, lifecycle_status, trial_ends_at, is_active",
    )
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Salon više ne postoji." };

  revalidateSalon(input.organizationId);

  return {
    ok: true,
    planCode: data.plan_code as SalonPlanCode,
    lifecycleStatus: data.lifecycle_status as SalonLifecycleStatus,
    trialEndsAt: data.trial_ends_at ?? null,
    isActive: data.is_active !== false,
  };
}

export async function setPlatformSalonActiveAction(
  organizationId: string,
  isActive: boolean,
): Promise<SalonStatusActionResult> {
  await requirePlatformAdmin();

  if (!isUuid(organizationId)) {
    return { ok: false, error: "Neispravan ID salona." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ lifecycle_status: isActive ? "active" : "suspended" })
    .eq("id", organizationId)
    .select("id, is_active")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Salon više ne postoji." };
  }

  revalidateSalon(organizationId);

  return { ok: true, isActive: data.is_active !== false };
}
