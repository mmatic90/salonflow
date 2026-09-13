import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  canAccessReports,
  canAccessScheduleManagement,
  canAccessSettings,
  canUseCapability,
  getCurrentUserPermissions,
  getSuspendedOrganizationForCurrentUser,
} from "@/lib/permissions";
import {
  buildCapabilityUpgradePath,
  type SalonCapabilityCode,
} from "@/lib/entitlements";

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

export async function requireDashboardCapability(
  capabilityCode: SalonCapabilityCode,
  returnTo = "/dashboard",
) {
  const permissions = await requireDashboardUser();

  if (!canUseCapability(permissions, capabilityCode)) {
    redirect(buildCapabilityUpgradePath(capabilityCode, returnTo));
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

  if (!canUseCapability(permissions, "advanced_reports")) {
    redirect(
      buildCapabilityUpgradePath("advanced_reports", "/dashboard/reports"),
    );
  }

  return permissions;
}

export async function requireAdminForAuditLog() {
  const permissions = await requireDashboardUser();

  if (!canAccessSettings(permissions.role)) {
    redirect("/dashboard");
  }

  if (!canUseCapability(permissions, "audit_log")) {
    redirect(
      buildCapabilityUpgradePath(
        "audit_log",
        "/dashboard/settings/audit-log",
      ),
    );
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
