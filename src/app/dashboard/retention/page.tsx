import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  History,
  Mail,
  Phone,
  ShieldAlert,
  Sparkles,
  UserRoundSearch,
} from "lucide-react";
import PageHeader from "@/components/page-header";
import PageShell from "@/components/page-shell";
import RetentionActionControls from "@/features/retention/retention-action-controls";
import {
  getRetentionOverview,
  type RetentionActionCode,
  type RetentionCandidate,
  type RetentionPriority,
  type RetentionReasonCode,
} from "@/features/retention/queries";
import { requireAdminForAdvancedCrm } from "@/lib/page-guards";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "CRM actions & retention",
      description:
        "Turn client behavior signals into a focused follow-up queue without automatic marketing outreach.",
      badge: "Pro CRM workflow",
      queue: "Action queue",
      queueHelp:
        "Only the strongest current signal per client is shown. A new visit or attendance event can create a new signal later.",
      total: "Open actions",
      high: "High priority",
      snoozed: "Snoozed",
      historyCount: "Recorded actions",
      profile: "Client profile",
      rebook: "Rebook",
      noQueue: "No retention actions need attention right now.",
      noQueueHelp:
        "The queue updates automatically when appointments, visits and attendance behavior change.",
      history: "Action history",
      historyHelp:
        "Append-only history of contacted, snoozed, resolved and ignored CRM signals.",
      noHistory: "No CRM actions have been recorded yet.",
      lastVisit: "Last completed",
      cadence: "Average cadence",
      visits: "Completed visits",
      days: "days",
      never: "No completed visit",
      priority: { high: "High", medium: "Medium", low: "Low" },
      actions: {
        contacted: "Contacted",
        snoozed: "Snoozed",
        resolved: "Resolved",
        ignored: "Ignored",
      },
      reasons: {
        overdue_cadence: "Late vs. usual visit cadence",
        inactive_client: "Long-term inactive client",
        no_future_booking: "No future appointment",
        attendance_risk: "Attendance risk",
      },
    };
  }

  if (locale === "it") {
    return {
      title: "Azioni CRM e retention",
      description:
        "Trasforma i segnali sul comportamento dei clienti in una coda operativa, senza invii marketing automatici.",
      badge: "Workflow CRM Pro",
      queue: "Coda azioni",
      queueHelp:
        "Viene mostrato solo il segnale attuale più importante per cliente. Una nuova visita o un nuovo evento può generare un segnale nuovo.",
      total: "Azioni aperte",
      high: "Alta priorità",
      snoozed: "Rimandate",
      historyCount: "Azioni registrate",
      profile: "Profilo cliente",
      rebook: "Nuova prenotazione",
      noQueue: "Nessuna azione retention richiede attenzione al momento.",
      noQueueHelp:
        "La coda si aggiorna automaticamente quando cambiano appuntamenti, visite e comportamento di presenza.",
      history: "Cronologia azioni",
      historyHelp:
        "Cronologia append-only dei segnali contattati, rimandati, risolti e ignorati.",
      noHistory: "Nessuna azione CRM registrata.",
      lastVisit: "Ultima visita completata",
      cadence: "Cadenza media",
      visits: "Visite completate",
      days: "giorni",
      never: "Nessuna visita completata",
      priority: { high: "Alta", medium: "Media", low: "Bassa" },
      actions: {
        contacted: "Contattato",
        snoozed: "Rimandato",
        resolved: "Risolto",
        ignored: "Ignorato",
      },
      reasons: {
        overdue_cadence: "In ritardo rispetto alla cadenza abituale",
        inactive_client: "Cliente inattivo da molto tempo",
        no_future_booking: "Nessun appuntamento futuro",
        attendance_risk: "Rischio di mancata presenza",
      },
    };
  }

  return {
    title: "CRM akcije i retention",
    description:
      "Pretvori CRM signale u konkretnu listu klijenata za follow-up, bez automatskog marketinškog slanja.",
    badge: "Pro CRM workflow",
    queue: "Akcijska lista",
    queueHelp:
      "Prikazuje se samo najvažniji aktualni signal po klijentu. Novi posjet ili attendance događaj kasnije može stvoriti novi signal.",
    total: "Otvorene akcije",
    high: "Visoki prioritet",
    snoozed: "Odgođeno",
    historyCount: "Zabilježene akcije",
    profile: "Profil klijenta",
    rebook: "Ponovno rezerviraj",
    noQueue: "Trenutno nema retention akcija koje traže pažnju.",
    noQueueHelp:
      "Lista se automatski mijenja kada se promijene termini, završeni posjeti i attendance ponašanje.",
    history: "Povijest akcija",
    historyHelp:
      "Append-only povijest kontaktiranih, odgođenih, riješenih i ignoriranih CRM signala.",
    noHistory: "Još nema zabilježenih CRM akcija.",
    lastVisit: "Zadnji završeni posjet",
    cadence: "Prosječni ritam",
    visits: "Završeni posjeti",
    days: "dana",
    never: "Nema završenog posjeta",
    priority: { high: "Visok", medium: "Srednji", low: "Nizak" },
    actions: {
      contacted: "Kontaktiran",
      snoozed: "Odgođeno",
      resolved: "Riješeno",
      ignored: "Ignorirano",
    },
    reasons: {
      overdue_cadence: "Kasni u odnosu na uobičajeni ritam",
      inactive_client: "Dugo neaktivan klijent",
      no_future_booking: "Nema budući termin",
      attendance_risk: "Attendance rizik",
    },
  };
}

function priorityClasses(priority: RetentionPriority) {
  if (priority === "high") return "border-red-200 bg-red-50 text-red-800";
  if (priority === "medium") return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function actionClasses(action: RetentionActionCode) {
  if (action === "contacted") return "bg-blue-100 text-blue-800";
  if (action === "snoozed") return "bg-amber-100 text-amber-800";
  if (action === "resolved") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-200 text-slate-700";
}

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return null;
  const language = locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
  return new Intl.DateTimeFormat(language, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string, locale: AppLocale) {
  const language = locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function reasonDetail(candidate: RetentionCandidate, locale: AppLocale) {
  if (candidate.reasonCode === "overdue_cadence") {
    if (locale === "en") {
      return `${candidate.daysSinceLastVisit ?? 0} days since the last visit; usual cadence is about ${candidate.averageDaysBetweenVisits ?? "-"} days.`;
    }
    if (locale === "it") {
      return `${candidate.daysSinceLastVisit ?? 0} giorni dall'ultima visita; la cadenza abituale è circa ${candidate.averageDaysBetweenVisits ?? "-"} giorni.`;
    }
    return `${candidate.daysSinceLastVisit ?? 0} dana od zadnjeg posjeta; uobičajeni ritam je oko ${candidate.averageDaysBetweenVisits ?? "-"} dana.`;
  }

  if (candidate.reasonCode === "inactive_client") {
    if (locale === "en") return `No completed visit for ${candidate.daysSinceLastVisit ?? 0} days and no future appointment.`;
    if (locale === "it") return `Nessuna visita completata da ${candidate.daysSinceLastVisit ?? 0} giorni e nessun appuntamento futuro.`;
    return `Nema završeni posjet već ${candidate.daysSinceLastVisit ?? 0} dana i nema budući termin.`;
  }

  if (candidate.reasonCode === "attendance_risk") {
    if (locale === "en") return `${candidate.noShowCount} no-shows and ${candidate.cancelledCount} cancellations; no future appointment.`;
    if (locale === "it") return `${candidate.noShowCount} no-show e ${candidate.cancelledCount} cancellazioni; nessun appuntamento futuro.`;
    return `${candidate.noShowCount} no-show i ${candidate.cancelledCount} otkazivanja; nema budući termin.`;
  }

  if (locale === "en") return `Returning client with ${candidate.completedCount} completed visits has no future appointment.`;
  if (locale === "it") return `Cliente abituale con ${candidate.completedCount} visite completate senza un appuntamento futuro.`;
  return `Klijent s ${candidate.completedCount} završenih posjeta nema budući termin.`;
}

export default async function RetentionPage() {
  const permissions = await requireAdminForAdvancedCrm();
  const overview = await getRetentionOverview();
  const locale = permissions.organizationLocale;
  const t = copy(locale);

  return (
    <PageShell maxWidth="max-w-7xl">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-app-soft bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-app-accent">
        <Sparkles className="h-3.5 w-3.5" /> {t.badge}
      </div>
      <PageHeader title={t.title} description={t.description} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm">
          <UserRoundSearch className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-3xl font-extrabold text-app-text">{overview.stats.total}</p>
          <p className="mt-1 text-sm text-app-muted">{t.total}</p>
        </div>
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <ShieldAlert className="h-5 w-5 text-red-700" />
          <p className="mt-4 text-3xl font-extrabold text-red-900">{overview.stats.high}</p>
          <p className="mt-1 text-sm text-red-700">{t.high}</p>
        </div>
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm">
          <Clock3 className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-3xl font-extrabold text-app-text">{overview.stats.snoozed}</p>
          <p className="mt-1 text-sm text-app-muted">{t.snoozed}</p>
        </div>
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm">
          <History className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-3xl font-extrabold text-app-text">{overview.history.length}</p>
          <p className="mt-1 text-sm text-app-muted">{t.historyCount}</p>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-app-soft bg-white shadow-sm">
        <div className="border-b border-app-soft p-5 sm:p-6">
          <h2 className="text-xl font-bold text-app-text">{t.queue}</h2>
          <p className="mt-1 text-sm leading-6 text-app-muted">{t.queueHelp}</p>
        </div>

        {overview.candidates.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
            <p className="mt-4 font-semibold text-app-text">{t.noQueue}</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-app-muted">{t.noQueueHelp}</p>
          </div>
        ) : (
          <div className="divide-y divide-app-soft">
            {overview.candidates.map((candidate) => (
              <article key={candidate.signalKey} className="p-5 sm:p-6">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)] xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-app-text">{candidate.fullName}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${priorityClasses(candidate.priority)}`}>
                        {t.priority[candidate.priority]}
                      </span>
                    </div>

                    <p className="mt-2 font-semibold text-app-text">{t.reasons[candidate.reasonCode]}</p>
                    <p className="mt-1 max-w-3xl text-sm leading-6 text-app-muted">{reasonDetail(candidate, locale)}</p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-app-muted">
                      <span className="rounded-full bg-app-bg px-3 py-1.5">
                        {t.lastVisit}: {formatDate(candidate.lastCompleted, locale) ?? t.never}
                      </span>
                      <span className="rounded-full bg-app-bg px-3 py-1.5">
                        {t.visits}: {candidate.completedCount}
                      </span>
                      {candidate.averageDaysBetweenVisits !== null ? (
                        <span className="rounded-full bg-app-bg px-3 py-1.5">
                          {t.cadence}: {candidate.averageDaysBetweenVisits} {t.days}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.phone ? (
                        <a href={`tel:${candidate.phone}`} className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg">
                          <Phone className="h-4 w-4" /> {candidate.phone}
                        </a>
                      ) : null}
                      {candidate.email ? (
                        <a href={`mailto:${candidate.email}`} className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg">
                          <Mail className="h-4 w-4" /> {candidate.email}
                        </a>
                      ) : null}
                      <Link href={`/dashboard/clients/${candidate.clientId}`} className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg">
                        {t.profile} <ArrowRight className="h-4 w-4" />
                      </Link>
                      <Link href={`/dashboard/appointments/new?clientId=${encodeURIComponent(candidate.clientId)}`} className="inline-flex items-center gap-2 rounded-xl bg-app-text px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                        <CalendarPlus className="h-4 w-4" /> {t.rebook}
                      </Link>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-app-soft bg-app-bg p-4">
                    <RetentionActionControls
                      locale={locale}
                      clientId={candidate.clientId}
                      signalKey={candidate.signalKey}
                      reasonCode={candidate.reasonCode}
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-app-soft bg-white shadow-sm">
        <div className="border-b border-app-soft p-5 sm:p-6">
          <h2 className="text-xl font-bold text-app-text">{t.history}</h2>
          <p className="mt-1 text-sm leading-6 text-app-muted">{t.historyHelp}</p>
        </div>

        {overview.history.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-app-muted">{t.noHistory}</div>
        ) : (
          <div className="divide-y divide-app-soft">
            {overview.history.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="min-w-0">
                  <Link href={`/dashboard/clients/${item.clientId}`} className="font-semibold text-app-text hover:underline">
                    {item.clientName}
                  </Link>
                  <p className="mt-1 text-sm text-app-muted">{t.reasons[item.reasonCode]}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-bold ${actionClasses(item.action)}`}>
                    {t.actions[item.action]}
                  </span>
                  {item.snoozedUntil ? (
                    <span className="text-app-muted">→ {formatDate(item.snoozedUntil, locale)}</span>
                  ) : null}
                  <span className="text-app-muted">{formatDateTime(item.createdAt, locale)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
