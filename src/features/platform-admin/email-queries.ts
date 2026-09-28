import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  normalizeSalonLifecycleStatus,
  normalizeSalonPlanCode,
  type SalonLifecycleStatus,
  type SalonPlanCode,
} from "@/lib/plans";

function currentUtcMonthStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export type PlatformSalonEmailOverview = {
  organizationId: string;
  provider: "salonflow" | "custom";
  managedEmailEnabled: boolean;
  fromName: string | null;
  replyToEmail: string | null;
  monthlyLimitOverride: number | null;
  periodStart: string;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
};

export type PlatformManagedEmailSalon = PlatformSalonEmailOverview & {
  organizationName: string;
  organizationSlug: string;
  planCode: SalonPlanCode;
  lifecycleStatus: SalonLifecycleStatus;
};

export type PlatformManagedEmailOverview = {
  periodStart: string;
  attemptedCount: number;
  sentCount: number;
  failedCount: number;
  salons: PlatformManagedEmailSalon[];
};

export async function getPlatformSalonEmailOverview(
  organizationId: string,
): Promise<PlatformSalonEmailOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();
  const periodStart = currentUtcMonthStart();

  const [settingsResult, usageResult, organizationResult] = await Promise.all([
    supabase
      .from("organization_email_settings")
      .select(
        "provider, managed_email_enabled, from_name, reply_to_email, monthly_limit_override",
      )
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_email_usage")
      .select("attempted_count, sent_count, failed_count")
      .eq("organization_id", organizationId)
      .eq("period_start", periodStart)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name, email")
      .eq("id", organizationId)
      .maybeSingle(),
  ]);

  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (usageResult.error) throw new Error(usageResult.error.message);
  if (organizationResult.error) throw new Error(organizationResult.error.message);
  if (!organizationResult.data) throw new Error("Salon više ne postoji.");

  const settings = settingsResult.data;
  const usage = usageResult.data;
  const organization = organizationResult.data;

  return {
    organizationId: String(organization.id),
    provider: settings?.provider === "custom" ? "custom" : "salonflow",
    managedEmailEnabled: settings?.managed_email_enabled ?? true,
    fromName: settings?.from_name ?? organization.name ?? null,
    replyToEmail: settings?.reply_to_email ?? organization.email ?? null,
    monthlyLimitOverride: settings?.monthly_limit_override ?? null,
    periodStart,
    attemptedCount: usage?.attempted_count ?? 0,
    sentCount: usage?.sent_count ?? 0,
    failedCount: usage?.failed_count ?? 0,
  };
}

export async function getPlatformManagedEmailOverview(): Promise<PlatformManagedEmailOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();
  const periodStart = currentUtcMonthStart();

  const [organizationsResult, settingsResult, usageResult] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, email, plan_code, lifecycle_status")
      .order("name", { ascending: true }),
    supabase
      .from("organization_email_settings")
      .select(
        "organization_id, provider, managed_email_enabled, from_name, reply_to_email, monthly_limit_override",
      ),
    supabase
      .from("organization_email_usage")
      .select(
        "organization_id, attempted_count, sent_count, failed_count",
      )
      .eq("period_start", periodStart),
  ]);

  if (organizationsResult.error) throw new Error(organizationsResult.error.message);
  if (settingsResult.error) throw new Error(settingsResult.error.message);
  if (usageResult.error) throw new Error(usageResult.error.message);

  const settingsByOrganization = new Map(
    (settingsResult.data ?? []).map((row) => [String(row.organization_id), row]),
  );
  const usageByOrganization = new Map(
    (usageResult.data ?? []).map((row) => [String(row.organization_id), row]),
  );

  const salons: PlatformManagedEmailSalon[] = (organizationsResult.data ?? []).map(
    (organization) => {
      const organizationId = String(organization.id);
      const settings = settingsByOrganization.get(organizationId);
      const usage = usageByOrganization.get(organizationId);

      return {
        organizationId,
        organizationName: String(organization.name),
        organizationSlug: String(organization.slug),
        planCode: normalizeSalonPlanCode(organization.plan_code),
        lifecycleStatus: normalizeSalonLifecycleStatus(
          organization.lifecycle_status,
        ),
        provider: settings?.provider === "custom" ? "custom" : "salonflow",
        managedEmailEnabled: settings?.managed_email_enabled ?? true,
        fromName: settings?.from_name ?? organization.name ?? null,
        replyToEmail: settings?.reply_to_email ?? organization.email ?? null,
        monthlyLimitOverride: settings?.monthly_limit_override ?? null,
        periodStart,
        attemptedCount: usage?.attempted_count ?? 0,
        sentCount: usage?.sent_count ?? 0,
        failedCount: usage?.failed_count ?? 0,
      };
    },
  );

  return {
    periodStart,
    attemptedCount: salons.reduce((sum, salon) => sum + salon.attemptedCount, 0),
    sentCount: salons.reduce((sum, salon) => sum + salon.sentCount, 0),
    failedCount: salons.reduce((sum, salon) => sum + salon.failedCount, 0),
    salons,
  };
}
