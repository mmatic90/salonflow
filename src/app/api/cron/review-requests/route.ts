import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ManagedEmailError } from "@/lib/email/managed-email";
import { sendGoogleReviewRequestEmail } from "@/lib/email/review-request-email";
import {
  getEffectiveEntitlementPlan,
  planHasCapability,
} from "@/lib/entitlements";
import {
  normalizeSalonLifecycleStatus,
  normalizeSalonPlanCode,
} from "@/lib/plans";

type AppLocale = "hr" | "en" | "it";

type AppointmentRow = {
  id: string;
  organization_id: string;
  client_name: string;
  client_email: string | null;
  appointment_date: string;
  end_time: string;
  status: string;
  review_request_sent_at: string | null;
  review_request_attempt_count: number | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  locale: string | null;
  timezone: string | null;
  phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  country_code: string | null;
  logo_url: string | null;
  plan_code: string | null;
  lifecycle_status: string | null;
  is_active: boolean | null;
};

type ReviewSettingsRow = {
  organization_id: string;
  enabled: boolean;
  google_review_url: string | null;
  delay_hours: number;
  enabled_at: string | null;
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

function organizationCanUseReviewRequests(organization: OrganizationRow) {
  if (organization.is_active === false) return false;

  const lifecycleStatus = normalizeSalonLifecycleStatus(
    organization.lifecycle_status,
  );
  if (lifecycleStatus === "suspended") return false;

  const effectivePlan = getEffectiveEntitlementPlan(
    normalizeSalonPlanCode(organization.plan_code),
    lifecycleStatus,
  );

  return planHasCapability(effectivePlan, "review_requests");
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

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return asUtc - date.getTime();
}

function zonedDateTimeToUtc(
  date: string,
  time: string,
  requestedTimeZone: string | null,
) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const timeZone = safeTimeZone(requestedTimeZone);
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const initial = new Date(wallClockUtc);
  const firstOffset = getTimeZoneOffsetMilliseconds(initial, timeZone);
  let result = new Date(wallClockUtc - firstOffset);
  const resolvedOffset = getTimeZoneOffsetMilliseconds(result, timeZone);

  if (resolvedOffset !== firstOffset) {
    result = new Date(wallClockUtc - resolvedOffset);
  }

  return result;
}

function getSalonAddress(organization: OrganizationRow) {
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

function isDue(
  appointment: AppointmentRow,
  organization: OrganizationRow,
  settings: ReviewSettingsRow,
) {
  if (!settings.enabled_at) return false;

  const appointmentEnd = zonedDateTimeToUtc(
    appointment.appointment_date,
    appointment.end_time,
    organization.timezone,
  );
  const enabledAt = new Date(settings.enabled_at);

  if (appointmentEnd.getTime() < enabledAt.getTime()) return false;

  const dueAt =
    appointmentEnd.getTime() + settings.delay_hours * 60 * 60 * 1000;
  return Date.now() >= dueAt;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const minCandidateDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const maxCandidateDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, organization_id, client_name, client_email, appointment_date, end_time, status, review_request_sent_at, review_request_attempt_count",
    )
    .eq("status", "completed")
    .not("client_email", "is", null)
    .is("review_request_sent_at", null)
    .lt("review_request_attempt_count", 3)
    .gte("appointment_date", minCandidateDate)
    .lte("appointment_date", maxCandidateDate);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appointments = (data ?? []) as AppointmentRow[];
  const organizationIds = [
    ...new Set(appointments.map((appointment) => appointment.organization_id)),
  ];

  if (organizationIds.length === 0) {
    return NextResponse.json({
      ok: true,
      checked: 0,
      eligible: 0,
      due: 0,
      sent: 0,
      failed: 0,
      deferred: 0,
      results: [],
    });
  }

  const [organizationsResult, settingsResult] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, locale, timezone, phone, address_line_1, address_line_2, city, postal_code, country_code, logo_url, plan_code, lifecycle_status, is_active",
      )
      .in("id", organizationIds),
    supabase
      .from("organization_review_settings")
      .select(
        "organization_id, enabled, google_review_url, delay_hours, enabled_at",
      )
      .in("organization_id", organizationIds),
  ]);

  if (organizationsResult.error) {
    return NextResponse.json(
      { error: organizationsResult.error.message },
      { status: 500 },
    );
  }
  if (settingsResult.error) {
    return NextResponse.json(
      { error: settingsResult.error.message },
      { status: 500 },
    );
  }

  const organizationsById = new Map(
    ((organizationsResult.data ?? []) as OrganizationRow[]).map((organization) => [
      organization.id,
      organization,
    ]),
  );
  const settingsByOrganizationId = new Map(
    ((settingsResult.data ?? []) as ReviewSettingsRow[]).map((settings) => [
      settings.organization_id,
      settings,
    ]),
  );

  const results: Array<{ id: string; status: string }> = [];
  let eligibleCount = 0;
  let dueCount = 0;
  let sentCount = 0;
  let failedCount = 0;
  let deferredCount = 0;

  for (const appointment of appointments) {
    const organization = organizationsById.get(appointment.organization_id);
    if (!organization) {
      results.push({ id: appointment.id, status: "organization_missing" });
      continue;
    }

    if (!organizationCanUseReviewRequests(organization)) {
      results.push({ id: appointment.id, status: "plan_not_eligible" });
      continue;
    }

    const settings = settingsByOrganizationId.get(appointment.organization_id);
    if (
      !settings?.enabled ||
      !settings.google_review_url ||
      !settings.enabled_at
    ) {
      results.push({ id: appointment.id, status: "automation_disabled" });
      continue;
    }
    eligibleCount += 1;

    if (!isDue(appointment, organization, settings)) continue;
    dueCount += 1;

    const { data: claimed, error: claimError } = await supabase.rpc(
      "claim_appointment_review_request",
      {
        p_appointment_id: appointment.id,
        p_organization_id: appointment.organization_id,
      },
    );

    if (claimError) {
      results.push({ id: appointment.id, status: "claim_failed" });
      continue;
    }
    if (claimed !== true) {
      results.push({ id: appointment.id, status: "claim_not_available" });
      continue;
    }

    try {
      await sendGoogleReviewRequestEmail({
        organizationId: appointment.organization_id,
        salonName: organization.name,
        salonPhone: organization.phone,
        salonAddress: getSalonAddress(organization),
        salonLogoUrl: organization.logo_url,
        to: appointment.client_email!,
        clientName: appointment.client_name,
        reviewUrl: settings.google_review_url,
        lang: normalizeLocale(organization.locale),
      });

      await supabase
        .from("appointments")
        .update({
          review_request_sent_at: new Date().toISOString(),
          review_request_error: null,
          review_request_claimed_at: null,
        })
        .eq("id", appointment.id)
        .eq("organization_id", appointment.organization_id);

      sentCount += 1;
      results.push({ id: appointment.id, status: "sent" });
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Unknown error";
      const deferred = sendError instanceof ManagedEmailError;

      await supabase
        .from("appointments")
        .update({
          review_request_error: message.slice(0, 2000),
          review_request_claimed_at: null,
          ...(deferred
            ? {
                review_request_attempt_count:
                  appointment.review_request_attempt_count ?? 0,
              }
            : {}),
        })
        .eq("id", appointment.id)
        .eq("organization_id", appointment.organization_id);

      if (deferred) {
        deferredCount += 1;
        results.push({ id: appointment.id, status: "deferred" });
      } else {
        failedCount += 1;
        results.push({ id: appointment.id, status: "failed" });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: appointments.length,
    eligible: eligibleCount,
    due: dueCount,
    sent: sentCount,
    failed: failedCount,
    deferred: deferredCount,
    channel: "email",
    results,
  });
}
