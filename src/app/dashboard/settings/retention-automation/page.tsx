import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  MailCheck,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/page-header";
import PageShell from "@/components/page-shell";
import RetentionAutomationForm from "@/features/retention-automation/retention-automation-form";
import {
  getRetentionAutomationPreview,
  getRetentionAutomationSettings,
  type RetentionAutomationSettings,
} from "@/features/retention-automation/queries";
import { buildCapabilityUpgradePath } from "@/lib/entitlements";
import { canUseCapability } from "@/lib/permissions";
import { requireAdminForSettings } from "@/lib/page-guards";
import type { AppLocale } from "@/lib/i18n";
import type {
  RetentionPriority,
  RetentionReasonCode,
} from "@/features/retention/engine";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Automatic CRM follow-up",
      description:
        "Send consent-gated retention emails once per day using the same Pro CRM, unsubscribe and managed-email safeguards as manual follow-up.",
      back: "Back to settings",
      badge: "Pro automation",
      preview: "Preview without sending",
      previewHelp:
        "Nothing is sent from this preview. It shows the current CRM candidates that would be eligible if the daily run happened now.",
      total: "Current CRM candidates",
      eligible: "Eligible with consent",
      nextRun: "Would send on next run",
      noEligible: "No consent-eligible CRM candidates right now.",
      lastRun: "Last automation run",
      never: "Not run yet",
      status: "Status",
      date: "Local run date",
      sent: "Sent",
      skipped: "Skipped",
      failed: "Failed",
      priorities: {
        high: "High",
        medium: "Medium",
        low: "Low",
      },
      statuses: {
        never: "Not run yet",
        processing: "Running",
        completed: "Completed",
        failed: "Failed",
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
      title: "Follow-up CRM automatico",
      description:
        "Invia una volta al giorno email retention con consenso valido usando le stesse protezioni Pro CRM, disiscrizione ed email gestita del follow-up manuale.",
      back: "Torna alle impostazioni",
      badge: "Automazione Pro",
      preview: "Anteprima senza invio",
      previewHelp:
        "Da questa anteprima non viene inviato nulla. Mostra i candidati CRM attuali che sarebbero idonei se l'esecuzione giornaliera partisse ora.",
      total: "Candidati CRM attuali",
      eligible: "Idonei con consenso",
      nextRun: "Invii alla prossima esecuzione",
      noEligible: "Nessun candidato CRM con consenso valido al momento.",
      lastRun: "Ultima esecuzione automatica",
      never: "Non ancora eseguita",
      status: "Stato",
      date: "Data locale",
      sent: "Inviate",
      skipped: "Saltate",
      failed: "Fallite",
      priorities: {
        high: "Alta",
        medium: "Media",
        low: "Bassa",
      },
      statuses: {
        never: "Non ancora eseguita",
        processing: "In corso",
        completed: "Completata",
        failed: "Fallita",
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
    title: "Automatski CRM follow-up",
    description:
      "Jednom dnevno šalji retention email klijentima s valjanim pristankom koristeći iste Pro CRM, odjava i upravljane email zaštite kao kod ručnog follow-upa.",
    back: "Natrag na postavke",
    badge: "Pro automatizacija",
    preview: "Pregled bez slanja",
    previewHelp:
      "Iz ovog pregleda se ništa ne šalje. Prikazuje aktualne CRM kandidate koji bi ispunjavali uvjete kada bi se dnevna automatizacija pokrenula sada.",
    total: "Aktualni CRM kandidati",
    eligible: "S valjanim pristankom",
    nextRun: "Poslalo bi se pri idućem pokretanju",
    noEligible: "Trenutno nema CRM kandidata s valjanim pristankom.",
    lastRun: "Zadnje pokretanje automatizacije",
    never: "Još nije pokrenuto",
    status: "Status",
    date: "Lokalni datum",
    sent: "Poslano",
    skipped: "Preskočeno",
    failed: "Neuspjelo",
    priorities: {
      high: "Visok",
      medium: "Srednji",
      low: "Nizak",
    },
    statuses: {
      never: "Još nije pokrenuto",
      processing: "U tijeku",
      completed: "Završeno",
      failed: "Neuspjelo",
    },
    reasons: {
      overdue_cadence: "Kasni u odnosu na uobičajeni ritam",
      inactive_client: "Dugo neaktivan klijent",
      no_future_booking: "Nema budući termin",
      attendance_risk: "Rizik dolaznosti",
    },
  };
}

function formatDateTime(value: string | null, locale: AppLocale) {
  if (!value) return null;
  const language =
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR";
  return new Intl.DateTimeFormat(language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function RetentionAutomationSettingsPage() {
  const permissions = await requireAdminForSettings();

  if (!canUseCapability(permissions, "automations")) {
    redirect(
      buildCapabilityUpgradePath(
        "automations",
        "/dashboard/settings/retention-automation",
      ),
    );
  }

  const locale = permissions.organizationLocale;
  const t = copy(locale);
  const settings = await getRetentionAutomationSettings(permissions.organizationId);
  const preview = await getRetentionAutomationPreview(settings.dailyLimit);

  return (
    <PageShell maxWidth="max-w-5xl">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
      >
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>

      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-app-soft bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-app-accent">
        <Bot className="h-3.5 w-3.5" /> {t.badge}
      </div>
      <PageHeader title={t.title} description={t.description} />

      <RetentionAutomationForm
        locale={locale}
        initialEnabled={settings.enabled}
        initialDailyLimit={settings.dailyLimit}
      />

      <section className="mt-5 rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-app-accent" />
          <div>
            <h2 className="text-lg font-bold text-app-text">{t.preview}</h2>
            <p className="mt-1 text-sm leading-6 text-app-muted">{t.previewHelp}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-2xl font-extrabold text-app-text">{preview.totalCandidates}</p>
            <p className="mt-1 text-sm text-app-muted">{t.total}</p>
          </div>
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-2xl font-extrabold text-app-text">{preview.consentEligible}</p>
            <p className="mt-1 text-sm text-app-muted">{t.eligible}</p>
          </div>
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-2xl font-extrabold text-app-text">{preview.nextRunCount}</p>
            <p className="mt-1 text-sm text-app-muted">{t.nextRun}</p>
          </div>
        </div>

        {preview.items.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-app-soft p-5 text-sm text-app-muted">
            {t.noEligible}
          </div>
        ) : (
          <div className="mt-5 divide-y divide-app-soft overflow-hidden rounded-2xl border border-app-soft">
            {preview.items.map((item) => (
              <div
                key={item.clientId}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-app-text">{item.fullName}</p>
                  <p className="mt-0.5 text-sm text-app-muted">
                    {t.reasons[item.reasonCode as RetentionReasonCode]}
                  </p>
                </div>
                <span className="rounded-full bg-app-bg px-2.5 py-1 text-xs font-bold uppercase tracking-[0.06em] text-app-muted">
                  {t.priorities[item.priority as RetentionPriority]}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <Clock3 className="mt-0.5 h-5 w-5 text-app-accent" />
          <div>
            <h2 className="text-lg font-bold text-app-text">{t.lastRun}</h2>
            <p className="mt-1 text-sm text-app-muted">
              {formatDateTime(settings.lastRunAt, locale) ?? t.never}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
              {t.status}
            </p>
            <p className="mt-2 font-semibold text-app-text">
              {t.statuses[
                settings.lastRunStatus as RetentionAutomationSettings["lastRunStatus"]
              ]}
            </p>
          </div>
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-app-muted">
              {t.date}
            </p>
            <p className="mt-2 font-semibold text-app-text">
              {settings.lastRunLocalDate ?? "-"}
            </p>
          </div>
          <div className="rounded-2xl bg-app-bg p-4">
            <MailCheck className="h-4 w-4 text-emerald-600" />
            <p className="mt-2 text-2xl font-extrabold text-app-text">
              {settings.lastRunSent}
            </p>
            <p className="text-sm text-app-muted">{t.sent}</p>
          </div>
          <div className="rounded-2xl bg-app-bg p-4">
            <CheckCircle2 className="h-4 w-4 text-app-muted" />
            <p className="mt-2 text-2xl font-extrabold text-app-text">
              {settings.lastRunSkipped}
            </p>
            <p className="text-sm text-app-muted">{t.skipped}</p>
          </div>
          <div className="rounded-2xl bg-app-bg p-4">
            <p className="text-2xl font-extrabold text-app-text">
              {settings.lastRunFailed}
            </p>
            <p className="text-sm text-app-muted">{t.failed}</p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
