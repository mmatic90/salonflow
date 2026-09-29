"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type Lang = "hr" | "en" | "it";

export type BookingSuccessClientProps = {
  lang: string | null;
  date: string | null;
  time: string | null;
  service: string | null;
  organizationSlug?: string | null;
};

const content = {
  hr: {
    status: "Zahtjev poslan",
    title: "Hvala na rezervaciji ✨",
    text: "Vaš zahtjev za rezervaciju je uspješno poslan. Salon će provjeriti dostupnost termina i javiti vam potvrdu ili povratnu informaciju.",
    details: "Detalji zahtjeva",
    service: "Usluga",
    date: "Datum",
    time: "Vrijeme",
    redirect: "Automatski povratak na početnu stranicu za 10 sekundi.",
    home: "Povratak na početnu",
    newBooking: "Nova rezervacija",
  },
  en: {
    status: "Request sent",
    title: "Thank you for your booking ✨",
    text: "Your booking request has been sent successfully. The salon will review availability and let you know whether the appointment is confirmed or needs an update.",
    details: "Request details",
    service: "Service",
    date: "Date",
    time: "Time",
    redirect: "You will be redirected in 10 seconds.",
    home: "Back",
    newBooking: "New booking",
  },
  it: {
    status: "Richiesta inviata",
    title: "Grazie per la prenotazione ✨",
    text: "La tua richiesta è stata inviata. Il salone verificherà la disponibilità e ti comunicherà la conferma o eventuali aggiornamenti.",
    details: "Dettagli della richiesta",
    service: "Servizio",
    date: "Data",
    time: "Ora",
    redirect: "Verrai reindirizzato tra 10 secondi.",
    home: "Indietro",
    newBooking: "Nuova prenotazione",
  },
} satisfies Record<
  Lang,
  {
    status: string;
    title: string;
    text: string;
    details: string;
    service: string;
    date: string;
    time: string;
    redirect: string;
    home: string;
    newBooking: string;
  }
>;

function getLang(value: string | null): Lang {
  return value === "en" || value === "it" ? value : "hr";
}

function formatDate(date: string | null, lang: Lang): string {
  if (!date) {
    return "";
  }

  const [year, month, day] = date.split("-");

  if (!year || !month || !day) {
    return date;
  }

  return lang === "hr"
    ? `${day}.${month}.${year}.`
    : `${day}/${month}/${year}`;
}

export default function BookingSuccessClient({
  lang,
  date,
  time,
  service,
  organizationSlug,
}: BookingSuccessClientProps) {
  const router = useRouter();

  const language = getLang(lang);
  const t = content[language];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push(
        organizationSlug
          ? `/booking/${organizationSlug}?lang=${language}`
          : `/?lang=${language}`,
      );
    }, 10000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [router, language, organizationSlug]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10 text-app-text">
      <div className="w-full max-w-xl rounded-[2rem] border border-app-soft bg-white p-8 text-center shadow-sm md:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-app-card">
          <CheckCircle2 className="h-9 w-9 text-app-accent" />
        </div>

        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-app-accent">
          {t.status}
        </p>

        <h1 className="mt-3 text-3xl font-semibold">{t.title}</h1>

        <p className="mt-4 leading-7 text-app-muted">{t.text}</p>

        {(date || time || service) && (
          <div className="mt-8 rounded-2xl bg-app-card p-5 text-left">
            <h2 className="font-semibold">{t.details}</h2>

            <div className="mt-4 space-y-2 text-sm text-app-muted">
              {service && (
                <p>
                  <span className="font-medium text-app-text">{t.service}:</span>{" "}
                  {service}
                </p>
              )}

              {date && (
                <p>
                  <span className="font-medium text-app-text">{t.date}:</span>{" "}
                  {formatDate(date, language)}
                </p>
              )}

              {time && (
                <p>
                  <span className="font-medium text-app-text">{t.time}:</span>{" "}
                  {time}
                </p>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-app-accent">{t.redirect}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={
              organizationSlug
                ? `/booking/${organizationSlug}?lang=${language}`
                : `/?lang=${language}`
            }
            className="rounded-xl bg-app-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
          >
            {t.home}
          </Link>

          <Link
            href={
              organizationSlug
                ? `/booking/${organizationSlug}?lang=${language}`
                : `/?lang=${language}`
            }
            className="rounded-xl border border-app-soft px-6 py-3 font-semibold text-app-text transition hover:bg-app-card"
          >
            {t.newBooking}
          </Link>
        </div>
      </div>
    </main>
  );
}
