import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendAppointmentReminderEmail } from "@/lib/email/booking-email";
import {
  getEffectiveEntitlementPlan,
  planHasCapability,
} from "@/lib/entitlements";
import {
  normalizeSalonLifecycleStatus,
  normalizeSalonPlanCode,
} from "@/lib/plans";

type AppLocale = "hr" | "en" | "it";

type AppointmentServiceRow = {
  service_name: string | null;
  sort_order: number | null;
};

type AppointmentRow = {
  id: string;
  organization_id: string;
  client_name: string;
  client_email: string | null;
  appointment_date: string;
  start_time: string;
  status: string;
  email_reminder_24h_sent_at: string | null;
  appointment_services?: AppointmentServiceRow[] | null;
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

function isAuthorized(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  return request.headers.get("authorization") === `Bearer ${expectedSecret}`;
}

function normalizeLocale(value: string | null | undefined): AppLocale {
  if (value === "en" || value === "it") return value;
  return "hr";
}

function organizationCanUseReminders(organization: OrganizationRow) {
  if (organization.is_active === false) return false;

  const lifecycleStatus = normalizeSalonLifecycleStatus(
    organization.lifecycle_status,
  );
  if (lifecycleStatus === "suspended") return false;

  const effectivePlan = getEffectiveEntitlementPlan(
    normalizeSalonPlanCode(organization.plan_code),
    lifecycleStatus,
  );

  return planHasCapability(effectivePlan, "appointment_reminders");
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
  startTime: string,
  requestedTimeZone: string | null,
) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = startTime.slice(0, 5).split(":").map(Number);
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

function isReminderDue(appointment: AppointmentRow, organization: OrganizationRow) {
  const appointmentStart = zonedDateTimeToUtc(
    appointment.appointment_date,
    appointment.start_time,
    organization.timezone,
  );
  const now = Date.now();
  const windowStart = now + 23.5 * 60 * 60 * 1000;
  const windowEnd = now + 24.5 * 60 * 60 * 1000;

  return (
    appointmentStart.getTime() >= windowStart &&
    appointmentStart.getTime() <= windowEnd
  );
}

function formatReminderDate(date: string, locale: AppLocale) {
  const localeCode =
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";

  return new Intl.DateTimeFormat(localeCode, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

function getServiceName(appointment: AppointmentRow) {
  const names = (appointment.appointment_services ?? [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((item) => item.service_name?.trim())
    .filter((name): name is string => Boolean(name));

  return names.length ? names.join(", ") : null;
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

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const minCandidateDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const maxCandidateDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await supabase
    .from("appointments")
    .select(
      `
      id,
      organization_id,
      client_name,
      client_email,
      appointment_date,
      start_time,
      status,
      email_reminder_24h_sent_at,
      appointment_services (
        service_name,
        sort_order
      )
    `,
    )
    .in("status", ["scheduled", "confirmed"])
    .not("client_email", "is", null)
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
      results: [],
    });
  }

  const { data: organizations, error: organizationsError } = await supabase
    .from("organizations")
    .select(
      "id, name, locale, timezone, phone, address_line_1, address_line_2, city, postal_code, country_code, logo_url, plan_code, lifecycle_status, is_active",
    )
    .in("id", organizationIds);

  if (organizationsError) {
    return NextResponse.json(
      { error: organizationsError.message },
      { status: 500 },
    );
  }

  const organizationsById = new Map(
    ((organizations ?? []) as OrganizationRow[]).map((organization) => [
      organization.id,
      organization,
    ]),
  );
  const results: Array<{ id: string; status: string }> = [];
  let eligibleCount = 0;
  let dueCount = 0;
  let sentCount = 0;

  for (const appointment of appointments) {
    const organization = organizationsById.get(appointment.organization_id);
    if (!organization) {
      results.push({ id: appointment.id, status: "organization_missing" });
      continue;
    }

    if (!organizationCanUseReminders(organization)) {
      results.push({ id: appointment.id, status: "plan_not_eligible" });
      continue;
    }
    eligibleCount += 1;

    if (!isReminderDue(appointment, organization)) continue;
    dueCount += 1;

    if (appointment.email_reminder_24h_sent_at) {
      results.push({ id: appointment.id, status: "already_sent" });
      continue;
    }

    if (!appointment.client_email) {
      results.push({ id: appointment.id, status: "no_email" });
      continue;
    }

    const locale = normalizeLocale(organization.locale);
    const serviceName = getServiceName(appointment);
    const formattedDate = formatReminderDate(appointment.appointment_date, locale);
    const formattedTime = appointment.start_time.slice(0, 5);

    try {
      await sendAppointmentReminderEmail({
        salonName: organization.name,
        salonPhone: organization.phone,
        salonAddress: getSalonAddress(organization),
        salonLogoUrl: organization.logo_url,
        to: appointment.client_email,
        clientName: appointment.client_name,
        date: formattedDate,
        time: formattedTime,
        serviceName,
        lang: locale,
      });

      await supabase
        .from("appointments")
        .update({
          email_reminder_24h_sent_at: new Date().toISOString(),
          email_reminder_24h_error: null,
        })
        .eq("id", appointment.id)
        .eq("organization_id", appointment.organization_id);

      sentCount += 1;
      results.push({ id: appointment.id, status: "sent" });
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Unknown error";

      await supabase
        .from("appointments")
        .update({ email_reminder_24h_error: message })
        .eq("id", appointment.id)
        .eq("organization_id", appointment.organization_id);

      results.push({ id: appointment.id, status: "failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    checked: appointments.length,
    eligible: eligibleCount,
    due: dueCount,
    sent: sentCount,
    channel: "email",
    results,
  });
}
