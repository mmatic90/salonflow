import { requirePlatformAdmin } from "@/lib/platform-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SHOWCASE_DEMOS,
  SHOWCASE_DEMO_KEYS,
  type ShowcaseDemoKey,
} from "@/features/platform-admin/showcase-demo-config";

export type ShowcaseDemoStatus = {
  key: ShowcaseDemoKey;
  name: string;
  slug: string;
  label: string;
  locale: "hr" | "it" | "en";
  city: string;
  organizationId: string | null;
  exists: boolean;
  lastRefreshedAt: string | null;
};

export async function getShowcaseDemoStatuses(): Promise<ShowcaseDemoStatus[]> {
  await requirePlatformAdmin();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("showcase_demo_organizations")
    .select("organization_id, demo_key, locale, last_refreshed_at");
  if (error) throw new Error(error.message);

  const rows = new Map(
    (data ?? []).map((row) => [String(row.demo_key), row] as const),
  );

  return SHOWCASE_DEMO_KEYS.map((key) => {
    const definition = SHOWCASE_DEMOS[key];
    const row = rows.get(key);
    return {
      key,
      name: definition.name,
      slug: definition.slug,
      label: definition.label,
      locale: definition.locale,
      city: definition.city,
      organizationId: row?.organization_id ? String(row.organization_id) : null,
      exists: Boolean(row?.organization_id),
      lastRefreshedAt: row?.last_refreshed_at ?? null,
    };
  });
}
