import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  UserX,
  ArrowUpRight,
} from "lucide-react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale: AppLocale;
  todayAppointmentsCount: number;
  tomorrowAppointmentsCount: number;
  completedThisMonthCount: number;
  noShowThisMonthCount: number;
};

export default function DashboardOverviewWidget({
  locale,
  todayAppointmentsCount,
  tomorrowAppointmentsCount,
  completedThisMonthCount,
  noShowThisMonthCount,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.dashboard.overview;

  const cards = [
    {
      title: t.todayTitle,
      value: todayAppointmentsCount,
      description: t.todayDescription,
      href: "/dashboard/calendar/time-grid",
      icon: CalendarCheck,
    },
    {
      title: t.tomorrowTitle,
      value: tomorrowAppointmentsCount,
      description: t.tomorrowDescription,
      href: "/dashboard/appointments",
      icon: CalendarDays,
    },
    {
      title: t.completedTitle,
      value: completedThisMonthCount,
      description: t.completedDescription,
      href: "/dashboard/reports",
      icon: CheckCircle2,
    },
    {
      title: t.noShowTitle,
      value: noShowThisMonthCount,
      description: t.noShowDescription,
      href: "/dashboard/reports",
      icon: UserX,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Link
            key={card.title}
            href={card.href}
            className="group relative overflow-hidden rounded-3xl border border-app-soft bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.09)] sm:p-5"
          >
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-app-accent/5 transition group-hover:bg-app-accent/10" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-sm sm:normal-case sm:tracking-normal">
                  {card.title}
                </p>
                <div className="mt-3 text-3xl font-extrabold tracking-tight text-app-text sm:text-4xl">
                  {card.value}
                </div>
              </div>

              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent transition group-hover:bg-app-accent group-hover:text-white sm:flex">
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="relative mt-4 flex items-end justify-between gap-3">
              <p className="line-clamp-2 text-xs leading-5 text-app-muted sm:text-sm">
                {card.description}
              </p>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-app-muted transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-app-accent" />
            </div>
          </Link>
        );
      })}
    </section>
  );
}
