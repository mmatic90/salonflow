import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import DashboardSidebar from "@/components/dashboard-sidebar";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import AdminFooter from "@/components/admin-footer";
import FeedbackWidget from "@/features/feedback/components/feedback-widget";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    redirect(user ? "/onboarding" : "/login");
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <div className="lg:flex">
        <DashboardSidebar
          role={permissions.role}
          displayName={permissions.displayName}
        />

        <main className="flex min-w-0 flex-1 flex-col transition-all duration-200">
          <div className="border-b border-app-soft bg-white px-4 py-2 text-xs text-app-muted sm:px-6">
            Aktivni salon: <span className="font-semibold text-app-text">{permissions.organizationName}</span>
          </div>
          <div className="flex-1">{children}</div>
          <AdminFooter />
        </main>
      </div>

      {permissions.isSystemDeveloper && (
        <Link
          href="/dashboard/feedback"
          className="fixed bottom-20 right-5 z-40 flex items-center gap-2 rounded-full border border-app-soft bg-white px-4 py-3 text-sm font-semibold text-app-text shadow-lg transition hover:-translate-y-0.5 hover:bg-app-bg hover:shadow-xl"
          title="Pregled feedbacka"
        >
          <ClipboardList className="h-5 w-5" />
          <span className="hidden sm:inline">Pregled feedbacka</span>
        </Link>
      )}

      <FeedbackWidget />
    </div>
  );
}
