import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarCheck,
  Clock,
  Languages,
  Mail,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import CookieConsent from "@/components/cookie-consent";
import FloatingWhatsAppButton from "@/components/floating-whatsapp-button";
import PublicFooter from "@/components/public-footer";
import {
  getOnlineBookableServices,
  getPublicBookingOrganizationBySlug,
} from "@/features/public-booking/queries";
import { createClient } from "@/lib/supabase/server";

type Lang = "hr" | "en" | "it";

function getLang(value: string | string[] | undefined, fallback: Lang): Lang {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "hr" || raw === "en" || raw === "it" ? raw : fallback;
}

function formatAddress(org: {
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  city: string | null;
}) {
  return [
    org.address_line_1,
    org.address_line_2,
    [org.postal_code, org.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
}

function formatWorkingHours(
  rows: Array<{
    day_of_week: number;
    opens_at: string | null;
    closes_at: string | null;
    is_closed: boolean;
  }>,
  lang: Lang,
) {
  const labels = {
    hr: ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"],
    en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    it: ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"],
  }[lang];

  const open = rows
    .filter((row) => !row.is_closed && row.opens_at && row.closes_at)
    .sort((a, b) => a.day_of_week - b.day_of_week);

  if (!open.length) {
    return lang === "en"
      ? "Working hours by appointment"
      : lang === "it"
        ? "Orari su appuntamento"
        : "Radno vrijeme prema narudžbi";
  }

  return open
    .map(
      (row) =>
        labels[row.day_of_week] +
        " " +
        String(row.opens_at).slice(0, 5) +
        "–" +
        String(row.closes_at).slice(0, 5),
    )
    .join(" · ");
}

function formatPrice(price: number | null, currency: string, lang: Lang) {
  if (price == null) return null;
  const locale = lang === "it" ? "it-IT" : lang === "en" ? "en-GB" : "hr-HR";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "EUR",
  }).format(price);
}

const copy = {
  hr: {
    badge: "Salon i online rezervacije",
    heroTitle: "Njega i termini na jednom mjestu.",
    heroText:
      "Pregledaj usluge salona i pošalji zahtjev za termin online, brzo i jednostavno.",
    services: "Usluge dostupne online",
    servicesText:
      "Ovdje su prikazane usluge koje salon trenutno nudi za online rezervaciju.",
    contact: "Kontakt i radno vrijeme",
    book: "Rezerviraj termin",
    noServices: "Trenutno nema usluga dostupnih za online rezervaciju.",
    duration: "min",
  },
  en: {
    badge: "Salon and online booking",
    heroTitle: "Care and appointments in one place.",
    heroText:
      "Browse the salon services and send an appointment request online quickly and easily.",
    services: "Services available online",
    servicesText:
      "These are the services currently available for online booking.",
    contact: "Contact and working hours",
    book: "Book appointment",
    noServices: "There are currently no services available for online booking.",
    duration: "min",
  },
  it: {
    badge: "Salone e prenotazioni online",
    heroTitle: "Cura e appuntamenti in un unico posto.",
    heroText:
      "Scopri i servizi del salone e invia una richiesta di appuntamento online in modo semplice e veloce.",
    services: "Servizi disponibili online",
    servicesText:
      "Qui trovi i servizi attualmente disponibili per la prenotazione online.",
    contact: "Contatti e orari",
    book: "Prenota appuntamento",
    noServices:
      "Al momento non ci sono servizi disponibili per la prenotazione online.",
    duration: "min",
  },
} as const;

export default async function SalonPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ lang?: string | string[] }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const organization = await getPublicBookingOrganizationBySlug(slug);

  if (!organization) notFound();

  const lang = getLang(resolvedSearchParams?.lang, organization.locale);
  const t = copy[lang];
  const supabase = await createClient();

  const [services, { data: workingHours }] = await Promise.all([
    getOnlineBookableServices(organization.id),
    supabase
      .from("salon_working_hours")
      .select("day_of_week, opens_at, closes_at, is_closed")
      .eq("organization_id", organization.id),
  ]);

  const address = formatAddress(organization);
  const hours = formatWorkingHours(workingHours ?? [], lang);

  return (
    <main
      data-theme={organization.theme}
      lang={lang}
      className="min-h-screen bg-app-bg text-app-text"
    >
      <section className="border-b border-app-soft/70">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  className="h-12 w-12 rounded-2xl object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent font-bold text-white">
                  {organization.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-app-muted">
                  SalonFlow
                </p>
                <h1 className="text-xl font-extrabold">{organization.name}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-app-muted" />
              {(["hr", "en", "it"] as const).map((locale) => (
                <Link
                  key={locale}
                  href={"/s/" + organization.slug + "?lang=" + locale}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-bold uppercase transition " +
                    (lang === locale
                      ? "bg-app-accent text-white"
                      : "border border-app-soft bg-white")
                  }
                >
                  {locale}
                </Link>
              ))}
            </div>
          </header>

          <div className="grid items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/70 px-4 py-2 text-sm font-semibold text-app-muted">
                <Sparkles className="h-4 w-4" />
                {t.badge}
              </div>

              <h2 className="mt-6 max-w-3xl text-5xl font-extrabold leading-tight md:text-6xl">
                {t.heroTitle}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-app-muted">
                {t.heroText}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={"/booking/" + organization.slug + "?lang=" + lang}
                  className="inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-3.5 font-bold text-white shadow-sm transition hover:opacity-90"
                >
                  <CalendarCheck className="h-5 w-5" />
                  {t.book}
                </Link>
                <a
                  href="#kontakt"
                  className="rounded-full border border-app-soft bg-white px-6 py-3.5 font-bold"
                >
                  {t.contact}
                </a>
              </div>
            </div>

            <div
              id="kontakt"
              className="rounded-[2rem] border border-app-soft bg-app-card p-7 shadow-sm"
            >
              <h3 className="text-xl font-extrabold">{t.contact}</h3>
              <div className="mt-5 space-y-4 text-sm text-app-muted">
                {organization.phone ? (
                  <a
                    href={"tel:" + organization.phone.replace(/\s+/g, "")}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Phone className="h-5 w-5 text-app-accent" />
                    {organization.phone}
                  </a>
                ) : null}

                {organization.email ? (
                  <a
                    href={"mailto:" + organization.email}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Mail className="h-5 w-5 text-app-accent" />
                    {organization.email}
                  </a>
                ) : null}

                {address ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                    <span>{address}</span>
                  </div>
                ) : null}

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
                  <span>{hours}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-app-accent">
            {t.services}
          </p>
          <h3 className="mt-3 text-4xl font-extrabold">{t.services}</h3>
          <p className="mt-4 text-lg leading-8 text-app-muted">{t.servicesText}</p>
        </div>

        {services.length ? (
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => {
              const price = formatPrice(service.price, service.currency, lang);

              return (
                <div
                  key={service.id}
                  className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm"
                >
                  {service.category ? (
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-app-accent">
                      {service.category}
                    </p>
                  ) : null}
                  <h4 className="mt-2 text-xl font-extrabold">{service.name}</h4>
                  {service.description ? (
                    <p className="mt-3 text-sm leading-6 text-app-muted">
                      {service.description}
                    </p>
                  ) : null}
                  <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-semibold text-app-muted">
                    <span>
                      {service.duration_minutes} {t.duration}
                    </span>
                    {price ? (
                      <>
                        <span>·</span>
                        <span>{price}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-app-soft bg-app-card p-6 text-app-muted">
            {t.noServices}
          </div>
        )}

        <div className="mt-10">
          <Link
            href={"/booking/" + organization.slug + "?lang=" + lang}
            className="inline-flex items-center gap-2 rounded-full bg-app-accent px-6 py-3.5 font-bold text-white"
          >
            <CalendarCheck className="h-5 w-5" />
            {t.book}
          </Link>
        </div>
      </section>

      <CookieConsent />
      <PublicFooter salonName={organization.name} />
      {organization.phone ? (
        <FloatingWhatsAppButton phone={organization.phone} lang={lang} />
      ) : null}
    </main>
  );
}
