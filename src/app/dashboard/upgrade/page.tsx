import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import PageShell from "@/components/page-shell";
import { requireDashboardUser } from "@/lib/page-guards";
import { canUseCapability } from "@/lib/permissions";
import {
  isSalonCapabilityCode,
  salonCapabilities,
  type SalonCapabilityCode,
} from "@/lib/entitlements";
import { salonPlans } from "@/lib/plans";
import type { AppLocale } from "@/lib/i18n";

type SearchParams = Promise<{
  capability?: string;
  returnTo?: string;
}>;

function safeReturnTo(value: string | undefined) {
  if (!value?.startsWith("/dashboard")) return "/dashboard";
  if (value.startsWith("/dashboard/upgrade")) return "/dashboard";
  return value;
}

function capabilityLabel(code: SalonCapabilityCode, locale: AppLocale) {
  const labels: Partial<Record<SalonCapabilityCode, Record<AppLocale, string>>> = {
    waitlist: {
      hr: "Lista čekanja",
      en: "Waitlist",
      it: "Lista d'attesa",
    },
    smart_waitlist: {
      hr: "Automatska lista čekanja",
      en: "Automatic waitlist matching",
      it: "Abbinamento automatico lista d'attesa",
    },
    crm_insights: {
      hr: "CRM uvidi",
      en: "CRM insights",
      it: "Analisi CRM",
    },
    attendance_insights: {
      hr: "Analiza dolaznosti",
      en: "Attendance insights",
      it: "Analisi delle presenze",
    },
    advanced_reports: {
      hr: "Napredni izvještaji",
      en: "Advanced reports",
      it: "Report avanzati",
    },
    audit_log: {
      hr: "Audit log i izvoz",
      en: "Audit log and export",
      it: "Registro attività ed esportazione",
    },
  };

  return labels[code]?.[locale] ?? salonCapabilities[code].name;
}

function ui(locale: AppLocale) {
  if (locale === "en") {
    return {
      badge: "Plan feature",
      requires: "requires",
      intro:
        "This feature is not included in the salon's current plan. Your data remains unchanged; only access to this feature is limited.",
      currentPlan: "Current plan",
      requiredPlan: "Required plan",
      trialNote:
        "Trial salons receive the full Pro entitlement set, so this screen normally appears only after the trial or on a lower active plan.",
      howToUpgrade: "How to get access",
      steps: [
        "Choose the plan that includes this feature.",
        "Until self-service billing is connected, SalonFlow administration activates the plan change.",
        "The feature becomes available immediately after activation; existing salon data remains preserved.",
      ],
      adminHelp:
        "Ask the salon owner or administrator to request a plan change from SalonFlow administration.",
      developerHelp:
        "As a Platform Admin, you can change this salon's plan directly from Platform Admin.",
      platformAdmin: "Open Platform Admin",
      dashboard: "Back to dashboard",
      included: "Available from this plan upward",
    };
  }

  if (locale === "it") {
    return {
      badge: "Funzione del piano",
      requires: "richiede",
      intro:
        "Questa funzione non è inclusa nel piano attuale del salone. I dati restano invariati; viene limitato soltanto l'accesso alla funzione.",
      currentPlan: "Piano attuale",
      requiredPlan: "Piano richiesto",
      trialNote:
        "Durante il periodo di prova il salone dispone dell'intero set Pro, quindi questa schermata appare normalmente solo dopo il trial o con un piano attivo inferiore.",
      howToUpgrade: "Come ottenere l'accesso",
      steps: [
        "Scegli il piano che include questa funzione.",
        "Finché la fatturazione self-service non è collegata, l'amministrazione SalonFlow attiva il cambio di piano.",
        "La funzione si sblocca subito dopo l'attivazione e i dati esistenti del salone restano conservati.",
      ],
      adminHelp:
        "Chiedi al proprietario o all'amministratore del salone di richiedere il cambio di piano all'amministrazione SalonFlow.",
      developerHelp:
        "Come Platform Admin puoi cambiare direttamente il piano di questo salone da Platform Admin.",
      platformAdmin: "Apri Platform Admin",
      dashboard: "Torna alla dashboard",
      included: "Disponibile da questo piano in su",
    };
  }

  return {
    badge: "Funkcija plana",
    requires: "zahtijeva",
    intro:
      "Ova funkcija nije uključena u trenutačni plan salona. Podaci ostaju nepromijenjeni; ograničen je samo pristup ovoj funkciji.",
    currentPlan: "Trenutačni plan",
    requiredPlan: "Potreban plan",
    trialNote:
      "Trial salon dobiva puni Pro entitlement, pa se ova stranica u pravilu prikazuje tek nakon triala ili na nižem aktivnom planu.",
    howToUpgrade: "Kako dobiti pristup",
    steps: [
      "Odaberite plan koji uključuje ovu funkciju.",
      "Dok self-service naplata nije spojena, promjenu plana aktivira SalonFlow administracija.",
      "Funkcija se otključava odmah nakon aktivacije, a postojeći podaci salona ostaju sačuvani.",
    ],
    adminHelp:
      "Vlasnik ili administrator salona može zatražiti promjenu plana od SalonFlow administracije.",
    developerHelp:
      "Kao Platform Admin možeš odmah promijeniti plan ovog salona u Platform Adminu.",
    platformAdmin: "Otvori Platform Admin",
    dashboard: "Natrag na dashboard",
    included: "Dostupno od ovog plana nadalje",
  };
}

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const permissions = await requireDashboardUser();
  const params = await searchParams;
  const returnTo = safeReturnTo(params.returnTo);

  if (!isSalonCapabilityCode(params.capability)) {
    redirect("/dashboard");
  }

  const capability = salonCapabilities[params.capability];

  if (canUseCapability(permissions, capability.code)) {
    redirect(returnTo);
  }

  const locale = permissions.organizationLocale;
  const t = ui(locale);
  const currentPlan = salonPlans[permissions.organizationPlanCode];
  const requiredPlan = salonPlans[capability.minimumPlan];
  const featureName = capabilityLabel(capability.code, locale);

  return (
    <PageShell maxWidth="max-w-4xl">
      <section className="overflow-hidden rounded-3xl border border-app-soft bg-white shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="bg-gradient-to-br from-white via-white to-app-bg p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-app-accent shadow-sm">
            <LockKeyhole className="h-3.5 w-3.5" /> {t.badge}
          </div>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-extrabold tracking-tight text-app-text sm:text-4xl">
                {featureName} {t.requires} {requiredPlan.name}
              </h1>
              <p className="mt-3 text-sm leading-6 text-app-muted sm:text-base">
                {t.intro}
              </p>
            </div>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
              <Sparkles className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted">
            {t.currentPlan}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-app-text">
            {currentPlan.name}
          </p>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            {currentPlan.description}
          </p>
        </div>

        <div className="rounded-3xl border border-app-accent/25 bg-app-accent/5 p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-app-accent">
            {t.requiredPlan}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-app-text">
            {requiredPlan.name}
          </p>
          <div className="mt-3 flex items-start gap-2 text-sm font-medium text-app-text">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
            <span>{t.included}</span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-app-text">{t.howToUpgrade}</h2>
        <div className="mt-4 space-y-3">
          {t.steps.map((step, index) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent/10 text-xs font-extrabold text-app-accent">
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm leading-6 text-app-text">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-app-bg p-4">
          <p className="text-sm leading-6 text-app-text">
            {permissions.isSystemDeveloper ? t.developerHelp : t.adminHelp}
          </p>
          <p className="mt-2 text-xs leading-5 text-app-muted">{t.trialNote}</p>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg"
          >
            <ArrowLeft className="h-4 w-4" /> {t.dashboard}
          </Link>
          {permissions.isSystemDeveloper ? (
            <Link
              href="/platform"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <ShieldCheck className="h-4 w-4" /> {t.platformAdmin}
            </Link>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}
