"use server";

import { revalidatePath } from "next/cache";
import { requireAdminForSettings } from "@/lib/page-guards";
import { createAdminClient } from "@/lib/supabase/admin";
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
  revalidatePath("/dashboard/settings");
}

function freshStartCopy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      ownerOnly: "Only the salon owner can perform the one-time fresh start.",
      confirmation: "Enter the salon name exactly to confirm the fresh start.",
      activePlan: "A fresh start is available only after a paid plan is active.",
      unavailable:
        "The one-time demo reset is not available for this salon or has already been used.",
      generic: "The salon could not be reset. Please try again.",
    };
  }

  if (locale === "it") {
    return {
      ownerOnly:
        "Solo il proprietario del salone può eseguire il nuovo inizio una tantum.",
      confirmation:
        "Inserisci esattamente il nome del salone per confermare il nuovo inizio.",
      activePlan:
        "Il nuovo inizio è disponibile solo dopo l'attivazione di un piano a pagamento.",
      unavailable:
        "Il reset una tantum dei dati demo non è disponibile per questo salone o è già stato utilizzato.",
      generic: "Non è stato possibile azzerare il salone. Riprova.",
    };
  }

  return {
    ownerOnly:
      "Samo vlasnik salona može pokrenuti jednokratno postavljanje ispočetka.",
    confirmation:
      "Upiši točan naziv salona kako bi potvrdio postavljanje ispočetka.",
    activePlan:
      "Postavljanje ispočetka dostupno je tek nakon aktivacije plaćenog paketa.",
    unavailable:
      "Jednokratno uklanjanje demo podataka nije dostupno za ovaj salon ili je već iskorišteno.",
    generic: "Salon nije moguće postaviti ispočetka. Pokušaj ponovno.",
  };
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

export async function resetTrialDemoDataForFreshSetupAction(
  confirmation: unknown,
): Promise<SetupActionResult> {
  const permissions = await requireAdminForSettings();
  const copy = freshStartCopy(permissions.organizationLocale);

  if (permissions.organizationRole !== "owner") {
    return { ok: false, error: copy.ownerOnly };
  }

  if (
    typeof confirmation !== "string" ||
    confirmation.trim() !== permissions.organizationName
  ) {
    return { ok: false, error: copy.confirmation };
  }

  if (permissions.organizationLifecycleStatus !== "active") {
    return { ok: false, error: copy.activePlan };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.rpc("reset_sales_trial_demo_data", {
    p_organization_id: permissions.organizationId,
  });

  if (error) {
    if (error.message.includes("SALES_TRIAL_DEMO_RESET_NOT_AVAILABLE")) {
      return { ok: false, error: copy.unavailable };
    }
    if (error.message.includes("SALES_TRIAL_DEMO_RESET_REQUIRES_ACTIVE_PLAN")) {
      return { ok: false, error: copy.activePlan };
    }
    console.error("Could not reset Sales Trial demo data:", error);
    return { ok: false, error: copy.generic };
  }

  revalidateSetup();
  return { ok: true };
}
