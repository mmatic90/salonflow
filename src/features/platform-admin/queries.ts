import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/platform-admin";

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
    inactiveSalons: number;
    openFeedback: number;
    totalFeedback: number;
  };
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  const [organizationsResult, membersResult, feedbackResult, usersResult] =
    await Promise.all([
      supabase
        .from("organizations")
        .select(
          "id, name, slug, locale, currency, phone, email, city, country_code, is_active, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("organization_members")
        .select(
          "organization_id, user_id, role, display_name, is_active, joined_at",
        ),
      supabase
        .from("feedback")
        .select("organization_id, status"),
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
        createdAt: String(organization.created_at),
        ownerName: owner?.display_name ?? null,
        ownerEmail: owner ? usersById.get(owner.user_id) ?? null : null,
        ownerUserId: owner?.user_id ?? null,
        activeMembers: organizationMembers.filter((member) => member.is_active)
          .length,
        openFeedback: organizationFeedback.filter(
          (item) => item.status !== "done" && item.status !== "rejected",
        ).length,
      };
    },
  );

  return {
    salons,
    stats: {
      totalSalons: salons.length,
      activeSalons: salons.filter((salon) => salon.isActive).length,
      inactiveSalons: salons.filter((salon) => !salon.isActive).length,
      openFeedback: feedback.filter(
        (item) => item.status !== "done" && item.status !== "rejected",
      ).length,
      totalFeedback: feedback.length,
    },
  };
}
