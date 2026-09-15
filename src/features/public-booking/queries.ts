import { createClient } from "@/lib/supabase/server";

export type PublicBookingService = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  category: string | null;
};

export type PublicBookingOrganization = {
  id: string;
  name: string;
  slug: string;
  locale: "hr" | "en" | "it";
  theme: "sand" | "rose" | "slate";
  phone: string | null;
  email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postal_code: string | null;
  logo_url: string | null;
};

export async function getPublicBookingOrganizationBySlug(
  slug: string,
): Promise<PublicBookingOrganization | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      "id, name, slug, locale, theme, phone, email, address_line_1, address_line_2, city, postal_code, logo_url",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti salon.");
  }

  if (!data) return null;

  return {
    ...data,
    locale: data.locale === "en" || data.locale === "it" ? data.locale : "hr",
    theme: data.theme === "rose" || data.theme === "slate" ? data.theme : "sand",
  } as PublicBookingOrganization;
}

export async function getOnlineBookableServices(
  organizationId: string,
): Promise<PublicBookingService[]> {
  const supabase = await createClient();

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
