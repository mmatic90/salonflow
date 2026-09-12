"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClockAlert,
  UserX,
} from "lucide-react";
import { quickUpdateAppointmentStatusAction } from "@/features/appointments/actions";
import type { AppLocale } from "@/lib/i18n";

type Item = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  service: {
    id: string;
    name: string;
  } | null;
  employee: {
    id: string;
    display_name: string;
  } | null;
};

type Props = {
  items: Item[];
  locale?: AppLocale;
};

const VISIBLE_LIMIT = 5;

function formatDate(value: string, locale: AppLocale) {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR",
    { day: "2-digit", month: "2-digit", year: "numeric" },
  ).format(date);
}

export default function OverdueAppointmentsPanel({
  items,
  locale = "hr",
}: Props) {
  const [appointments, setAppointments] = useState(items);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();

  const ui = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Appointments awaiting status",
            description: "Confirm what happened after appointments that have already ended.",
            pending: "to review",
            completed: "Completed",
            noShow: "No-show",
            showMore: "Show more",
            showLess: "Show less",
          }
        : locale === "it"
          ? {
              title: "Appuntamenti in attesa di stato",
              description: "Conferma l'esito degli appuntamenti già terminati.",
              pending: "da verificare",
              completed: "Completato",
              noShow: "No-show",
              showMore: "Mostra altri",
              showLess: "Mostra meno",
            }
          : {
              title: "Termini koji čekaju status",
              description: "Potvrdi ishod termina koji su već završili.",
              pending: "za provjeru",
              completed: "Odrađeno",
              noShow: "No-show",
              showMore: "Prikaži još",
              showLess: "Prikaži manje",
            },
    [locale],
  );

  async function handleUpdate(
    appointmentId: string,
    status: "completed" | "no_show",
  ) {
    setPendingId(appointmentId);
    setMessage("");

    startTransition(async () => {
      const result = await quickUpdateAppointmentStatusAction(
        appointmentId,
        status,
      );

      setMessage(result.message);
      setIsError(!result.ok);

      if (result.ok) {
        setAppointments((prev) =>
          prev.filter((item) => item.id !== appointmentId),
        );
      }

      setPendingId(null);
    });
  }

  if (appointments.length === 0) {
    return null;
  }

  const visibleAppointments = expanded
    ? appointments
    : appointments.slice(0, VISIBLE_LIMIT);
  const hiddenCount = Math.max(0, appointments.length - VISIBLE_LIMIT);

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50/65 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <ClockAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-app-text">{ui.title}</h2>
            <p className="mt-0.5 text-sm text-app-muted">{ui.description}</p>
          </div>
        </div>

        <span className="w-fit shrink-0 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-800">
          {appointments.length} {ui.pending}
        </span>
      </div>

      {message ? (
        <div
          className={`mx-5 mt-4 rounded-xl px-3 py-2 text-sm sm:mx-6 ${
            isError
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="divide-y divide-app-soft">
        {visibleAppointments.map((item) => {
          const isCurrent = pendingId === item.id;

          return (
            <div
              key={item.id}
              className="grid gap-3 px-5 py-4 transition hover:bg-app-bg/45 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="font-semibold text-app-text">{item.client_name}</p>
                  <span className="text-xs font-medium text-app-muted">
                    {formatDate(item.appointment_date, locale)} · {item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}
                  </span>
                </div>
                <p className="mt-1 truncate text-sm text-app-muted">
                  {item.service?.name || "-"} · {item.employee?.display_name || "-"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:justify-end">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUpdate(item.id, "completed")}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-app-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isCurrent && isPending ? "..." : ui.completed}
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleUpdate(item.id, "no_show")}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserX className="h-4 w-4" />
                  {isCurrent && isPending ? "..." : ui.noShow}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 || expanded ? (
        <div className="border-t border-app-soft bg-app-bg/35 px-5 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-app-accent transition hover:opacity-80"
          >
            {expanded ? (
              <>
                {ui.showLess}
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                {ui.showMore} {hiddenCount}
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      ) : null}
    </section>
  );
}
