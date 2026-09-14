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

  const dictionary = getDictionary(permissions.organizationLocale);
  const canUseWaitlist = canUseCapability(permissions, "waitlist");
  const canUseReports = canUseCapability(permissions, "advanced_reports");
  const canUseAdvancedCrm = canUseCapability(permissions, "advanced_crm");
  const isTrial = permissions.organizationLifecycleStatus === "trial";
  const trialActive = isTrialEntitlementActive(
    permissions.organizationLifecycleStatus,
    permissions.organizationTrialEndsAt,
  );
  const trialEnd = permissions.organizationTrialEndsAt;
  const trialDaysLeft = getTrialDaysLeft(
    permissions.organizationLifecycleStatus,
    trialEnd,
  );

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
