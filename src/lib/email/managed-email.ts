import { createManagedEmailProvider } from "@/lib/email/provider";
import {
  organizationHasCapability,
  type SalonCapabilityCode,
} from "@/lib/entitlements";
import {
  normalizeSalonLifecycleStatus,
  normalizeSalonPlanCode,
} from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";

type ManagedEmailArgs = {
  organizationId: string;
  capability: SalonCapabilityCode;
  to: string;
  subject: string;
  html: string;
  displayName?: string | null;
};

type ReservationRow = {
  allowed: boolean;
  reason: string;
  organization_attempted: number;
  global_attempted: number;
};

type EmailSettingsRow = {
  from_name: string | null;
  reply_to_email: string | null;
};

export class ManagedEmailError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ManagedEmailError";
    this.code = code;
  }
}

function positiveIntegerEnv(name: string, developmentFallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      throw new ManagedEmailError(
        "EMAIL_LIMIT_NOT_CONFIGURED",
        `${name} must be configured in production.`,
      );
    }
    return developmentFallback;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ManagedEmailError(
      "EMAIL_LIMIT_INVALID",
      `${name} must be a positive integer.`,
    );
  }

  return parsed;
}

export function getManagedEmailDefaultMonthlyLimit() {
  return positiveIntegerEnv("SALONFLOW_MANAGED_EMAIL_MONTHLY_LIMIT", 100);
}

export function getManagedEmailGlobalMonthlyLimit() {
  return positiveIntegerEnv("SALONFLOW_MANAGED_EMAIL_GLOBAL_MONTHLY_LIMIT", 500);
}

function managedFromAddress() {
  const explicit = process.env.SALONFLOW_EMAIL_FROM_ADDRESS?.trim();
  if (explicit) return explicit;

  const legacy = process.env.RESEND_FROM_EMAIL?.trim();
  if (legacy) {
    const match = legacy.match(/<([^<>]+)>/);
    return match?.[1]?.trim() || legacy;
  }

  return "onboarding@resend.dev";
}

function sanitizeDisplayName(value: string | null | undefined) {
  return (value?.trim() || "SalonFlow")
    .replace(/[\r\n<>]/g, "")
    .replace(/"/g, "'")
    .slice(0, 120);
}

async function recordResult(organizationId: string, success: boolean) {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.rpc("record_managed_email_result", {
      p_organization_id: organizationId,
      p_success: success,
    });

    if (error) {
      console.error("Managed email usage result could not be recorded:", error.message);
    }
  } catch (error) {
    console.error("Managed email usage result recording failed:", error);
  }
}

export async function sendManagedTenantEmail(args: ManagedEmailArgs) {
  const supabase = createAdminClient();

  const [
    { data: organization, error: organizationError },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select(
        "id, name, email, plan_code, lifecycle_status, trial_ends_at, is_active",
      )
      .eq("id", args.organizationId)
      .maybeSingle(),
    supabase
      .from("organization_email_settings")
      .select("from_name, reply_to_email")
      .eq("organization_id", args.organizationId)
      .maybeSingle(),
  ]);

  if (organizationError || !organization) {
    throw new ManagedEmailError(
      "EMAIL_ORGANIZATION_NOT_FOUND",
      organizationError?.message || "Organization not found for email delivery.",
    );
  }

  if (settingsError) {
    throw new ManagedEmailError("EMAIL_SETTINGS_LOAD_FAILED", settingsError.message);
  }

  const lifecycleStatus = normalizeSalonLifecycleStatus(
    organization.lifecycle_status,
  );
  const planCode = normalizeSalonPlanCode(organization.plan_code);

  if (
    organization.is_active === false ||
    lifecycleStatus === "suspended" ||
    !organizationHasCapability(
      planCode,
      lifecycleStatus,
      args.capability,
      organization.trial_ends_at ?? null,
    )
  ) {
    throw new ManagedEmailError(
      "EMAIL_PLAN_NOT_ELIGIBLE",
      `Organization is not eligible for ${args.capability} email delivery.`,
    );
  }

  const organizationLimit = getManagedEmailDefaultMonthlyLimit();
  const globalLimit = getManagedEmailGlobalMonthlyLimit();

  const { data: reservationData, error: reservationError } = await supabase.rpc(
    "reserve_managed_email_send",
    {
      p_organization_id: args.organizationId,
      p_default_organization_limit: organizationLimit,
      p_global_limit: globalLimit,
    },
  );

  if (reservationError) {
    throw new ManagedEmailError(
      "EMAIL_QUOTA_RESERVATION_FAILED",
      reservationError.message,
    );
  }

  const reservation = (reservationData?.[0] ?? null) as ReservationRow | null;
  if (!reservation?.allowed) {
    const code =
      reservation?.reason === "organization_limit"
        ? "EMAIL_ORGANIZATION_LIMIT_REACHED"
        : reservation?.reason === "global_limit"
          ? "EMAIL_GLOBAL_LIMIT_REACHED"
          : reservation?.reason === "disabled"
            ? "EMAIL_DISABLED"
            : reservation?.reason === "custom_provider_not_configured"
              ? "EMAIL_CUSTOM_PROVIDER_NOT_CONFIGURED"
              : "EMAIL_QUOTA_NOT_AVAILABLE";

    throw new ManagedEmailError(
      code,
      `Managed email delivery is not available (${reservation?.reason || "unknown"}).`,
    );
  }

  const emailSettings = settings as EmailSettingsRow | null;
  const fromName = sanitizeDisplayName(
    emailSettings?.from_name || args.displayName || organization.name,
  );
  const from = `${fromName} <${managedFromAddress()}>`;
  const replyTo =
    emailSettings?.reply_to_email?.trim() ||
    organization.email?.trim() ||
    process.env.SALONFLOW_EMAIL_DEFAULT_REPLY_TO?.trim() ||
    process.env.RESEND_REPLY_TO?.trim() ||
    undefined;

  try {
    const result = await createManagedEmailProvider().send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      replyTo,
    });
    await recordResult(args.organizationId, true);
    return result;
  } catch (error) {
    await recordResult(args.organizationId, false);
    throw error;
  }
}
