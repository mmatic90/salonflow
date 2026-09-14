import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getEffectiveEntitlementPlan,
  planHasCapability,
} from "@/lib/entitlements";
import {
  normalizeSalonLifecycleStatus,
  normalizeSalonPlanCode,
} from "@/lib/plans";
import { getRetentionOverviewForOrganizationAdmin } from "@/features/retention/admin-queries";
import { deliverRetentionFollowup } from "@/features/retention/followup-delivery";
import type { AppLocale } from "@/lib/i18n";

type SettingsRow = {
  organization_id: string;
  enabled: boolean;
  daily_limit: number;
};

type OrganizationRow = {
  id: string;
  locale: string | null;
  timezone: string | null;
  plan_code: string | null;
  lifecycle_status: string | null;
  is_active: boolean | null;
};

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;
  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
}

function normalizeLocale(value: string | null | undefined): AppLocale {
  if (value === "en" || value === "it") return value;
  return "hr";
}

function safeTimeZone(value: string | null | undefined) {
  const candidate = value?.trim() || "Europe/Zagreb";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format();
    return candidate;
  } catch {
    return "Europe/Zagreb";
  }
}

function localDate(timeZoneValue: string | null | undefined) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: safeTimeZone(timeZoneValue),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

function organizationCanUseAutomation(organization: OrganizationRow) {
  if (organization.is_active === false) return false;
  const lifecycle = normalizeSalonLifecycleStatus(organization.lifecycle_status);
  if (lifecycle === "suspended") return false;
  const effectivePlan = getEffectiveEntitlementPlan(
    normalizeSalonPlanCode(organization.plan_code),
    lifecycle,
  );
  return planHasCapability(effectivePlan, "automations");
}

async function recordRun(args: {
  organizationId: string;
  status: "completed" | "failed";
  candidates: number;
  sent: number;
  skipped: number;
  failed: number;
  error?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("record_retention_automation_run", {
    p_organization_id: args.organizationId,
    p_status: args.status,
    p_candidates: args.candidates,
    p_sent: args.sent,
    p_skipped: args.skipped,
    p_failed: args.failed,
    p_error: args.error ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const supabase = createAdminClient();

  const { data: settingsData, error: settingsError } = await supabase
    .from("organization_retention_automation_settings")
    .select("organization_id, enabled, daily_limit")
    .eq("enabled", true);

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const settingsRows = (settingsData ?? []) as SettingsRow[];
  const organizationIds = settingsRows.map((row) => row.organization_id);

  if (organizationIds.length === 0) {
    return NextResponse.json({
      ok: true,
      dryRun,
      organizations: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      results: [],
    });
  }

  const { data: organizationData, error: organizationError } = await supabase
    .from("organizations")
    .select("id, locale, timezone, plan_code, lifecycle_status, is_active")
    .in("id", organizationIds);

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 });
  }

  const organizations = new Map(
    ((organizationData ?? []) as OrganizationRow[]).map((organization) => [
      organization.id,
      organization,
    ]),
  );

  const results: Array<{
    organizationId: string;
    status: string;
    candidates?: number;
    eligible?: number;
    sent?: number;
    skipped?: number;
    failed?: number;
  }> = [];
  let totalSent = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const settings of settingsRows) {
    const organization = organizations.get(settings.organization_id);
    if (!organization || !organizationCanUseAutomation(organization)) {
      results.push({
        organizationId: settings.organization_id,
        status: "plan_not_eligible",
      });
      continue;
    }

    const today = localDate(organization.timezone);

    if (!dryRun) {
      const { data: claimed, error: claimError } = await supabase.rpc(
        "claim_retention_automation_run",
        {
          p_organization_id: settings.organization_id,
          p_local_date: today,
        },
      );

      if (claimError) {
        totalFailed += 1;
        results.push({
          organizationId: settings.organization_id,
          status: "claim_failed",
          failed: 1,
        });
        continue;
      }

      if (claimed !== true) {
        results.push({
          organizationId: settings.organization_id,
          status: "already_processed_today",
        });
        continue;
      }
    }

    try {
      const overview = await getRetentionOverviewForOrganizationAdmin({
        organizationId: settings.organization_id,
        today,
      });
      const eligible = overview.candidates.filter(
        (candidate) =>
          candidate.marketingEmailStatus === "allowed" &&
          Boolean(candidate.email?.trim()),
      );
      const selected = eligible.slice(0, settings.daily_limit);
      let sent = 0;
      let failed = 0;
      let skipped =
        overview.candidates.length - eligible.length +
        Math.max(eligible.length - selected.length, 0);

      if (!dryRun) {
        for (const candidate of selected) {
          const delivery = await deliverRetentionFollowup({
            organizationId: settings.organization_id,
            candidate,
            locale: normalizeLocale(organization.locale),
            initiatedBy: null,
          });

          if (delivery.status === "sent") sent += 1;
          else if (delivery.status === "failed") failed += 1;
          else skipped += 1;
        }

        await recordRun({
          organizationId: settings.organization_id,
          status: "completed",
          candidates: overview.candidates.length,
          sent,
          skipped,
          failed,
        });
      }

      totalSent += sent;
      totalSkipped += skipped;
      totalFailed += failed;
      results.push({
        organizationId: settings.organization_id,
        status: dryRun ? "dry_run" : "completed",
        candidates: overview.candidates.length,
        eligible: eligible.length,
        sent,
        skipped,
        failed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      totalFailed += 1;

      if (!dryRun) {
        try {
          await recordRun({
            organizationId: settings.organization_id,
            status: "failed",
            candidates: 0,
            sent: 0,
            skipped: 0,
            failed: 1,
            error: message,
          });
        } catch (recordError) {
          console.error("Retention automation run failure could not be recorded:", recordError);
        }
      }

      results.push({
        organizationId: settings.organization_id,
        status: "failed",
        failed: 1,
      });
    }
  }

  return NextResponse.json({
    ok: totalFailed === 0,
    dryRun,
    organizations: settingsRows.length,
    sent: totalSent,
    skipped: totalSkipped,
    failed: totalFailed,
    channel: "email",
    results,
  });
}
