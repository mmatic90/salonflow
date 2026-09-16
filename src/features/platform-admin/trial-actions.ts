"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPlatformTrialInvite } from "@/lib/email/platform-trial-invite";
import { DEFAULT_TRIAL_DAYS } from "@/lib/plans";
import {
  SALES_TRIAL_SEED_VERSION,
  seedSalesTrialOrganization,
} from "@/features/platform-admin/trial-seed";

type TrialLocale = "hr" | "en" | "it";
type TrialCountry = "HR" | "IT";

export type CreateSalesTrialInput = {
  salonName: string;
  ownerName: string;
  ownerEmail: string;
  locale: TrialLocale;
  countryCode: TrialCountry;
  city?: string | null;
  phone?: string | null;
  seedDemoData: boolean;
};

export type CreateSalesTrialResult =
  | {
      ok: true;
      organizationId: string;
      salonName: string;
      slug: string;
      trialEndsAt: string;
      inviteSent: boolean;
      warning?: string;
    }
  | { ok: false; error: string };

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("NEXT_PUBLIC_SITE_URL is required for sales trial invitations.");
}

function marketSettings(countryCode: TrialCountry) {
  return countryCode === "IT"
    ? { timezone: "Europe/Rome", currency: "EUR" }
    : { timezone: "Europe/Zagreb", currency: "EUR" };
}

async function emailAlreadyExists(email: string) {
  const supabase = createAdminClient();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(error.message);

    if (
      data.users.some(
        (user) => user.email?.trim().toLowerCase() === email.toLowerCase(),
      )
    ) {
      return true;
    }

    if (data.users.length < perPage) return false;
    page += 1;
  }
}

async function uniqueSlug(baseName: string) {
  const supabase = createAdminClient();
  const base = slugify(baseName) || "salon";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate =
      attempt === 0
        ? base
        : `${base.slice(0, 41)}-${crypto.randomUUID().slice(0, 6)}`;
    const { data, error } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return candidate;
  }

  throw new Error("Could not generate a unique salon URL.");
}

function friendlyProvisioningError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (/already|registered|exists/i.test(message)) {
    return "Ovaj email već ima SalonFlow korisnički račun. Za prvi Sales Trial koristi novi email.";
  }
  return message;
}

export async function createSalesTrialAction(
  input: CreateSalesTrialInput,
): Promise<CreateSalesTrialResult> {
  const platformAdmin = await requirePlatformAdmin();
  const salonName = input.salonName.trim();
  const ownerName = input.ownerName.trim();
  const ownerEmail = normalizeEmail(input.ownerEmail);
  const city = input.city?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (salonName.length < 2 || salonName.length > 120) {
    return { ok: false, error: "Naziv salona mora imati između 2 i 120 znakova." };
  }
  if (ownerName.length < 2 || ownerName.length > 120) {
    return { ok: false, error: "Ime kontakt osobe mora imati između 2 i 120 znakova." };
  }
  if (!isEmail(ownerEmail) || ownerEmail.length > 320) {
    return { ok: false, error: "Unesi ispravnu email adresu vlasnika salona." };
  }
  if (!(["hr", "en", "it"] as const).includes(input.locale)) {
    return { ok: false, error: "Nepodržan jezik trial računa." };
  }
  if (!(["HR", "IT"] as const).includes(input.countryCode)) {
    return { ok: false, error: "Sales Trial trenutno podržava tržišta HR i IT." };
  }

  const supabase = createAdminClient();
  let generatedUserId: string | null = null;
  let organizationId: string | null = null;
  let actionLink: string | null = null;

  try {
    if (await emailAlreadyExists(ownerEmail)) {
      return {
        ok: false,
        error:
          "Ovaj email već postoji u SalonFlowu. Za novi privatni trial koristi email koji još nema račun.",
      };
    }

    const redirectTo = `${siteUrl()}/set-password`;
    const { data: invite, error: inviteError } =
      await supabase.auth.admin.generateLink({
        type: "invite",
        email: ownerEmail,
        options: {
          data: {
            display_name: ownerName,
            salonflow_invite: "sales_trial",
          },
          redirectTo,
        },
      });

    if (inviteError || !invite.user?.id || !invite.properties?.action_link) {
      throw new Error(inviteError?.message || "Could not generate trial invitation.");
    }

    generatedUserId = invite.user.id;
    actionLink = invite.properties.action_link;

    const slug = await uniqueSlug(salonName);
    const market = marketSettings(input.countryCode);
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(
      trialStartedAt.getTime() + DEFAULT_TRIAL_DAYS * 24 * 60 * 60 * 1000,
    );

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: salonName,
        slug,
        timezone: market.timezone,
        locale: input.locale,
        currency: market.currency,
        phone,
        email: ownerEmail,
        city,
        country_code: input.countryCode,
        is_active: true,
        created_by: generatedUserId,
        plan_code: "starter",
        lifecycle_status: "trial",
        trial_started_at: trialStartedAt.toISOString(),
        trial_ends_at: trialEndsAt.toISOString(),
        plan_changed_at: trialStartedAt.toISOString(),
      })
      .select("id, slug")
      .single();

    if (organizationError || !organization?.id) {
      throw new Error(organizationError?.message || "Could not create trial salon.");
    }

    const createdOrganizationId = String(organization.id);
    organizationId = createdOrganizationId;

    const { error: membershipError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: createdOrganizationId,
        user_id: generatedUserId,
        role: "owner",
        display_name: ownerName,
        is_active: true,
      });
    if (membershipError) throw new Error(membershipError.message);

    const { error: metadataError } = await supabase
      .from("organization_trial_metadata")
      .insert({
        organization_id: createdOrganizationId,
        owner_invite_email: ownerEmail,
        demo_data_seeded: false,
        seed_version: null,
        created_by_platform_admin: platformAdmin.userId,
      });
    if (metadataError) throw new Error(metadataError.message);

    const [reviewSettings, retentionSettings] = await Promise.all([
      supabase
        .from("organization_review_settings")
        .update({ enabled: false })
        .eq("organization_id", createdOrganizationId),
      supabase
        .from("organization_retention_automation_settings")
        .update({ enabled: false })
        .eq("organization_id", createdOrganizationId),
    ]);
    if (reviewSettings.error) throw new Error(reviewSettings.error.message);
    if (retentionSettings.error) throw new Error(retentionSettings.error.message);

    if (input.seedDemoData) {
      await seedSalesTrialOrganization({
        supabase,
        organizationId: createdOrganizationId,
        locale: input.locale,
      });

      const { error: seedMetadataError } = await supabase
        .from("organization_trial_metadata")
        .update({
          demo_data_seeded: true,
          seed_version: SALES_TRIAL_SEED_VERSION,
          last_demo_reset_at: new Date().toISOString(),
        })
        .eq("organization_id", createdOrganizationId);
      if (seedMetadataError) throw new Error(seedMetadataError.message);
    }

    let inviteSent = false;
    let warning: string | undefined;
    try {
      await sendPlatformTrialInvite({
        to: ownerEmail,
        ownerName,
        salonName,
        locale: input.locale,
        actionLink,
        hasDemoData: input.seedDemoData,
      });
      inviteSent = true;
      await supabase
        .from("organization_trial_metadata")
        .update({
          invite_sent_at: new Date().toISOString(),
          invite_last_error: null,
        })
        .eq("organization_id", createdOrganizationId);
    } catch (inviteSendError) {
      const message =
        inviteSendError instanceof Error
          ? inviteSendError.message
          : "Unknown invite email error";
      warning =
        "Trial salon je kreiran, ali pozivni email nije poslan. Možeš poslati novu pozivnicu nakon provjere email providera.";
      await supabase
        .from("organization_trial_metadata")
        .update({ invite_last_error: message.slice(0, 500) })
        .eq("organization_id", createdOrganizationId);
    }

    revalidatePath("/platform");

    return {
      ok: true,
      organizationId: createdOrganizationId,
      salonName,
      slug: organization.slug,
      trialEndsAt: trialEndsAt.toISOString(),
      inviteSent,
      warning,
    };
  } catch (error) {
    if (organizationId) {
      await supabase.from("organizations").delete().eq("id", organizationId);
    }
    if (generatedUserId) {
      await supabase.auth.admin.deleteUser(generatedUserId);
    }

    return { ok: false, error: friendlyProvisioningError(error) };
  }
}
