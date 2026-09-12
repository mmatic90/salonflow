import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ClientForm from "@/components/client-form";
import { createClientAction } from "@/features/clients/actions";
import { requireDashboardUser } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

export default async function NewClientPage() {
  const permissions = await requireDashboardUser();
  const t = getDictionary(permissions.organizationLocale).clients;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <ClientForm
          locale={permissions.organizationLocale}
          title={t.newTitle}
          description={t.newDescription}
          action={createClientAction}
          submitLabel={t.saveClient}
          backHref="/dashboard/clients"
          backLabel={t.back}
          initialValues={{
            full_name: "",
            phone: "",
            email: "",
            note: "",
            internal_note: "",
          }}
        />
      </div>
    </main>
  );
}
