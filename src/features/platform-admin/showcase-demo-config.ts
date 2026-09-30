export const SHOWCASE_DEMO_KEYS = ["hr", "it", "en"] as const;
export type ShowcaseDemoKey = (typeof SHOWCASE_DEMO_KEYS)[number];

export type ShowcaseDemoDefinition = {
  key: ShowcaseDemoKey;
  name: string;
  slug: string;
  locale: "hr" | "it" | "en";
  timezone: string;
  countryCode: string;
  city: string;
  label: string;
};

export const SHOWCASE_DEMOS: Record<ShowcaseDemoKey, ShowcaseDemoDefinition> = {
  hr: {
    key: "hr",
    name: "Studio Aurora",
    slug: "studio-aurora-demo",
    locale: "hr",
    timezone: "Europe/Zagreb",
    countryCode: "HR",
    city: "Rovinj",
    label: "Hrvatski demo",
  },
  it: {
    key: "it",
    name: "Bella Vita Studio",
    slug: "bella-vita-demo",
    locale: "it",
    timezone: "Europe/Rome",
    countryCode: "IT",
    city: "Trieste",
    label: "Demo italiano",
  },
  en: {
    key: "en",
    name: "Willow & Glow Studio",
    slug: "willow-glow-demo",
    locale: "en",
    timezone: "Europe/Dublin",
    countryCode: "IE",
    city: "Dublin",
    label: "English demo",
  },
};

export function isShowcaseDemoKey(value: unknown): value is ShowcaseDemoKey {
  return (
    typeof value === "string" &&
    SHOWCASE_DEMO_KEYS.includes(value as ShowcaseDemoKey)
  );
}
