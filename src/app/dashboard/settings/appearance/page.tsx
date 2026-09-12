import { Languages, Palette } from "lucide-react";
import ThemePreviewPicker from "@/components/theme-preview-picker";
import PageShell from "@/components/page-shell";
import { requireAdminForSettings } from "@/lib/page-guards";
import { getDictionary, localeLabels } from "@/lib/i18n";
import { updateOrganizationPreferencesAction } from "./actions";

const themes = [
  {
    value: "sand",
    name: "Sand",
    description: "Topla neutralna paleta za beauty i wellness salone.",
    swatches: ["#F3EEEA", "#776B5D", "#EBE3D5"],
  },
  {
    value: "rose",
    name: "Rose",
    description: "Nježna premium paleta s toplim ružičastim akcentima.",
    swatches: ["#FFF7F8", "#A85D72", "#F4E2E7"],
  },
  {
    value: "slate",
    name: "Slate",
    description: "Čist i moderan izgled s hladnijim neutralnim tonovima.",
    swatches: ["#F5F7FA", "#475569", "#E8EDF3"],
  },
] as const;

export default async function AppearanceSettingsPage() {
  const permissions = await requireAdminForSettings();
  const t = getDictionary(permissions.organizationLocale).settings.appearance;
  const localizedThemes = themes.map((theme) => ({
    ...theme,
    description:
      theme.value === "sand"
        ? t.sandDescription
        : theme.value === "rose"
          ? t.roseDescription
          : t.slateDescription,
  }));

  return (
    <PageShell maxWidth="max-w-5xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
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
                className="cursor-pointer rounded-2xl border border-app-soft bg-app-bg/50 p-4 transition hover:bg-app-bg"
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
