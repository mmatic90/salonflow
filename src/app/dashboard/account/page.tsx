import { requireDashboardUser } from "@/lib/page-guards";
import { createClient } from "@/lib/supabase/server";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import AccountProfileForm from "./account-profile-form";
import ChangePasswordForm from "./change-password-form";
import { getDictionary } from "@/lib/i18n";

export default async function AccountPage() {
  const permissions = await requireDashboardUser();
  const t = getDictionary(permissions.organizationLocale).account;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", permissions.userId)
    .single();

  const { data: employee } = await supabase
    .from("employees")
    .select("display_name, color_hex")
    .eq("profile_id", permissions.userId)
    .maybeSingle();

  const displayName =
    employee?.display_name || profile?.display_name || permissions.displayName;

  const email = profile?.email || permissions.email || "";

  return (
    <PageShell maxWidth="max-w-5xl">
      <PageHeader
        title={t.title}
        description={t.description}
      />

      <PageSection title={t.basicData} description={t.loginEmail + ": " + email}>
        <AccountProfileForm
          locale={permissions.organizationLocale}
          initialDisplayName={displayName}
          initialColorHex={employee?.color_hex ?? permissions.colorHex}
          canEditColor={permissions.isEmployee}
        />
      </PageSection>

      <PageSection
        title={t.changePassword}
        description={t.changePasswordDescription}
      >
        <ChangePasswordForm locale={permissions.organizationLocale} email={email} />
      </PageSection>
    </PageShell>
  );
}
