"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, HelpCircle, Loader2, MailCheck, MailX, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateClientMarketingPreferenceAction } from "@/features/clients/marketing-preference-actions";
import type {
  ClientMarketingPreference,
  MarketingEmailStatus,
} from "@/features/clients/marketing-preferences";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Communication preferences",
      description:
        "Marketing and retention email preference. Appointment confirmations, reminders and other operational messages are managed separately.",
      allowed: "Marketing email allowed",
      notAllowed: "Marketing email not allowed",
      unknown: "No recorded preference",
      helpAllowed:
        "Use only when the client has explicitly agreed to receive marketing or retention emails.",
      helpNotAllowed:
        "The client has explicitly declined or unsubscribed from marketing email.",
      helpUnknown:
        "No explicit marketing choice is recorded. Automated retention marketing must not treat this as consent.",
      save: "Save preference",
      saving: "Saving...",
      saved: "Marketing preference saved.",
      adminOnly: "Only salon administrators can change this preference.",
      emailRequired: "An email address is required before marketing email can be allowed.",
      history: "Preference history",
      noHistory: "No explicit marketing preference changes recorded yet.",
      source: "Source",
      changed: "Changed",
      sources: {
        manual: "Salon staff",
        online_booking: "Online booking opt-in",
        unsubscribe: "Unsubscribe link",
        import: "Import",
        legacy: "Legacy data",
      },
    };
  }

  if (locale === "it") {
    return {
      title: "Preferenze di comunicazione",
      description:
        "Preferenza per email marketing e retention. Conferme appuntamento, promemoria e altre comunicazioni operative sono gestite separatamente.",
      allowed: "Email marketing consentite",
      notAllowed: "Email marketing non consentite",
      unknown: "Nessuna preferenza registrata",
      helpAllowed:
        "Usa questa opzione solo quando il cliente ha accettato esplicitamente email marketing o retention.",
      helpNotAllowed:
        "Il cliente ha rifiutato esplicitamente o annullato l'iscrizione alle email marketing.",
      helpUnknown:
        "Non è registrata una scelta esplicita. Le automazioni marketing non devono interpretarla come consenso.",
      save: "Salva preferenza",
      saving: "Salvataggio...",
      saved: "Preferenza marketing salvata.",
      adminOnly: "Solo gli amministratori del salone possono modificare questa preferenza.",
      emailRequired: "Serve un indirizzo email prima di consentire le email marketing.",
      history: "Cronologia preferenze",
      noHistory: "Nessuna modifica esplicita registrata.",
      source: "Origine",
      changed: "Modificata",
      sources: {
        manual: "Personale del salone",
        online_booking: "Opt-in prenotazione online",
        unsubscribe: "Link di disiscrizione",
        import: "Importazione",
        legacy: "Dati precedenti",
      },
    };
  }

  return {
    title: "Preference komunikacije",
    description:
      "Preferenca za marketinški i retention email. Potvrde termina, podsjetnici i ostale operativne poruke vode se odvojeno.",
    allowed: "Marketinški email dopušten",
    notAllowed: "Marketinški email nije dopušten",
    unknown: "Nema zabilježene preference",
    helpAllowed:
      "Odaberi samo kada je klijent izričito pristao primati marketinške ili retention emailove.",
    helpNotAllowed:
      "Klijent je izričito odbio ili se odjavio s marketinških emailova.",
    helpUnknown:
      "Nema zabilježenog izričitog izbora. Automatizacije ovo ne smiju tretirati kao pristanak.",
    save: "Spremi preferencu",
    saving: "Spremanje...",
    saved: "Marketinška preferenca je spremljena.",
    adminOnly: "Samo administrator salona može mijenjati ovu preferencu.",
    emailRequired: "Klijent mora imati email adresu prije dopuštanja marketinškog emaila.",
    history: "Povijest preference",
    noHistory: "Još nema zabilježenih izričitih promjena preference.",
    source: "Izvor",
    changed: "Promijenjeno",
    sources: {
      manual: "Osoblje salona",
      online_booking: "Online booking opt-in",
      unsubscribe: "Unsubscribe link",
      import: "Uvoz",
      legacy: "Stari podaci",
    },
  };
}

function statusClasses(status: MarketingEmailStatus) {
  if (status === "allowed") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (status === "not_allowed") return "border-red-200 bg-red-50 text-red-800";
  return "border-app-soft bg-app-bg text-app-muted";
}

function formatDate(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(
    locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR",
    { dateStyle: "medium", timeStyle: "short" },
  ).format(new Date(value));
}

export default function MarketingPreferenceCard({
  clientId,
  locale,
  preference,
}: {
  clientId: string;
  locale: AppLocale;
  preference: ClientMarketingPreference;
}) {
  const t = copy(locale);
  const router = useRouter();
  const [status, setStatus] = useState<MarketingEmailStatus>(preference.status);
  const [savedStatus, setSavedStatus] = useState<MarketingEmailStatus>(
    preference.status,
  );
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateClientMarketingPreferenceAction({ clientId, status });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setStatus(result.status);
      setSavedStatus(result.status);
      toast.success(t.saved);
      router.refresh();
    });
  }

  const statusLabel =
    status === "allowed"
      ? t.allowed
      : status === "not_allowed"
        ? t.notAllowed
        : t.unknown;
  const help =
    status === "allowed"
      ? t.helpAllowed
      : status === "not_allowed"
        ? t.helpNotAllowed
        : t.helpUnknown;

  return (
    <section className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-app-text">{t.title}</h2>
          <p className="mt-1 text-sm leading-6 text-app-muted">{t.description}</p>
        </div>
      </div>

      <div className={`mt-5 rounded-2xl border p-4 ${statusClasses(status)}`}>
        <div className="flex items-center gap-2 font-semibold">
          {status === "allowed" ? (
            <MailCheck className="h-4 w-4" />
          ) : status === "not_allowed" ? (
            <MailX className="h-4 w-4" />
          ) : (
            <HelpCircle className="h-4 w-4" />
          )}
          {statusLabel}
        </div>
        <p className="mt-2 text-sm leading-6">{help}</p>
      </div>

      {preference.canEdit ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="block text-sm font-semibold text-app-text">
            {t.title}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as MarketingEmailStatus)}
              disabled={pending}
              className="mt-2 w-full rounded-xl border border-app-soft bg-white px-3 py-3 text-sm text-app-text outline-none focus:border-app-accent disabled:opacity-60"
            >
              <option value="unknown">{t.unknown}</option>
              <option value="allowed" disabled={!preference.hasEmail}>
                {t.allowed}
              </option>
              <option value="not_allowed">{t.notAllowed}</option>
            </select>
            {!preference.hasEmail ? (
              <span className="mt-2 block text-xs font-normal leading-5 text-amber-700">
                {t.emailRequired}
              </span>
            ) : null}
          </label>
          <button
            type="button"
            onClick={save}
            disabled={pending || status === savedStatus}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {pending ? t.saving : t.save}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs leading-5 text-app-muted">{t.adminOnly}</p>
      )}

      <div className="mt-6 border-t border-app-soft pt-5">
        <h3 className="text-sm font-bold text-app-text">{t.history}</h3>
        {preference.history.length ? (
          <div className="mt-3 space-y-2">
            {preference.history.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 rounded-xl bg-app-bg px-3 py-3 text-xs text-app-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <strong className="text-app-text">
                    {event.newStatus === "allowed"
                      ? t.allowed
                      : event.newStatus === "not_allowed"
                        ? t.notAllowed
                        : t.unknown}
                  </strong>{" "}
                  · {t.source}: {t.sources[event.source]}
                </span>
                <span className="shrink-0">
                  {t.changed}: {formatDate(event.createdAt, locale)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-app-muted">{t.noHistory}</p>
        )}
      </div>
    </section>
  );
}
