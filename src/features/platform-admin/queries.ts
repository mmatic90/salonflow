import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  normalizeBillingProvider,
  type BillingProvider,
} from "@/lib/billing";
import type {
  SalonLifecycleStatus,
  SalonPlanCode,
} from "@/lib/plans";

export type PlatformSalon = {
  id: string;
  name: string;
  slug: string;
  locale: string;
  currency: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  countryCode: string;
  isActive: boolean;
  planCode: SalonPlanCode;
  lifecycleStatus: SalonLifecycleStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  planChangedAt: string;
  billingProvider: BillingProvider;
  billingEmail: string | null;
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerUserId: string | null;
  activeMembers: number;
  openFeedback: number;
};

export type PlatformOverview = {
  salons: PlatformSalon[];
  stats: {
    totalSalons: number;
    activeSalons: number;
    trialSalons: number;
    pastDueSalons: number;
    suspendedSalons: number;
    openFeedback: number;
    totalFeedback: number;
  };
};

export type PlatformSalonMember = {
  userId: string;
  displayName: string | null;
  email: string | null;
  role: string;
  isActive: boolean;
  joinedAt: string;
};

export type PlatformSalonDetail = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  currency: string;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  countryCode: string;
  logoUrl: string | null;
  isActive: boolean;
  planCode: SalonPlanCode;
  lifecycleStatus: SalonLifecycleStatus;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  planChangedAt: string;
  billingProvider: BillingProvider;
  billingEmail: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  billingCancelAtPeriodEnd: boolean;
  billingUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerUserId: string | null;
  members: PlatformSalonMember[];
  feedback: {
    total: number;
    open: number;
    resolved: number;
  };
};

function isOpenFeedbackStatus(status: string) {
  return status !== "done" && status !== "rejected";
}

function planCode(value: unknown): SalonPlanCode {
  return value === "starter" ? "starter" : "pro";
}

function lifecycleStatus(value: unknown): SalonLifecycleStatus {
  if (
    value === "trial" ||
    value === "past_due" ||
    value === "suspended"
  ) {
    return value;
  }
  return "active";
}

export async function getPlatformOverview(): Promise<PlatformOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  const [organizationsResult, membersResult, feedbackResult, usersResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, name, slug, locale, currency, phone, email, city, country_code, is_active, plan_code, lifecycle_status, trial_started_at, trial_ends_at, plan_changed_at, billing_provider, billing_email, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("organization_members")
        .select(
          "organization_id, user_id, role, display_name, is_active, joined_at",
        ),
      supabase.from("feedback").select("organization_id, status"),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (organizationsResult.error) throw new Error(organizationsResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (feedbackResult.error) throw new Error(feedbackResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);

  const usersById = new Map(
    usersResult.data.users.map((user) => [user.id, user.email ?? null]),
  );
  const members = membersResult.data ?? [];
  const feedback = feedbackResult.data ?? [];

  const salons: PlatformSalon[] = (organizationsResult.data ?? []).map(
    (organization) => {
      const organizationMembers = members.filter(
        (member) => member.organization_id === organization.id,
      );
      const owner = organizationMembers
        .filter((member) => member.role === "owner" && member.is_active)
        .sort((a, b) =>
          String(a.joined_at ?? "").localeCompare(String(b.joined_at ?? "")),
        )[0];
      const organizationFeedback = feedback.filter(
        (item) => item.organization_id === organization.id,
      );

      return {
        id: String(organization.id),
        name: String(organization.name),
        slug: String(organization.slug),
        locale: String(organization.locale ?? "hr"),
        currency: String(organization.currency ?? "EUR"),
        phone: organization.phone ?? null,
        email: organization.email ?? null,
        city: organization.city ?? null,
        countryCode: String(organization.country_code ?? "HR"),
        isActive: organization.is_active !== false,
        planCode: planCode(organization.plan_code),
        lifecycleStatus: lifecycleStatus(organization.lifecycle_status),
        trialStartedAt: organization.trial_started_at ?? null,
        trialEndsAt: organization.trial_ends_at ?? null,
        planChangedAt: String(organization.plan_changed_at ?? organization.created_at),
        billingProvider: normalizeBillingProvider(organization.billing_provider),
        billingEmail: organization.billing_email ?? null,
        createdAt: String(organization.created_at),
        ownerName: owner?.display_name ?? null,
        ownerEmail: owner ? usersById.get(owner.user_id) ?? null : null,
        ownerUserId: owner?.user_id ?? null,
        activeMembers: organizationMembers.filter((member) => member.is_active)
          .length,
        openFeedback: organizationFeedback.filter((item) =>
          isOpenFeedbackStatus(String(item.status)),
        ).length,
      };
    },
  );

  return {
    salons,
    stats: {
      totalSalons: salons.length,
      activeSalons: salons.filter(
        (salon) => salon.lifecycleStatus === "active",
      ).length,
      trialSalons: salons.filter((salon) => salon.lifecycleStatus === "trial")
        .length,
      pastDueSalons: salons.filter(
        (salon) => salon.lifecycleStatus === "past_due",
      ).length,
      suspendedSalons: salons.filter(
        (salon) => salon.lifecycleStatus === "suspended",
      ).length,
      openFeedback: feedback.filter((item) =>
        isOpenFeedbackStatus(String(item.status)),
      ).length,
      totalFeedback: feedback.length,
    },
  };
}

export async function getPlatformSalonById(
  organizationId: string,
): Promise<PlatformSalonDetail | null> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  const [organizationResult, membersResult, feedbackResult, usersResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, name, slug, timezone, locale, currency, phone, email, address_line_1, address_line_2, city, postal_code, country_code, logo_url, is_active, plan_code, lifecycle_status, trial_started_at, trial_ends_at, plan_changed_at, billing_provider, billing_email, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_period_start, billing_period_end, billing_cancel_at_period_end, billing_updated_at, created_at, updated_at",
        )
        .eq("id", organizationId)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("user_id, role, display_name, is_active, joined_at")
        .eq("organization_id", organizationId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("feedback")
        .select("status")
        .eq("organization_id", organizationId),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  if (organizationResult.error) throw new Error(organizationResult.error.message);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (feedbackResult.error) throw new Error(feedbackResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);
  if (!organizationResult.data) return null;

  const organization = organizationResult.data;
  const usersById = new Map(
    usersResult.data.users.map((user) => [user.id, user.email ?? null]),
  );
  const members: PlatformSalonMember[] = (membersResult.data ?? []).map(
    (member) => ({
      userId: String(member.user_id),
      displayName: member.display_name ?? null,
      email: usersById.get(member.user_id) ?? null,
      role: String(member.role),
      isActive: member.is_active !== false,
      joinedAt: String(member.joined_at),
    }),
  );
  const owner = members.find(
    (member) => member.role === "owner" && member.isActive,
  );
  const feedback = feedbackResult.data ?? [];
  const openFeedback = feedback.filter((item) =>
    isOpenFeedbackStatus(String(item.status)),
  ).length;

  return {
    id: String(organization.id),
    name: String(organization.name),
    slug: String(organization.slug),
    timezone: String(organization.timezone ?? "Europe/Zagreb"),
    locale: String(organization.locale ?? "hr"),
    currency: String(organization.currency ?? "EUR"),
    phone: organization.phone ?? null,
    email: organization.email ?? null,
    addressLine1: organization.address_line_1 ?? null,
    addressLine2: organization.address_line_2 ?? null,
    city: organization.city ?? null,
    postalCode: organization.postal_code ?? null,
    countryCode: String(organization.country_code ?? "HR"),
    logoUrl: organization.logo_url ?? null,
    isActive: organization.is_active !== false,
    planCode: planCode(organization.plan_code),
    lifecycleStatus: lifecycleStatus(organization.lifecycle_status),
    trialStartedAt: organization.trial_started_at ?? null,
    trialEndsAt: organization.trial_ends_at ?? null,
    planChangedAt: String(organization.plan_changed_at ?? organization.created_at),
    billingProvider: normalizeBillingProvider(organization.billing_provider),
    billingEmail: organization.billing_email ?? null,
    stripeCustomerId: organization.stripe_customer_id ?? null,
    stripeSubscriptionId: organization.stripe_subscription_id ?? null,
    stripePriceId: organization.stripe_price_id ?? null,
    billingPeriodStart: organization.billing_period_start ?? null,
    billingPeriodEnd: organization.billing_period_end ?? null,
    billingCancelAtPeriodEnd: organization.billing_cancel_at_period_end === true,
    billingUpdatedAt: String(
      organization.billing_updated_at ?? organization.updated_at ?? organization.created_at,
    ),
    createdAt: String(organization.created_at),
    updatedAt: String(organization.updated_at),
    ownerName: owner?.displayName ?? null,
    ownerEmail: owner?.email ?? null,
    ownerUserId: owner?.userId ?? null,
    members,
    feedback: {
      total: feedback.length,
      open: openFeedback,
      resolved: feedback.length - openFeedback,
    },
  };
}
