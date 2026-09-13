import { Languages, Palette } from "lucide-react";
import ThemePreviewPicker from "@/components/theme-preview-picker";
import PageShell from "@/components/page-shell";
import { requireAdminForSettings } from "@/lib/page-guards";
import { getDictionary, localeLabels, type AppLocale } from "@/lib/i18n";
import type { OrganizationTheme } from "@/lib/permissions";
import { updateOrganizationPreferencesAction } from "./actions";

type ThemeOption = {
  value: OrganizationTheme;
  name: string;
  swatches: readonly string[];
};

const themes: readonly ThemeOption[] = [
  { value: "sand", name: "Sand", swatches: ["#F3EEEA", "#776B5D", "#EBE3D5"] },
  { value: "rose", name: "Rose", swatches: ["#FFF7F8", "#A85D72", "#F4E2E7"] },
  { value: "slate", name: "Slate", swatches: ["#F5F7FA", "#475569", "#E8EDF3"] },
  { value: "sage", name: "Sage", swatches: ["#F5F8F4", "#5F7D68", "#E6EEE6"] },
  { value: "ocean", name: "Ocean", swatches: ["#F3F8FA", "#39758A", "#E1EEF2"] },
  { value: "plum", name: "Plum", swatches: ["#FAF7FB", "#76577E", "#ECE3EF"] },
];

function themeDescription(theme: OrganizationTheme, locale: AppLocale) {
  const copy = {
    hr: {
      sand: "Topla neutralna paleta za beauty i wellness salone.",
      rose: "Nježna premium paleta s toplim ružičastim akcentima.",
      slate: "Čist i moderan izgled s hladnijim neutralnim tonovima.",
      sage: "Smirena zelena paleta inspirirana wellness i spa ambijentom.",
      ocean: "Svježa plavo-petrolejska paleta s modernim, čistim dojmom.",
      plum: "Elegantna ljubičasto-šljiva paleta za sofisticiraniji identitet.",
    },
    en: {
      sand: "A warm neutral palette for beauty and wellness salons.",
      rose: "A soft premium palette with warm rose accents.",
      slate: "A clean modern look with cooler neutral tones.",
      sage: "A calm green palette inspired by spa and wellness spaces.",
      ocean: "A fresh blue-teal palette with a clean modern feel.",
      plum: "An elegant plum palette for a more sophisticated identity.",
    },
    it: {
      sand: "Una palette neutra e calda per saloni beauty e wellness.",
      rose: "Una palette premium delicata con accenti rosa caldi.",
      slate: "Un look pulito e moderno con toni neutri più freddi.",
      sage: "Una palette verde rilassante ispirata agli ambienti spa e wellness.",
      ocean: "Una palette blu-petrolio fresca, pulita e moderna.",
      plum: "Una palette prugna elegante per un'identità più sofisticata.",
    },
  } as const;

  return copy[locale][theme];
}

export default async function AppearanceSettingsPage() {
  const permissions = await requireAdminForSettings();
  const t = getDictionary(permissions.organizationLocale).settings.appearance;
  const localizedThemes = themes.map((theme) => ({
    ...theme,
    description: themeDescription(theme.value, permissions.organizationLocale),
  }));

  return (
    <PageShell maxWidth="max-w-5xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="p-5 sm:p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-app-soft bg-white text-app-accent">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-app-muted">{t.personalization}</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-app-text">
                {t.title}
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">
            {t.intro}
          </p>
        </div>
      </section>

      <form action={updateOrganizationPreferencesAction} className="space-y-6">
        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-app-accent" />
            <div>
              <h2 className="text-xl font-bold text-app-text">{t.theme}</h2>
              <p className="mt-1 text-sm text-app-muted">
                {t.themeDescription}
              </p>
            </div>
          </div>

          <ThemePreviewPicker
            themes={localizedThemes}
            initialTheme={permissions.organizationTheme}
          />
        </section>

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-app-accent" />
            <div>
              <h2 className="text-xl font-bold text-app-text">{t.language}</h2>
              <p className="mt-1 text-sm text-app-muted">
                {t.languageDescription}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {(["hr", "en", "it"] as const).map((locale) => (
              <label
                key={locale}
                className="cursor-pointer rounded-2xl border border-app-soft bg-white p-4 transition hover:border-app-accent/40 hover:shadow-sm"
              >
                <input
                  type="radio"
                  name="locale"
                  value={locale}
                  defaultChecked={permissions.organizationLocale === locale}
                  className="mr-3"
                />
                <span className="font-semibold text-app-text">
                  {localeLabels[locale]}
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-app-accent px-6 py-3 font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {t.save}
          </button>
        </div>
      </form>
    </PageShell>
  );
}
