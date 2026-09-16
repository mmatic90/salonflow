"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForSettings } from "@/lib/page-guards";
import { createClient } from "@/lib/supabase/server";
import {
  getGuidedSetupProgress,
  getGuidedSetupState,
  guidedSetupStepCodes,
  type GuidedSetupStepCode,
} from "@/features/guided-setup/queries";

type SetupActionResult =
  | { ok: true }
  | { ok: false; error: string };

function isGuidedSetupStepCode(value: unknown): value is GuidedSetupStepCode {
  return (
    typeof value === "string" &&
    guidedSetupStepCodes.includes(value as GuidedSetupStepCode)
  );
}

function revalidateSetup() {
  revalidatePath("/dashboard/setup");
  revalidatePath("/dashboard");
}

export async function confirmGuidedSetupStepAction(
  stepCode: unknown,
): Promise<SetupActionResult> {
  const permissions = await requireAdminForSettings();
  if (!isGuidedSetupStepCode(stepCode)) {
    return { ok: false, error: "Nepoznat korak postavljanja salona." };
  }

  const state = await getGuidedSetupState(permissions.organizationId);
  const step = state.steps.find((item) => item.code === stepCode);
  if (!step?.technicalReady) {
    return {
      ok: false,
      error: "Ovaj korak još ima obavezne stavke koje treba dovršiti.",
    };
  }

  if (step.confirmed) return { ok: true };

  const now = new Date().toISOString();
  const current = state.progress;
  const confirmed = Array.from(
    new Set([...(current?.confirmedSteps ?? []), stepCode]),
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_setup_progress")
    .upsert(
      {
        organization_id: permissions.organizationId,
        source: current?.source ?? "manual",
        confirmed_steps: confirmed,
        started_at: current?.startedAt ?? now,
        dismissed_at: current?.dismissedAt ?? null,
        completed_at: current?.completedAt ?? null,
        updated_at: now,
      },
      { onConflict: "organization_id" },
    );

  if (error) return { ok: false, error: error.message };
  revalidateSetup();
  return { ok: true };
}

export async function dismissGuidedSetupAction(): Promise<SetupActionResult> {
  const permissions = await requireAdminForSettings();
  const current = await getGuidedSetupProgress(permissions.organizationId);
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_setup_progress")
    .upsert(
      {
        organization_id: permissions.organizationId,
        source: current?.source ?? "manual",
        confirmed_steps: current?.confirmedSteps ?? [],
        started_at: current?.startedAt ?? now,
        dismissed_at: now,
        completed_at: current?.completedAt ?? null,
        updated_at: now,
      },
      { onConflict: "organization_id" },
    );

  if (error) return { ok: false, error: error.message };
  revalidateSetup();
  return { ok: true };
}

export async function completeGuidedSetupAction(): Promise<SetupActionResult> {
  const permissions = await requireAdminForSettings();
  const state = await getGuidedSetupState(permissions.organizationId);

  if (!state.canComplete) {
    return {
      ok: false,
      error: "Prije završetka pregledaj sve korake i riješi obavezne stavke.",
    };
  }

  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("organization_setup_progress")
    .upsert(
      {
        organization_id: permissions.organizationId,
        source: state.progress?.source ?? "manual",
        confirmed_steps: state.steps.map((step) => step.code),
        started_at: state.progress?.startedAt ?? now,
        dismissed_at: null,
        completed_at: now,
        updated_at: now,
      },
      { onConflict: "organization_id" },
    );

  if (error) return { ok: false, error: error.message };
  revalidateSetup();
  return { ok: true };
}
