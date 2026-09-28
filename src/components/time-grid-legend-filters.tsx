"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type StatusKey = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

type Props = {
  locale?: AppLocale;
  showScheduled: boolean;
  showCompleted: boolean;
  showCancelled: boolean;
  showNoShow: boolean;
};

function FilterChip({
  label,
  active,
  onClick,
  dotClassName,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
  dotClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-app-accent/20 ${
        active
          ? "border-app-soft bg-white text-app-text"
          : "border-app-soft bg-app-card-alt text-app-muted hover:bg-app-bg"
      }`}
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full transition-transform duration-200 group-hover:scale-110 ${dotClassName}`}
      />
      <span>{label}</span>
    </button>
  );
}

function LegendChip({
  label,
  dotClassName,
}: {
  label: string;
  dotClassName: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-app-muted">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${dotClassName}`}
      />
      <span>{label}</span>
    </div>
  );
}

function Separator() {
  return <span className="text-sm font-semibold text-app-soft/70">|</span>;
}

export default function TimeGridLegendFilters({
  locale = "hr",
  showScheduled,
  showCompleted,
  showCancelled,
  showNoShow,
}: Props) {
  const dictionary = getDictionary(locale);
  const appointmentT = dictionary.appointments;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(status: StatusKey) {
    const params = new URLSearchParams(searchParams.toString());

    const key =
      status === "scheduled"
        ? "scheduled"
        : status === "completed"
          ? "completed"
          : status === "cancelled"
            ? "cancelled"
            : "no_show";

    const current =
      status === "scheduled"
        ? showScheduled
        : status === "completed"
          ? showCompleted
          : status === "cancelled"
            ? showCancelled
            : showNoShow;

    params.set(key, current ? "0" : "1");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-app-soft bg-app-card px-4 py-3 shadow-sm">
      <LegendChip label={locale === "en" ? "Working hours" : locale === "it" ? "Orario di lavoro" : "Radno vrijeme"} dotClassName="bg-[#B0A695]" />
      <Separator />
      <LegendChip label={locale === "en" ? "Non-working hours" : locale === "it" ? "Fuori orario" : "Neradno vrijeme"} dotClassName="bg-[#E5DDD2]" />
      <Separator />

      <FilterChip
        label={locale === "en" ? "Scheduled" : locale === "it" ? "Programmato" : "Zakazan"}
        active={showScheduled}
        onClick={() => toggle("scheduled")}
        dotClassName="bg-[#B0A695]"
      />
      <Separator />
      <FilterChip
        label={appointmentT.completed}
        active={showCompleted}
        onClick={() => toggle("completed")}
        dotClassName="bg-[#776B5D]"
      />
      <Separator />
      <FilterChip
        label={locale === "en" ? "Cancelled" : locale === "it" ? "Annullato" : "Otkazan"}
        active={showCancelled}
        onClick={() => toggle("cancelled")}
        dotClassName="bg-[#CDBFAF]"
      />
      <Separator />
      <FilterChip
        label={appointmentT.noShow}
        active={showNoShow}
        onClick={() => toggle("no_show")}
        dotClassName="bg-[#4B4844]"
      />
    </div>
  );
}
