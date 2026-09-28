import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  acceptOnlineBookingRequestAction,
  rejectOnlineBookingRequestAction,
} from "@/features/online-bookings/actions";
import {
  getOnlineBookingCounts,
  getOnlineBookings,
  type OnlineBookingAvailabilityIssue,
  type OnlineBookingStatus,
} from "@/features/online-bookings/queries";
import AutoRefresh from "@/components/auto-refresh";
import { requireDashboardUser } from "@/lib/page-guards";
import { getDictionary, type AppLocale } from "@/lib/i18n";

function formatDate(date: string, locale: "hr" | "en" | "it") {
  const [year, month, day] = date.split("-");
  if (locale === "hr") return day + "." + month + "." + year + ".";
  return day + "/" + month + "/" + year;
}

function getStatusFromSearchParams(searchParams?: {
  status?: string | string[];
}): OnlineBookingStatus {
  const rawStatus = Array.isArray(searchParams?.status)
    ? searchParams?.status[0]
    : searchParams?.status;

  if (
    rawStatus === "today" ||
    rawStatus === "all" ||
    rawStatus === "archive" ||
    rawStatus === "pending" ||
    rawStatus === "accepted" ||
    rawStatus === "rejected"
  ) {
    return rawStatus;
  }

  return "pending";
}

function statusLabel(
  status: string,
  t: ReturnType<typeof getDictionary>["onlineBookings"],
) {
  if (status === "pending") return t.pending;
  if (status === "accepted") return t.accepted;
  if (status === "rejected") return t.rejected;
  return status;
}

function statusClass(status: string) {
  if (status === "pending") {
    return "border-amber-200 bg-amber-100 text-amber-800";
  }

  if (status === "accepted") {
    return "border-emerald-200 bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-100 text-red-800";
  }

  return "border-app-soft bg-app-card-alt text-app-muted";
}

function availabilityIssueText(
  issue: OnlineBookingAvailabilityIssue | null,
  locale: AppLocale,
) {
  if (!issue) return null;

  const copy = {
    hr: {
      salon_closed: "Salon je zatvoren na traženi datum.",
      outside_salon_hours: "Traženi termin je izvan radnog vremena salona.",
      no_mapped_employee: "Nijedan djelatnik nije povezan s ovom uslugom.",
      no_available_employee:
        "Nijedan djelatnik za ovu uslugu nije slobodan u traženo vrijeme.",
      no_mapped_room: "Nijedna soba nije povezana s ovom uslugom.",
      no_available_room:
        "Nijedna odgovarajuća soba nije slobodna u traženo vrijeme.",
    },
    en: {
      salon_closed: "The salon is closed on the requested date.",
      outside_salon_hours: "The requested slot is outside salon opening hours.",
      no_mapped_employee: "No employee is assigned to this service.",
      no_available_employee:
        "No employee for this service is available at the requested time.",
      no_mapped_room: "No room is assigned to this service.",
      no_available_room: "No suitable room is available at the requested time.",
    },
    it: {
      salon_closed: "Il salone è chiuso nella data richiesta.",
      outside_salon_hours:
        "L'orario richiesto è fuori dall'orario di apertura del salone.",
      no_mapped_employee: "Nessun operatore è associato a questo servizio.",
      no_available_employee:
        "Nessun operatore per questo servizio è libero nell'orario richiesto.",
      no_mapped_room: "Nessuna cabina è associata a questo servizio.",
      no_available_room:
        "Nessuna cabina adatta è libera nell'orario richiesto.",
    },
  } as const;

  return copy[locale][issue];
}

function availabilityHeadings(locale: AppLocale) {
  if (locale === "en") {
    return {
      available: "Requested slot is available",
      unavailable: "Requested slot is not currently available",
      availableHelp:
        "SalonFlow found an available employee and room for the requested time.",
      unavailableHelp:
        "Open the request to choose another employee, room or alternative time.",
    };
  }

  if (locale === "it") {
    return {
      available: "L'orario richiesto è disponibile",
      unavailable: "L'orario richiesto non è al momento disponibile",
      availableHelp:
        "SalonFlow ha trovato un operatore e una cabina disponibili per l'orario richiesto.",
      unavailableHelp:
        "Apri la richiesta per scegliere un altro operatore, una cabina o un orario alternativo.",
    };
  }

  return {
    available: "Traženi termin je dostupan",
    unavailable: "Traženi termin trenutno nije dostupan",
    availableHelp:
      "SalonFlow je pronašao slobodnog djelatnika i sobu za traženi datum i vrijeme.",
    unavailableHelp:
      "Otvori zahtjev za odabir drugog djelatnika, sobe ili alternativnog vremena.",
  };
}

export default async function OnlineBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string | string[] }>;
}) {
  const permissions = await requireDashboardUser();
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.onlineBookings;
  const availabilityCopy = availabilityHeadings(permissions.organizationLocale);
  const filters: { value: OnlineBookingStatus; label: string }[] = [
    { value: "today", label: t.today },
    { value: "pending", label: t.pending },
    { value: "accepted", label: t.accepted },
    { value: "rejected", label: t.rejected },
    { value: "all", label: t.all },
    { value: "archive", label: t.archive },
  ];

  const resolvedSearchParams = await searchParams;
  const activeStatus = getStatusFromSearchParams(resolvedSearchParams);

  const [bookings, counts] = await Promise.all([
    getOnlineBookings(activeStatus),
    getOnlineBookingCounts(),
  ]);

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <AutoRefresh />
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <p className="text-sm font-medium text-app-muted">{t.sourceLabel}</p>

          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-app-text">{t.title}</h1>
              <p className="mt-2 text-app-muted">{t.intro}</p>
            </div>

            <div className="rounded-2xl border border-app-soft bg-app-card-alt px-5 py-3 text-sm text-app-muted">
              {t.today}:{" "}
              <span className="font-bold text-app-text">{counts.today}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const active = activeStatus === filter.value;
              const count = counts[filter.value];

              return (
                <Link
                  key={filter.value}
                  href={`/dashboard/online-bookings?status=${filter.value}`}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-app-accent text-white shadow-sm"
                      : "bg-app-card-alt text-app-text hover:bg-app-bg"
                  }`}
                >
                  {filter.label}{" "}
                  <span className={active ? "text-white" : "text-app-muted"}>
                    ({count})
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-app-soft bg-app-card p-8 text-center text-app-muted">
            {t.empty}
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const liveAvailability = booking.live_availability;
              const quickEmployee = liveAvailability?.employee ?? null;
              const quickRoom = liveAvailability?.room ?? null;
              const generalIssue = availabilityIssueText(
                liveAvailability?.generalIssue ?? null,
                permissions.organizationLocale,
              );
              const employeeIssue = availabilityIssueText(
                liveAvailability?.employeeIssue ?? null,
                permissions.organizationLocale,
              );
              const roomIssue = availabilityIssueText(
                liveAvailability?.roomIssue ?? null,
                permissions.organizationLocale,
              );
              const canQuickAccept =
                booking.status === "pending" &&
                !generalIssue &&
                quickEmployee &&
                quickRoom;

              return (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold text-app-text">
                          {booking.client_full_name}
                        </h2>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                            booking.status,
                          )}`}
                        >
                          {statusLabel(booking.status, t)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-app-muted">
                        {booking.services?.name ?? t.unknownService} ·{" "}
                        {formatDate(
                          booking.requested_date,
                          permissions.organizationLocale,
                        )}{" "}
                        {t.at} {booking.start_time?.slice(0, 5)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/dashboard/online-bookings/${booking.id}`}
                        className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        {t.openRequest}
                      </Link>

                      {booking.status === "pending" ? (
                        <>
                          {canQuickAccept ? (
                            <form action={acceptOnlineBookingRequestAction}>
                              <input
                                type="hidden"
                                name="request_id"
                                value={booking.id}
                              />
                              <input
                                type="hidden"
                                name="employee_id"
                                value={quickEmployee.id}
                              />
                              <input
                                type="hidden"
                                name="room_id"
                                value={quickRoom.id}
                              />
                              <input
                                type="hidden"
                                name="duration_minutes"
                                value={
                                  booking.final_duration_minutes ??
                                  booking.duration_minutes
                                }
                              />

                              <button
                                type="submit"
                                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                              >
                                {t.accept}
                              </button>
                            </form>
                          ) : null}

                          <form action={rejectOnlineBookingRequestAction}>
                            <input
                              type="hidden"
                              name="request_id"
                              value={booking.id}
                            />
                            <input
                              type="hidden"
                              name="rejection_reason"
                              value={t.rejectionReasons[0]}
                            />

                            <button
                              type="submit"
                              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              {t.reject}
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl bg-app-card-alt p-4">
                      <div className="text-app-muted">{t.phone}</div>
                      <div className="mt-1 font-medium text-app-text">
                        {booking.client_phone}
                      </div>
                    </div>

                    <div className="rounded-xl bg-app-card-alt p-4">
                      <div className="text-app-muted">Email</div>
                      <div className="mt-1 font-medium text-app-text">
                        {booking.client_email || "-"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-app-card-alt p-4">
                      <div className="text-app-muted">{t.duration}</div>
                      <div className="mt-1 font-medium text-app-text">
                        {booking.final_duration_minutes ?? booking.duration_minutes} min
                      </div>
                    </div>

                    <div className="rounded-xl bg-app-card-alt p-4">
                      <div className="text-app-muted">{t.created}</div>
                      <div className="mt-1 font-medium text-app-text">
                        {new Date(booking.created_at).toLocaleDateString(
                          permissions.organizationLocale === "en"
                            ? "en-GB"
                            : permissions.organizationLocale === "it"
                              ? "it-IT"
                              : "hr-HR",
                        )}
                      </div>
                    </div>
                  </div>

                  {booking.status === "pending" ? (
                    canQuickAccept ? (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold">
                              {availabilityCopy.available}
                            </div>
                            <p className="mt-1 text-emerald-800">
                              {availabilityCopy.availableHelp}
                            </p>
                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                              <div>
                                <span className="font-medium">{t.employee}:</span>{" "}
                                {quickEmployee.display_name}
                              </div>
                              <div>
                                <span className="font-medium">{t.room}:</span>{" "}
                                {quickRoom.name}
                              </div>
                              <div>
                                <span className="font-medium">{t.duration}:</span>{" "}
                                {booking.final_duration_minutes ??
                                  booking.duration_minutes}{" "}
                                min
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                          <div>
                            <div className="font-semibold">
                              {availabilityCopy.unavailable}
                            </div>
                            <div className="mt-2 space-y-1 text-amber-800">
                              {generalIssue ? <p>• {generalIssue}</p> : null}
                              {employeeIssue ? <p>• {employeeIssue}</p> : null}
                              {roomIssue ? <p>• {roomIssue}</p> : null}
                            </div>
                            <p className="mt-2 text-amber-800">
                              {availabilityCopy.unavailableHelp}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  ) : null}

                  {booking.rejection_reason ? (
                    <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm">
                      <div className="font-medium text-red-900">
                        {t.rejectionReason}
                      </div>
                      <p className="mt-1 text-red-700">
                        {booking.rejection_reason}
                      </p>
                    </div>
                  ) : null}

                  {booking.client_note ? (
                    <div className="mt-4 rounded-xl bg-app-card-alt p-4 text-sm">
                      <div className="font-medium text-app-text">{t.note}</div>
                      <p className="mt-1 text-app-muted">{booking.client_note}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
