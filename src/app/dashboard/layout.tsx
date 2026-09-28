import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import {
  canUseCapability,
  getCurrentUserPermissions,
  getSuspendedOrganizationForCurrentUser,
} from "@/lib/permissions";
import {
  getTrialDaysLeft,
  isTrialEntitlementActive,
} from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import AdminFooter from "@/components/admin-footer";
import FeedbackWidget from "@/features/feedback/components/feedback-widget";
import {
  getGuidedSetupProgress,
  getGuidedSetupState,
} from "@/features/guided-setup/queries";
import { getDictionary } from "@/lib/i18n";

function trialBannerCopy(locale: "hr" | "en" | "it", daysLeft: number, endDate: string, active: boolean) {
  if (locale === "it") {
    return active
      ? `Prova Pro · ancora ${daysLeft} ${daysLeft === 1 ? "giorno" : "giorni"} · termina il ${endDate}`
      : "Il periodo di prova è terminato. Ora sono disponibili le funzionalità del piano Starter.";
  }
  if (locale === "en") {
    return active
      ? `Pro trial · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left · ends ${endDate}`
      : "Your trial has ended. Starter features are now available.";
  }
  return active
    ? `Pro probno razdoblje · još ${daysLeft} ${daysLeft === 1 ? "dan" : "dana"} · završava ${endDate}`
    : "Probno razdoblje je završilo. Trenutno su dostupne Starter funkcionalnosti.";
}

function setupBannerCopy(locale: "hr" | "en" | "it", percentage: number) {
  if (locale === "it") {
    return {
      text: `Configurazione salone ${percentage}% completata`,
      action: "Continua configurazione",
    };
  }
  if (locale === "en") {
    return {
      text: `Salon setup ${percentage}% complete`,
      action: "Continue setup",
    };
  }
  return {
    text: `Postavljanje salona ${percentage}% dovršeno`,
    action: "Nastavi postavljanje",
  };
}

function formatTrialEnd(value: string, locale: "hr" | "en" | "it") {
  const formatLocale = locale === "it" ? "it-IT" : locale === "en" ? "en-GB" : "hr-HR";
  return new Intl.DateTimeFormat(formatLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const permissions = await getCurrentUserPermissions();
  const hideFeedbackTools =
    process.env.NEXT_PUBLIC_HIDE_FEEDBACK_TOOLS === "true";

  if (!permissions) {
    const suspendedOrganization =
      await getSuspendedOrganizationForCurrentUser();

    if (suspendedOrganization) {
      redirect("/suspended");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/login");
  }

  const isTrial = permissions.organizationLifecycleStatus === "trial";
  const trialActive = isTrialEntitlementActive(
    permissions.organizationLifecycleStatus,
    permissions.organizationTrialEndsAt,
  );

  if (isTrial && !trialActive) {
    redirect("/trial-expired");
  }

  const dictionary = getDictionary(permissions.organizationLocale);
  const canUseWaitlist = canUseCapability(permissions, "waitlist");
  const canUseReports = canUseCapability(permissions, "advanced_reports");
  const canUseAdvancedCrm = canUseCapability(permissions, "advanced_crm");
  const trialEnd = permissions.organizationTrialEndsAt;
  const trialDaysLeft = getTrialDaysLeft(
    permissions.organizationLifecycleStatus,
    trialEnd,
  );

  let setupState: Awaited<ReturnType<typeof getGuidedSetupState>> | null = null;
  if (!isTrial && permissions.role === "admin") {
    try {
      const setupProgress = await getGuidedSetupProgress(
        permissions.organizationId,
      );
      if (setupProgress && !setupProgress.completedAt) {
        setupState = await getGuidedSetupState(permissions.organizationId);
      }
    } catch (error) {
      console.error("Could not load guided salon setup progress:", error);
    }
  }
  const setupBanner = setupState
    ? setupBannerCopy(permissions.organizationLocale, setupState.percentage)
    : null;

  return (
    <div
      className="min-h-screen bg-app-bg text-app-text"
      data-theme={permissions.organizationTheme}
      lang={permissions.organizationLocale}
    >
      <div className="lg:flex">
        <DashboardSidebar
          role={permissions.role}
          displayName={permissions.displayName}
          organizationName={permissions.organizationName}
          locale={permissions.organizationLocale}
          canUseWaitlist={canUseWaitlist}
          canUseReports={canUseReports}
          canUseAdvancedCrm={canUseAdvancedCrm}
          isSystemDeveloper={permissions.isSystemDeveloper}
        />

        <main className="flex min-w-0 flex-1 flex-col transition-all duration-200">
          <div className="border-b border-app-soft bg-white px-4 py-2 text-xs text-app-muted sm:px-6">
            {dictionary.activeSalon}:{" "}
            <span className="font-semibold text-app-text">
              {permissions.organizationName}
            </span>
          </div>
          {isTrial ? (
            <div
              className={`border-b px-4 py-2.5 text-sm sm:px-6 ${
                trialActive
                  ? "border-blue-200 bg-blue-50 text-blue-950"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {trialBannerCopy(
                    permissions.organizationLocale,
                    trialDaysLeft,
                    trialEnd
                      ? formatTrialEnd(trialEnd, permissions.organizationLocale)
                      : "—",
                    trialActive,
                  )}
                </span>
                {!trialActive ? (
                  <Link
                    href="/dashboard/upgrade?capability=advanced_crm&returnTo=/dashboard"
                    className="font-bold underline decoration-current/30 underline-offset-4 hover:decoration-current"
                  >
                    {permissions.organizationLocale === "it"
                      ? "Vedi Pro"
                      : permissions.organizationLocale === "en"
                        ? "View Pro"
                        : "Pogledaj Pro"}
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
          {setupState && setupBanner ? (
            <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-950 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{setupBanner.text}</span>
                    <span className="text-xs font-bold">{setupState.percentage}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-emerald-100">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${setupState.percentage}%` }}
                    />
                  </div>
                </div>
                <Link
                  href="/dashboard/setup"
                  className="shrink-0 font-bold underline decoration-current/30 underline-offset-4 hover:decoration-current"
                >
                  {setupBanner.action}
                </Link>
              </div>
            </div>
          ) : null}
          <div className="flex-1">{children}</div>
          <AdminFooter
            organizationName={permissions.organizationName}
            locale={permissions.organizationLocale}
            showFeedback={!hideFeedbackTools}
          />
        </main>
      </div>

      {!hideFeedbackTools ? (
        <FeedbackWidget
          locale={permissions.organizationLocale}
          showFloatingTrigger={false}
        />
      ) : null}
    </div>
  );
}
