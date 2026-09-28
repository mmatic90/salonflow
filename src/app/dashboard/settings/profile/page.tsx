import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireAdminForSettings } from "@/lib/page-guards";
import { createClient } from "@/lib/supabase/server";
import { updateSalonProfileAction } from "./actions";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      back: "Back to settings",
      eyebrow: "Salon profile",
      title: "Salon details",
      description:
        "Keep the contact and address information used across SalonFlow and the public booking page up to date.",
      name: "Salon name",
      email: "Salon email",
      phone: "Phone",
      address1: "Address",
      address2: "Address line 2",
      postal: "Postal code",
      city: "City",
      save: "Save salon profile",
    };
  }
  if (locale === "it") {
    return {
      back: "Torna alle impostazioni",
      eyebrow: "Profilo del salone",
      title: "Dati del salone",
      description:
        "Mantieni aggiornati i contatti e l'indirizzo usati in SalonFlow e nella pagina pubblica di prenotazione.",
      name: "Nome del salone",
      email: "Email del salone",
      phone: "Telefono",
      address1: "Indirizzo",
      address2: "Seconda riga indirizzo",
      postal: "CAP",
      city: "Città",
      save: "Salva profilo salone",
    };
  }
  return {
    back: "Natrag na postavke",
    eyebrow: "Profil salona",
    title: "Podaci salona",
    description:
      "Održavaj kontaktne podatke i adresu koji se koriste u SalonFlowu i na javnoj booking stranici.",
    name: "Naziv salona",
    email: "Email salona",
    phone: "Telefon",
    address1: "Adresa",
    address2: "Dodatak adresi",
    postal: "Poštanski broj",
    city: "Grad",
    save: "Spremi profil salona",
  };
}

const fieldClass =
  "mt-2 w-full rounded-xl border border-app-soft bg-white px-3 py-3 text-sm text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/10";

export default async function SalonProfileSettingsPage() {
  const permissions = await requireAdminForSettings();
  const supabase = await createClient();
  const { data: organization, error } = await supabase
    .from("organizations")
    .select(
      "name, email, phone, address_line_1, address_line_2, postal_code, city, timezone, currency",
    )
    .eq("id", permissions.organizationId)
    .maybeSingle();

  if (error || !organization) {
    throw new Error(error?.message || "Salon nije pronađen.");
  }

  const t = copy(permissions.organizationLocale);

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>

        <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-accent">
                {t.eyebrow}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-app-text">
                {t.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-app-muted">
                {t.description}
              </p>
            </div>
          </div>
        </section>

        <form
          action={updateSalonProfileAction}
          className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-semibold text-app-text">
              {t.name}
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={organization.name ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-app-text">
              {t.email}
              <input
                name="email"
                type="email"
                defaultValue={organization.email ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-app-text">
              {t.phone}
              <input
                name="phone"
                defaultValue={organization.phone ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="sm:col-span-2 text-sm font-semibold text-app-text">
              {t.address1}
              <input
                name="address_line_1"
                defaultValue={organization.address_line_1 ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="sm:col-span-2 text-sm font-semibold text-app-text">
              {t.address2}
              <input
                name="address_line_2"
                defaultValue={organization.address_line_2 ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-app-text">
              {t.postal}
              <input
                name="postal_code"
                defaultValue={organization.postal_code ?? ""}
                className={fieldClass}
              />
            </label>
            <label className="text-sm font-semibold text-app-text">
              {t.city}
              <input
                name="city"
                defaultValue={organization.city ?? ""}
                className={fieldClass}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-app-bg px-4 py-3 text-sm text-app-muted">
              <span className="font-semibold text-app-text">Timezone:</span>{" "}
              {organization.timezone}
            </div>
            <div className="rounded-2xl bg-app-bg px-4 py-3 text-sm text-app-muted">
              <span className="font-semibold text-app-text">Currency:</span>{" "}
              {organization.currency}
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto"
          >
            {t.save}
          </button>
        </form>
      </div>
    </main>
  );
}
