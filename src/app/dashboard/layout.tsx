import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardSidebar from "@/components/dashboard-sidebar";
import {
  getCurrentUserPermissions,
  getSuspendedOrganizationForCurrentUser,
} from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import AdminFooter from "@/components/admin-footer";
import FeedbackWidget from "@/features/feedback/components/feedback-widget";
import { getDictionary } from "@/lib/i18n";

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
          isSystemDeveloper={permissions.isSystemDeveloper}
        />

        <main className="flex min-w-0 flex-1 flex-col transition-all duration-200">
          <div className="border-b border-app-soft bg-white px-4 py-2 text-xs text-app-muted sm:px-6">
            {dictionary.activeSalon}:{" "}
            <span className="font-semibold text-app-text">
              {permissions.organizationName}
            </span>
          </div>
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
