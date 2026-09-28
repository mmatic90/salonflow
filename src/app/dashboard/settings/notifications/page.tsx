import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import { requireAdminForSettings } from "@/lib/page-guards";
import { canUseCapability } from "@/lib/permissions";
import { buildCapabilityUpgradePath } from "@/lib/entitlements";
import { getEmailSettingsOverview } from "@/features/email-settings/queries";
import { getManagedEmailDefaultMonthlyLimit } from "@/lib/email/managed-email";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Email & notifications",
      description:
        "Monitor SalonFlow managed email delivery and monthly usage for this salon.",
      back: "Back to settings",
      status: "Managed email",
      active: "Active",
      paused: "Paused",
      provider: "Delivery provider",
      providerValue: "SalonFlow Managed Email",
      customProviderValue: "Custom provider",
      sender: "Sender name",
      replyTo: "Replies go to",
      usage: "Monthly usage",
      sent: "Sent",
      failed: "Failed",
      attempted: "Attempts",
      remaining: "Remaining quota",
      quotaHelp:
        "The quota protects the shared SalonFlow email infrastructure from unexpected tenant usage.",
      reminderTitle: "Included email notifications",
      reminderBody:
        "Growth includes booking acceptance/rejection emails, appointment create/change notifications and 24h appointment reminders.",
      customTitle: "Salon-owned email provider",
      customBody:
        "A salon-owned provider or sending domain is planned as a Pro option. Provider credentials are intentionally not stored until a secure secret-storage design is in place.",
    };
  }

  if (locale === "it") {
    return {
      title: "Email e notifiche",
      description:
        "Controlla l'invio delle email gestite da SalonFlow e l'utilizzo mensile del salone.",
      back: "Torna alle impostazioni",
      status: "Email gestita",
      active: "Attiva",
      paused: "In pausa",
      provider: "Provider di invio",
      providerValue: "SalonFlow Managed Email",
      customProviderValue: "Provider personalizzato",
      sender: "Nome mittente",
      replyTo: "Le risposte arrivano a",
      usage: "Utilizzo mensile",
      sent: "Inviate",
      failed: "Fallite",
      attempted: "Tentativi",
      remaining: "Quota restante",
      quotaHelp:
        "La quota protegge l'infrastruttura email condivisa di SalonFlow da utilizzi imprevisti di un singolo salone.",
      reminderTitle: "Notifiche email incluse",
      reminderBody:
        "Growth include email di accettazione/rifiuto, notifiche di creazione/modifica appuntamento e promemoria 24h.",
      customTitle: "Provider email del salone",
      customBody:
        "Un provider o dominio di invio del salone è previsto come opzione Pro. Le credenziali non vengono salvate finché non sarà disponibile un sistema sicuro per i segreti.",
    };
  }

  return {
    title: "Email i obavijesti",
    description:
      "Prati slanje upravljanih SalonFlow emailova i mjesečnu potrošnju ovog salona.",
    back: "Natrag na postavke",
    status: "Upravljani email",
    active: "Aktivno",
    paused: "Pauzirano",
    provider: "Način slanja",
    providerValue: "SalonFlow Managed Email",
    customProviderValue: "Vlastiti provider",
    sender: "Naziv pošiljatelja",
    replyTo: "Odgovori se šalju na",
    usage: "Mjesečna potrošnja",
    sent: "Poslano",
    failed: "Neuspjelo",
    attempted: "Pokušaji",
    remaining: "Preostala kvota",
    quotaHelp:
      "Kvota štiti zajedničku SalonFlow email infrastrukturu od neočekivano velike potrošnje pojedinog salona.",
    reminderTitle: "Uključene email obavijesti",
    reminderBody:
      "Growth uključuje email potvrde i odbijanja online rezervacija, obavijesti kod kreiranja i promjene termina te 24-satne podsjetnike.",
    customTitle: "Vlastiti email provider salona",
    customBody:
      "Vlastiti provider ili domena za slanje planirani su kao Pro opcija. Pristupne podatke namjerno ne spremamo dok ne uvedemo sigurno spremanje tajni.",
  };
}

export default async function EmailNotificationsSettingsPage() {
  const permissions = await requireAdminForSettings();

  if (!canUseCapability(permissions, "booking_notifications")) {
    redirect(
      buildCapabilityUpgradePath(
        "booking_notifications",
        "/dashboard/settings/notifications",
      ),
    );
  }

  const t = copy(permissions.organizationLocale);
  const overview = await getEmailSettingsOverview(permissions.organizationId);
  const defaultLimit = getManagedEmailDefaultMonthlyLimit();
  const monthlyLimit = overview.monthlyLimitOverride ?? defaultLimit;
  const remaining = Math.max(monthlyLimit - overview.attemptedCount, 0);
  const usagePercent = Math.min(
    100,
    Math.round((overview.attemptedCount / monthlyLimit) * 100),
  );

  return (
    <PageShell maxWidth="max-w-5xl">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
      >
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>

      <PageHeader title={t.title} description={t.description} />

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-app-text">{t.status}</p>
                <p className="mt-1 text-sm text-app-muted">{t.providerValue}</p>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                overview.managedEmailEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}
            >
              {overview.managedEmailEnabled ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <TriangleAlert className="h-3.5 w-3.5" />
              )}
              {overview.managedEmailEnabled ? t.active : t.paused}
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-app-bg p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted">
                {t.provider}
              </dt>
              <dd className="mt-1 font-semibold text-app-text">
                {overview.provider === "salonflow"
                  ? t.providerValue
                  : t.customProviderValue}
              </dd>
            </div>
            <div className="rounded-2xl bg-app-bg p-4">
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted">
                {t.sender}
              </dt>
              <dd className="mt-1 break-words font-semibold text-app-text">
                {overview.fromName || "SalonFlow"}
              </dd>
            </div>
            <div className="rounded-2xl bg-app-bg p-4 sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-[0.1em] text-app-muted">
                {t.replyTo}
              </dt>
              <dd className="mt-1 break-all font-semibold text-app-text">
                {overview.replyToEmail || "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-app-text">{t.usage}</p>
              <p className="mt-1 text-sm text-app-muted">
                {overview.attemptedCount} / {monthlyLimit}
              </p>
            </div>
          </div>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-app-bg">
            <div
              className="h-full rounded-full bg-app-accent transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-app-bg p-3">
              <p className="text-xs text-app-muted">{t.sent}</p>
              <p className="mt-1 text-xl font-bold text-app-text">
                {overview.sentCount}
              </p>
            </div>
            <div className="rounded-2xl bg-app-bg p-3">
              <p className="text-xs text-app-muted">{t.failed}</p>
              <p className="mt-1 text-xl font-bold text-app-text">
                {overview.failedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-app-bg p-3">
              <p className="text-xs text-app-muted">{t.attempted}</p>
              <p className="mt-1 text-xl font-bold text-app-text">
                {overview.attemptedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-app-bg p-3">
              <p className="text-xs text-app-muted">{t.remaining}</p>
              <p className="mt-1 text-xl font-bold text-app-text">{remaining}</p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-app-muted">{t.quotaHelp}</p>
        </section>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" />
            <div>
              <h2 className="font-semibold text-app-text">{t.reminderTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                {t.reminderBody}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-dashed border-app-soft bg-app-bg p-6">
          <h2 className="font-semibold text-app-text">{t.customTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-app-muted">{t.customBody}</p>
        </section>
      </div>
    </PageShell>
  );
}
