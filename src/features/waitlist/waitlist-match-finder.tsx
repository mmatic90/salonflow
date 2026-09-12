"use client";

import Link from "next/link";
import { CalendarCheck2, Loader2, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import type { AppLocale } from "@/lib/i18n";
import type { WaitlistMatch } from "@/features/waitlist/matching";

type Props = {
  entryId: string;
  clientId: string;
  serviceId: string;
  locale: AppLocale;
};

function ui(locale: AppLocale) {
  if (locale === "en") {
    return {
      find: "Find available slots",
      finding: "Checking availability...",
      title: "Matching free slots",
      empty: "No suitable free slot was found in the current search window.",
      book: "Book this slot",
      error: "Availability could not be checked.",
    };
  }

  if (locale === "it") {
    return {
      find: "Trova orari disponibili",
      finding: "Controllo disponibilità...",
      title: "Orari liberi compatibili",
      empty: "Nessun orario libero compatibile trovato nell'intervallo controllato.",
      book: "Prenota questo orario",
      error: "Impossibile controllare la disponibilità.",
    };
  }

  return {
    find: "Pronađi slobodne termine",
    finding: "Provjeravam dostupnost...",
    title: "Odgovarajući slobodni termini",
    empty: "Nema odgovarajućeg slobodnog termina u provjerenom razdoblju.",
    book: "Rezerviraj ovaj termin",
    error: "Nije moguće provjeriti dostupnost.",
  };
}

function localeCode(locale: AppLocale) {
  return locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(localeCode(locale), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function bookingHref(
  match: WaitlistMatch,
  entryId: string,
  clientId: string,
  serviceId: string,
) {
  const params = new URLSearchParams({
    waitlistId: entryId,
    clientId,
    serviceId,
    date: match.date,
    startTime: match.start_time.slice(0, 5),
    employeeId: match.employee_id,
    roomId: match.room_id,
  });

  return `/dashboard/appointments/new?${params.toString()}`;
}

export default function WaitlistMatchFinder({
  entryId,
  clientId,
  serviceId,
  locale,
}: Props) {
  const t = ui(locale);
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<WaitlistMatch[]>([]);

  async function findMatches() {
    setPending(true);
    setError("");

    try {
      const response = await fetch(
        `/api/waitlist/matches?entry_id=${encodeURIComponent(entryId)}`,
      );
      const result = (await response.json()) as {
        error?: string;
        matches?: WaitlistMatch[];
      };

      if (!response.ok) {
        throw new Error(result.error || t.error);
      }

      setMatches(result.matches ?? []);
      setLoaded(true);
    } catch (requestError) {
      setMatches([]);
      setLoaded(true);
      setError(requestError instanceof Error ? requestError.message : t.error);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-app-accent/15 bg-white p-3.5">
      <button
        type="button"
        onClick={findMatches}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-accent/25 bg-app-accent/5 px-4 py-2.5 text-sm font-semibold text-app-accent transition hover:bg-app-accent/10 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
        {pending ? t.finding : t.find}
      </button>

      {error ? (
        <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : loaded && matches.length === 0 ? (
        <p className="mt-3 text-sm leading-5 text-app-muted">{t.empty}</p>
      ) : matches.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
            <Sparkles className="h-3.5 w-3.5 text-app-accent" /> {t.title}
          </div>
          {matches.map((match) => (
            <div
              key={`${match.date}-${match.start_time}-${match.employee_id}-${match.room_id}`}
              className="rounded-xl bg-app-bg/70 p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold text-app-text">
                    {formatDate(match.date, locale)} · {match.start_time.slice(0, 5)}–{match.end_time.slice(0, 5)}
                  </p>
                  <p className="mt-1 truncate text-xs text-app-muted">
                    {match.employee_name} · {match.room_name}
                  </p>
                </div>
                <Link
                  href={bookingHref(match, entryId, clientId, serviceId)}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-app-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  <CalendarCheck2 className="h-4 w-4" /> {t.book}
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
