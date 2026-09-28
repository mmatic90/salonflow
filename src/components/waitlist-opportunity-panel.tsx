import Link from "next/link";
import { BellRing, CalendarCheck2, Clock3, UserRound } from "lucide-react";
import type { AppLocale } from "@/lib/i18n";
import type { WaitlistOpportunityAlert } from "@/features/waitlist/opportunity-queries";

type Props = {
  locale: AppLocale;
  items: WaitlistOpportunityAlert[];
};

function ui(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Waitlist opportunity",
      titlePlural: "Waitlist opportunities",
      help: "A suitable slot is now available for clients on the waitlist.",
      book: "Book this slot",
      openWaitlist: "Open waitlist",
      more: "more matches",
    };
  }

  if (locale === "it") {
    return {
      title: "Opportunità dalla lista d'attesa",
      titlePlural: "Opportunità dalla lista d'attesa",
      help: "Ora è disponibile un orario compatibile per clienti nella lista d'attesa.",
      book: "Prenota questo orario",
      openWaitlist: "Apri lista d'attesa",
      more: "altri abbinamenti",
    };
  }

  return {
    title: "Slobodan termin za listu čekanja",
    titlePlural: "Slobodni termini za listu čekanja",
    help: "Pojavio se termin koji odgovara klijentu s liste čekanja.",
    book: "Rezerviraj termin",
    openWaitlist: "Otvori listu čekanja",
    more: "još podudaranja",
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

function bookingHref(item: WaitlistOpportunityAlert) {
  const params = new URLSearchParams({
    waitlistId: item.entry_id,
    clientId: item.client_id,
    serviceId: item.service_id,
    date: item.date,
    startTime: item.start_time.slice(0, 5),
    employeeId: item.employee_id,
    roomId: item.room_id,
  });

  return `/dashboard/appointments/new?${params.toString()}`;
}

export default function WaitlistOpportunityPanel({ locale, items }: Props) {
  if (items.length === 0) return null;

  const t = ui(locale);
  const visibleItems = items.slice(0, 5);

  return (
    <section className="overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/70 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 border-b border-emerald-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-emerald-950">
                {items.length === 1 ? t.title : t.titlePlural}
              </h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-emerald-700 shadow-sm">
                {items.length}
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-emerald-800">{t.help}</p>
          </div>
        </div>

        <Link
          href="/dashboard/waitlist"
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
        >
          {t.openWaitlist}
        </Link>
      </div>

      <div className="divide-y divide-emerald-200/80">
        {visibleItems.map((item) => (
          <div
            key={item.entry_id}
            className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center lg:px-6"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0 text-emerald-700" />
                <p className="truncate font-bold text-emerald-950">
                  {item.client_name}
                </p>
              </div>
              <p className="mt-1 truncate text-sm font-semibold text-emerald-800">
                {item.service_name}
              </p>
              <p className="mt-1 truncate text-xs text-emerald-700/80">
                {[item.client_phone, item.client_email].filter(Boolean).join(" · ")}
              </p>
            </div>

            <div className="rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
              <p className="flex items-center gap-2 font-bold text-app-text">
                <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
                {formatDate(item.date, locale)} · {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-app-muted">
                <Clock3 className="h-3.5 w-3.5" />
                {item.employee_name} · {item.room_name}
              </p>
            </div>

            <Link
              href={bookingHref(item)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
              <CalendarCheck2 className="h-4 w-4" /> {t.book}
            </Link>
          </div>
        ))}
      </div>

      {items.length > visibleItems.length ? (
        <div className="border-t border-emerald-200 px-5 py-3 text-center text-xs font-semibold text-emerald-800 sm:px-6">
          +{items.length - visibleItems.length} {t.more}
        </div>
      ) : null}
    </section>
  );
}
