import { notFound } from "next/navigation";
import ClientForm from "@/components/client-form";
import { getClientById } from "@/features/clients/queries";
import { getClientCareProfile } from "@/features/clients/care-profile-queries";
import { updateClientAction } from "@/features/clients/actions";
import { requireDashboardUser } from "@/lib/page-guards";
import { getDictionary } from "@/lib/i18n";

type Params = Promise<{
  id: string;
}>;

export default async function EditClientPage({ params }: { params: Params }) {
  const permissions = await requireDashboardUser();
  const t = getDictionary(permissions.organizationLocale).clients;

  const { id } = await params;
  const [client, careProfile] = await Promise.all([
    getClientById(id),
    getClientCareProfile(id),
  ]);

  if (!client) {
    notFound();
  }

  const boundAction = updateClientAction.bind(null, client.id);

  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <ClientForm
          locale={permissions.organizationLocale}
          title={t.editTitle}
          description={t.editDescription}
          action={boundAction}
          submitLabel={t.saveChanges}
          backHref={`/dashboard/clients/${client.id}`}
          backLabel={t.back}
          initialValues={{
            full_name: client.full_name,
            phone: client.phone ?? "",
            email: client.email ?? "",
            note: client.note ?? "",
            allergies_sensitivities:
              careProfile?.allergies_sensitivities ?? "",
            contraindications: careProfile?.contraindications ?? "",
            treatment_preferences: careProfile?.treatment_preferences ?? "",
          }}
        />
      </div>
    </main>
  );
}
