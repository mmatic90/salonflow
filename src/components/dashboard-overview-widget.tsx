import Link from "next/link";
import {
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  UserX,
} from "lucide-react";

type Props = {
  todayAppointmentsCount: number;
  tomorrowAppointmentsCount: number;
  completedThisMonthCount: number;
  noShowThisMonthCount: number;
};

export default function DashboardOverviewWidget({
  todayAppointmentsCount,
  tomorrowAppointmentsCount,
  completedThisMonthCount,
  noShowThisMonthCount,
}: Props) {
  const cards = [
    {
      title: "Termini danas",
      value: todayAppointmentsCount,
      description: "Svi aktivni termini zakazani za danas.",
      href: "/dashboard/calendar/time-grid",
      icon: CalendarCheck,
    },
    {
      title: "Termini sutra",
      value: tomorrowAppointmentsCount,
      description: "Aktivni termini zakazani za sutra.",
      href: "/dashboard/appointments",
      icon: CalendarDays,
    },
    {
      title: "Odrađeno ovaj mjesec",
      value: completedThisMonthCount,
      description: "Broj uspješno završenih termina.",
      href: "/dashboard/reports",
      icon: CheckCircle2,
    },
    {
      title: "No-show ovaj mjesec",
      value: noShowThisMonthCount,
      description: "Termini na koje klijenti nisu došli.",
      href: "/dashboard/reports",
      icon: UserX,
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Link
            key={card.title}
            href={card.href}
            className="group rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-app-muted">{card.title}</p>
                <div className="mt-3 text-4xl font-bold text-app-text">
                  {card.value}
                </div>
              </div>

              <div className="rounded-2xl bg-app-card-alt p-3 text-app-accent transition group-hover:bg-app-accent group-hover:text-white">
                <Icon className="h-6 w-6" />
              </div>
            </div>

            <p className="mt-4 text-sm text-app-muted">{card.description}</p>
          </Link>
        );
      })}
    </section>
  );
}
