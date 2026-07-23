import { createClient } from "@/lib/supabase/server";

export type OrganizationRole = "owner" | "admin" | "manager" | "employee";
export type AppRole = "admin" | "employee";

export type CurrentUserPermissions = {
  userId: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
  organizationRole: OrganizationRole;
  role: AppRole;
  employeeId: string | null;
  displayName: string;
  colorHex: string | null;
  isEmployee: boolean;
  isSystemDeveloper: boolean;
};

export async function getCurrentUserPermissions(): Promise<CurrentUserPermissions | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role, display_name, is_active, organizations(name, is_active)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) {
    return null;
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (!organization || organization.is_active === false) {
    return null;
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id, color, is_active, first_name, last_name")
    .eq("organization_id", membership.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (employee && employee.is_active === false) {
    return null;
  }

  const organizationRole = membership.role as OrganizationRole;
  const appRole: AppRole = organizationRole === "employee" ? "employee" : "admin";
  const employeeName = employee
    ? [employee.first_name, employee.last_name].filter(Boolean).join(" ")
    : null;

  return {
    userId: user.id,
    email: user.email ?? null,
    organizationId: membership.organization_id,
    organizationName: organization.name,
    organizationRole,
    role: appRole,
    employeeId: employee?.id ?? null,
    displayName:
      membership.display_name ?? employeeName ?? user.user_metadata?.display_name ?? user.email ?? "Korisnik",
    colorHex: employee?.color ?? null,
    isEmployee: Boolean(employee),
    isSystemDeveloper: organizationRole === "owner",
  };
}

export function isAdmin(role: AppRole) {
  return role === "admin";
}

export function canAccessReports(role: AppRole) {
  return role === "admin";
}

export function canAccessSettings(role: AppRole) {
  return role === "admin";
}

export function canAccessScheduleManagement(role: AppRole) {
  return role === "admin";
}
