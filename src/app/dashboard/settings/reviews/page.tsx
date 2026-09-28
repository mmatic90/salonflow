import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import PageHeader from "@/components/page-header";
import PageShell from "@/components/page-shell";
import ReviewSettingsForm from "@/features/review-settings/review-settings-form";
import ReviewTestEmailButton from "@/features/review-settings/review-test-email-button";
import { getReviewSettings } from "@/features/review-settings/queries";
import { buildCapabilityUpgradePath } from "@/lib/entitlements";
import { canUseCapability } from "@/lib/permissions";
import { requireAdminForSettings } from "@/lib/page-guards";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Google review requests",
      description:
        "Automatically ask qualifying clients for a Google review after a completed appointment.",
      back: "Back to settings",
      badge: "Pro automation",
    };
  }

  if (locale === "it") {
    return {
      title: "Richieste recensioni Google",
      description:
        "Chiedi automaticamente una recensione Google ai clienti che soddisfano i requisiti dopo un appuntamento completato.",
      back: "Torna alle impostazioni",
      badge: "Automazione Pro",
    };
  }

  return {
    title: "Zahtjevi za Google recenziju",
    description:
      "Automatski zatraži Google recenziju od klijenata koji ispunjavaju uvjete nakon završenog termina.",
    back: "Natrag na postavke",
    badge: "Pro automatizacija",
  };
}

export default async function ReviewSettingsPage() {
  const permissions = await requireAdminForSettings();

  if (!canUseCapability(permissions, "review_requests")) {
    redirect(
      buildCapabilityUpgradePath(
        "review_requests",
        "/dashboard/settings/reviews",
      ),
    );
  }

  const t = copy(permissions.organizationLocale);
  const settings = await getReviewSettings(permissions.organizationId);

  return (
    <PageShell maxWidth="max-w-5xl">
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
      >
        <ArrowLeft className="h-4 w-4" /> {t.back}
      </Link>

      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-app-soft bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-app-accent">
        <Star className="h-3.5 w-3.5" /> {t.badge}
      </div>
      <PageHeader title={t.title} description={t.description} />

      <ReviewSettingsForm locale={permissions.organizationLocale} settings={settings} />
      <div className="mt-5">
        <ReviewTestEmailButton locale={permissions.organizationLocale} />
      </div>
    </PageShell>
  );
}
