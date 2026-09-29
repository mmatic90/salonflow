import { createAdminClient } from "@/lib/supabase/admin";

export type PublicBookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  category: string | null;
};

type PublicTheme = "sand" | "rose" | "slate" | "sage" | "ocean" | "plum";

export type PublicBookingOrganization = {
  id: string;
  name: string;
  slug: string;
  locale: "hr" | "en" | "it";
  theme: PublicTheme;
  phone: string | null;
  email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  logo_url: string | null;
};

export type PublicSalonWorkingHour = {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

const publicThemes = new Set<PublicTheme>([
  "sand",
  "rose",
  "slate",
  "sage",
  "ocean",
  "plum",
]);

function resolvePublicTheme(value: string | null): PublicTheme {
  return value && publicThemes.has(value as PublicTheme)
    ? (value as PublicTheme)
    : "sand";
}

function isExpiredTrial(organization: {
  lifecycle_status: string | null;
  trial_ends_at: string | null;
}) {
  if (organization.lifecycle_status !== "trial") return false;
  if (!organization.trial_ends_at) return true;

  const trialEnd = new Date(organization.trial_ends_at).getTime();
  return !Number.isFinite(trialEnd) || trialEnd <= Date.now();
}

export async function getPublicBookingOrganizationBySlug(
  slug: string,
): Promise<PublicBookingOrganization | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, locale, theme, phone, email, address_line_1, address_line_2, city, postal_code, logo_url, lifecycle_status, trial_ends_at",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti salon.");
  }

  if (!data || isExpiredTrial(data)) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    locale: data.locale === "en" || data.locale === "it" ? data.locale : "hr",
    theme: resolvePublicTheme(data.theme),
    phone: data.phone,
    email: data.email,
    address_line_1: data.address_line_1,
    address_line_2: data.address_line_2,
    city: data.city,
    postal_code: data.postal_code,
    logo_url: data.logo_url,
  };
}

export async function getOnlineBookableServices(
  organizationId: string,
): Promise<PublicBookingService[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, currency, category")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .eq("is_online_bookable", true)
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti usluge za online rezervacije.");
  }

  return (data ?? []) as PublicBookingService[];
}

export async function getPublicSalonWorkingHours(
  organizationId: string,
): Promise<PublicSalonWorkingHour[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("salon_working_hours")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("organization_id", organizationId);

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti radno vrijeme salona.");
  }

  return (data ?? []) as PublicSalonWorkingHour[];
}
