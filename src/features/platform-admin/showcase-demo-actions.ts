"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { seedSalesTrialOrganization } from "@/features/platform-admin/trial-seed";
import {
  SHOWCASE_DEMOS,
  SHOWCASE_DEMO_KEYS,
  isShowcaseDemoKey,
  type ShowcaseDemoKey,
} from "@/features/platform-admin/showcase-demo-config";

export type ShowcaseDemoActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

async function ensureAutomationsOff(organizationId: string) {
  const supabase = createAdminClient();
  const [reviewResult, retentionResult] = await Promise.all([
    supabase
      .from("organization_review_settings")
      .update({
        enabled: false,
        google_review_url: null,
        enabled_at: null,
      })
      .eq("organization_id", organizationId),
    supabase
      .from("organization_retention_automation_settings")
      .update({
        enabled: false,
        enabled_at: null,
      })
      .eq("organization_id", organizationId),
  ]);

  if (reviewResult.error) throw new Error(reviewResult.error.message);
  if (retentionResult.error) throw new Error(retentionResult.error.message);
}

async function createOneShowcaseDemo(key: ShowcaseDemoKey) {
  const platformAdmin = await requirePlatformAdmin();
  const supabase = createAdminClient();
  const demo = SHOWCASE_DEMOS[key];

  const { data: registered, error: registeredError } = await supabase
    .from("showcase_demo_organizations")
    .select("organization_id")
    .eq("demo_key", key)
    .maybeSingle();
  if (registeredError) throw new Error(registeredError.message);
  if (registered?.organization_id) return false;

  const { data: slugOwner, error: slugError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", demo.slug)
    .maybeSingle();
  if (slugError) throw new Error(slugError.message);
  if (slugOwner) {
    throw new Error(
      `Slug /${demo.slug} već koristi salon ${slugOwner.name}. Preimenuj ili ukloni taj stari testni salon prije kreiranja showcase demoa.`,
    );
  }

  let organizationId: string | null = null;
  try {
    const now = new Date().toISOString();
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .insert({
        name: demo.name,
        slug: demo.slug,
        timezone: demo.timezone,
        locale: demo.locale,
        currency: "EUR",
        city: demo.city,
        country_code: demo.countryCode,
        is_active: true,
        created_by: platformAdmin.userId,
        plan_code: "pro",
        lifecycle_status: "active",
        trial_started_at: null,
        trial_ends_at: null,
        plan_changed_at: now,
      })
      .select("id")
      .single();
    if (organizationError || !organization?.id) {
      throw new Error(organizationError?.message || "Demo salon nije kreiran.");
    }

    organizationId = String(organization.id);

    const { error: membershipError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organizationId,
        user_id: platformAdmin.userId,
        role: "owner",
        display_name: platformAdmin.displayName,
        is_active: true,
      });
    if (membershipError) throw new Error(membershipError.message);

    const { error: registryError } = await supabase
      .from("showcase_demo_organizations")
      .insert({
        organization_id: organizationId,
        demo_key: key,
        locale: demo.locale,
      });
    if (registryError) throw new Error(registryError.message);

    await ensureAutomationsOff(organizationId);
    await seedSalesTrialOrganization({
      supabase,
      organizationId,
      locale: demo.locale,
    });

    const { error: refreshedError } = await supabase
      .from("showcase_demo_organizations")
      .update({
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId);
    if (refreshedError) throw new Error(refreshedError.message);

    return true;
  } catch (error) {
    if (organizationId) {
      await supabase.from("organizations").delete().eq("id", organizationId);
    }
    throw error;
  }
}

export async function createMissingShowcaseDemosAction(): Promise<ShowcaseDemoActionResult> {
  await requirePlatformAdmin();

  try {
    let created = 0;
    for (const key of SHOWCASE_DEMO_KEYS) {
      if (await createOneShowcaseDemo(key)) created += 1;
    }

    revalidatePath("/platform");
    revalidatePath("/platform/demos");

    return {
      ok: true,
      message:
        created === 0
          ? "Sva tri showcase demo salona već postoje."
          : `Kreirano showcase demo salona: ${created}.`,
    };
  } catch (error) {
    console.error("Showcase demo provisioning failed:", error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Showcase demo salone nije moguće kreirati.",
    };
  }
}

export async function refreshShowcaseDemoAction(
  keyInput: string,
): Promise<ShowcaseDemoActionResult> {
  await requirePlatformAdmin();
  if (!isShowcaseDemoKey(keyInput)) {
    return { ok: false, error: "Nepoznat showcase demo." };
  }

  const supabase = createAdminClient();
  const demo = SHOWCASE_DEMOS[keyInput];

  try {
    const { data: registry, error: registryError } = await supabase
      .from("showcase_demo_organizations")
      .select("organization_id")
      .eq("demo_key", keyInput)
      .maybeSingle();
    if (registryError) throw new Error(registryError.message);
    if (!registry?.organization_id) {
      return {
        ok: false,
        error: `${demo.name} još nije kreiran kao showcase demo.`,
      };
    }

    const organizationId = String(registry.organization_id);
    const { error: resetError } = await supabase.rpc(
      "reset_showcase_demo_data",
      { p_organization_id: organizationId },
    );
    if (resetError) throw new Error(resetError.message);

    await seedSalesTrialOrganization({
      supabase,
      organizationId,
      locale: demo.locale,
    });
    await ensureAutomationsOff(organizationId);

    const refreshedAt = new Date().toISOString();
    const { error: metadataError } = await supabase
      .from("showcase_demo_organizations")
      .update({
        last_refreshed_at: refreshedAt,
        updated_at: refreshedAt,
      })
      .eq("organization_id", organizationId);
    if (metadataError) throw new Error(metadataError.message);

    revalidatePath("/platform");
    revalidatePath("/platform/demos");
    revalidatePath(`/platform/salons/${organizationId}`);
    revalidatePath(`/booking/${demo.slug}`);

    return {
      ok: true,
      message: `${demo.name} je osvježen novim demo podacima i terminima relativnim na današnji datum.`,
    };
  } catch (error) {
    console.error(`Showcase demo refresh failed (${keyInput}):`, error);
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Demo podatke nije moguće osvježiti.",
    };
  }
}
