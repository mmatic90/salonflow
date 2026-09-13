import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessReports,
  canAccessScheduleManagement,
  canAccessSettings,
  getCurrentUserPermissions,
  getSuspendedOrganizationForCurrentUser,
} from "@/lib/permissions";

export async function requireDashboardUser() {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    const suspendedOrganization =
      await getSuspendedOrganizationForCurrentUser();

    if (suspendedOrganization) {
      redirect("/suspended");
    }

    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return permissions;
}

export async function requireAdminForSettings() {
  const permissions = await requireDashboardUser();

  if (!canAccessSettings(permissions.role)) {
    redirect("/dashboard");
  }

  return permissions;
}

export async function requireAdminForReports() {
  const permissions = await requireDashboardUser();

  if (!canAccessReports(permissions.role)) {
    redirect("/dashboard");
  }

  return permissions;
}

export async function requireAdminForScheduleManagement() {
  const permissions = await requireDashboardUser();

  if (!canAccessScheduleManagement(permissions.role)) {
    redirect("/dashboard");
  }

  return permissions;
}
