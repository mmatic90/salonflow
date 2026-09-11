import { Check, Languages, Palette } from "lucide-react";
import PageShell from "@/components/page-shell";
import { requireAdminForSettings } from "@/lib/page-guards";
import { localeLabels } from "@/lib/i18n";
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

  return (
    <PageShell maxWidth="max-w-5xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
        <div className="bg-gradient-to-br from-white via-white to-app-bg p-5 sm:p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-app-muted">Personalizacija</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-app-text">
                Izgled i jezik
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-app-muted sm:text-base">
            Odaberi vizualnu temu i glavni jezik za ovaj salon. Postavke se
            spremaju na razini organizacije i vrijede za sve korisnike salona.
          </p>
        </div>
      </section>

      <form action={updateOrganizationPreferencesAction} className="space-y-6">
        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Palette className="h-5 w-5 text-app-accent" />
            <div>
              <h2 className="text-xl font-bold text-app-text">Tema</h2>
              <p className="mt-1 text-sm text-app-muted">
                Odaberi osnovni vizualni stil aplikacije.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {themes.map((theme) => {
              const active = permissions.organizationTheme === theme.value;

              return (
                <label
                  key={theme.value}
                  className={\`relative cursor-pointer rounded-2xl border p-4 transition \${
                    active
                      ? "border-app-accent ring-2 ring-app-accent/15"
                      : "border-app-soft hover:bg-app-bg"
                  }\`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    defaultChecked={active}
                    className="sr-only"
                  />
                  {active ? (
                    <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-app-accent text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}

                  <div className="flex gap-2">
                    {theme.swatches.map((swatch) => (
                      <span
                        key={swatch}
                        className="h-8 w-8 rounded-full border border-black/5 shadow-sm"
                        style={{ backgroundColor: swatch }}
                      />
                    ))}
                  </div>
                  <h3 className="mt-4 font-bold text-app-text">{theme.name}</h3>
                  <p className="mt-1 text-sm leading-5 text-app-muted">
                    {theme.description}
                  </p>
                </label>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-app-accent" />
            <div>
              <h2 className="text-xl font-bold text-app-text">Jezik aplikacije</h2>
              <p className="mt-1 text-sm text-app-muted">
                Temelj za prijevod cijelog dashboarda i javnog booking sučelja.
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
            Spremi postavke
          </button>
        </div>
      </form>
    </PageShell>
  );
}
