"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canUseCapability } from "@/lib/permissions";
import { requireAdminForSettings } from "@/lib/page-guards";

type ReviewSettingsActionResult =
  | {
      ok: true;
      enabled: boolean;
      googleReviewUrl: string | null;
      delayHours: 2 | 24;
    }
  | { ok: false; error: string };

function isGoogleReviewUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    if (host === "g.page" || host === "goo.gl" || host === "maps.app.goo.gl") {
      return true;
    }

    return /(^|\.)google\.[a-z.]+$/i.test(host);
  } catch {
    return false;
  }
}

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      unavailable: "Google review automation requires the Pro plan.",
      invalidUrl: "Enter a valid Google review HTTPS link.",
      missingUrl: "A Google review link is required before automation can be enabled.",
      invalidDelay: "Choose a supported delay: 2 or 24 hours.",
      missingSettings: "Review settings are not available yet. Apply the latest database migration first.",
    };
  }

  if (locale === "it") {
    return {
      unavailable: "L'automazione delle recensioni Google richiede il piano Pro.",
      invalidUrl: "Inserisci un link HTTPS valido per le recensioni Google.",
      missingUrl: "È necessario un link per le recensioni Google prima di attivare l'automazione.",
      invalidDelay: "Scegli un ritardo supportato: 2 o 24 ore.",
      missingSettings: "Le impostazioni recensioni non sono ancora disponibili. Applica prima l'ultima migrazione del database.",
    };
  }

  return {
    unavailable: "Automatski zahtjevi za Google recenziju zahtijevaju Pro plan.",
    invalidUrl: "Unesite ispravan HTTPS link za Google recenziju.",
    missingUrl: "Google review link je obavezan prije uključivanja automatizacije.",
    invalidDelay: "Odaberite podržanu odgodu: 2 ili 24 sata.",
    missingSettings: "Postavke recenzija još nisu dostupne. Prvo primijenite najnoviju migraciju baze.",
  };
}

export async function updateReviewSettingsAction(input: {
  enabled: boolean;
  googleReviewUrl: string;
  delayHours: number;
}): Promise<ReviewSettingsActionResult> {
  const permissions = await requireAdminForSettings();
  const t = copy(permissions.organizationLocale);

  if (!canUseCapability(permissions, "review_requests")) {
    return { ok: false, error: t.unavailable };
  }

  const delayHours = input.delayHours === 2 ? 2 : input.delayHours === 24 ? 24 : null;
  if (!delayHours) return { ok: false, error: t.invalidDelay };

  const googleReviewUrl = input.googleReviewUrl.trim();
  if (input.enabled && !googleReviewUrl) {
    return { ok: false, error: t.missingUrl };
  }
  if (googleReviewUrl && !isGoogleReviewUrl(googleReviewUrl)) {
    return { ok: false, error: t.invalidUrl };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_review_settings")
    .update({
      enabled: input.enabled,
      google_review_url: googleReviewUrl || null,
      delay_hours: delayHours,
    })
    .eq("organization_id", permissions.organizationId)
    .select("enabled, google_review_url, delay_hours")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: t.missingSettings };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/settings/reviews");

  return {
    ok: true,
    enabled: data.enabled === true,
    googleReviewUrl: data.google_review_url ?? null,
    delayHours: data.delay_hours === 2 ? 2 : 24,
  };
}
