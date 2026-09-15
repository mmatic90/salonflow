"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendGoogleReviewRequestEmail } from "@/lib/email/review-request-email";
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

type ReviewTestActionResult = { ok: true } | { ok: false; error: string };

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
      missingEmail: "Your signed-in account does not have an email address for the test message.",
      missingSalon: "The salon could not be loaded for the test message.",
    };
  }

  if (locale === "it") {
    return {
      unavailable: "L'automazione delle recensioni Google richiede il piano Pro.",
      invalidUrl: "Inserisci un link HTTPS valido per le recensioni Google.",
      missingUrl: "È necessario un link per le recensioni Google prima di attivare l'automazione.",
      invalidDelay: "Scegli un ritardo supportato: 2 o 24 ore.",
      missingSettings: "Le impostazioni recensioni non sono ancora disponibili. Applica prima l'ultima migrazione del database.",
      missingEmail: "L'account con cui hai effettuato l'accesso non ha un indirizzo email per il messaggio di test.",
      missingSalon: "Impossibile caricare il salone per il messaggio di test.",
    };
  }

  return {
    unavailable: "Automatski zahtjevi za Google recenziju zahtijevaju Pro plan.",
    invalidUrl: "Unesite ispravan HTTPS link za Google recenziju.",
    missingUrl: "Google review link je obavezan prije uključivanja automatizacije.",
    invalidDelay: "Odaberite podržanu odgodu: 2 ili 24 sata.",
    missingSettings: "Postavke recenzija još nisu dostupne. Prvo primijenite najnoviju migraciju baze.",
    missingEmail: "Prijavljeni račun nema email adresu na koju možemo poslati testnu poruku.",
    missingSalon: "Salon nije moguće učitati za testnu poruku.",
  };
}

function salonAddress(organization: {
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
}) {
  const cityLine = [organization.postal_code, organization.city]
    .filter(Boolean)
    .join(" ")
    .trim();
  const parts = [
    organization.address_line_1,
    organization.address_line_2,
    cityLine || null,
    organization.country_code,
  ].filter((part): part is string => Boolean(part?.trim()));

  return parts.length ? parts.join(", ") : null;
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

export async function sendReviewTestEmailAction(): Promise<ReviewTestActionResult> {
  const permissions = await requireAdminForSettings();
  const t = copy(permissions.organizationLocale);

  if (!canUseCapability(permissions, "review_requests")) {
    return { ok: false, error: t.unavailable };
  }
  if (!permissions.email) {
    return { ok: false, error: t.missingEmail };
  }

  const supabase = await createClient();
  const [settingsResult, organizationResult] = await Promise.all([
    supabase
      .from("organization_review_settings")
      .select("google_review_url")
      .eq("organization_id", permissions.organizationId)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select(
        "name, phone, address_line_1, address_line_2, postal_code, city, country_code, logo_url",
      )
      .eq("id", permissions.organizationId)
      .maybeSingle(),
  ]);

  if (settingsResult.error) return { ok: false, error: settingsResult.error.message };
  if (organizationResult.error) return { ok: false, error: organizationResult.error.message };

  const reviewUrl = settingsResult.data?.google_review_url?.trim();
  if (!reviewUrl) return { ok: false, error: t.missingUrl };
  if (!organizationResult.data) return { ok: false, error: t.missingSalon };

  const organization = organizationResult.data;

  try {
    await sendGoogleReviewRequestEmail({
      organizationId: permissions.organizationId,
      salonName: organization.name,
      salonPhone: organization.phone,
      salonAddress: salonAddress(organization),
      salonLogoUrl: organization.logo_url,
      to: permissions.email,
      clientName: permissions.displayName,
      reviewUrl,
      lang: permissions.organizationLocale,
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Email delivery failed.",
    };
  }

  return { ok: true };
}
