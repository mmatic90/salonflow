import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, Clock, Languages, Mail, MapPin, Phone } from "lucide-react";
import BookingClient from "../booking-client";
import CookieConsent from "@/components/cookie-consent";
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
        `${labels[row.day_of_week]} ${String(row.opens_at).slice(0, 5)}–${String(
          row.closes_at,
        ).slice(0, 5)}`,
    )
    .join(" · ");
}

const copy = {
  hr: {
    eyebrow: "Online rezervacije",
    title: "Pošalji zahtjev za termin",
    intro:
      "Odaberi uslugu, datum i slobodan termin. Salon će pregledati zahtjev i poslati potvrdu.",
    contact: "Kontakt",
    noServices:
      "Trenutno nema usluga dostupnih za online rezervaciju.",
  },
  en: {
    eyebrow: "Online booking",
    title: "Send an appointment request",
    intro:
      "Choose a service, date and available time. The salon will review your request and send confirmation.",
    contact: "Contact",
    noServices:
      "There are currently no services available for online booking.",
  },
  it: {
    eyebrow: "Prenotazione online",
    title: "Invia una richiesta di appuntamento",
    intro:
      "Scegli servizio, data e orario disponibile. Il salone verificherà la richiesta e invierà una conferma.",
    contact: "Contatti",
    noServices:
      "Al momento non ci sono servizi disponibili per la prenotazione online.",
  },
} as const;

export default async function TenantBookingPage({
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
      className="min-h-screen bg-app-bg px-4 py-6 text-app-text sm:px-6 sm:py-10"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {organization.logo_url ? (
              <Image
                src={organization.logo_url}
                alt={organization.name}
                width={48}
                height={48}
                className="h-12 w-12 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent font-bold text-white">
                {organization.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
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
                href={`/booking/${organization.slug}?lang=${locale}`}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase transition ${
                  lang === locale
                    ? "bg-app-accent text-white"
                    : "border border-app-soft bg-white text-app-text"
                }`}
              >
                {locale}
              </Link>
            ))}
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-app-soft bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
            <aside className="bg-app-dark p-7 text-white md:p-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm">
                <CalendarCheck className="h-4 w-4" />
                {t.eyebrow}
              </div>

              <h2 className="mt-6 text-4xl font-extrabold leading-tight">
                {t.title}
              </h2>
              <p className="mt-4 leading-7 text-white/75">{t.intro}</p>

              <div className="mt-8 space-y-4 rounded-3xl bg-white/10 p-5 text-sm text-white/80">
                <p className="font-bold text-white">{t.contact}</p>
                {organization.phone ? (
                  <a
                    href={`tel:${organization.phone.replace(/\s+/g, "")}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Phone className="h-4 w-4" />
                    {organization.phone}
                  </a>
                ) : null}
                {organization.email ? (
                  <a
                    href={`mailto:${organization.email}`}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {organization.email}
                  </a>
                ) : null}
                {address ? (
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{address}</span>
                  </div>
                ) : null}
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{hours}</span>
                </div>
              </div>
            </aside>

            <div className="p-5 sm:p-7 md:p-10">
              {services.length ? (
                <BookingClient
                  services={services}
                  lang={lang}
                  organizationSlug={organization.slug}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-app-soft bg-app-bg p-6 text-sm text-app-muted">
                  {t.noServices}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <CookieConsent />
      <PublicFooter salonName={organization.name} />
    </main>
  );
}
