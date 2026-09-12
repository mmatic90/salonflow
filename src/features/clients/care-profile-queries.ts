import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";

export type ClientCareProfile = {
  allergies_sensitivities: string | null;
  contraindications: string | null;
  treatment_preferences: string | null;
};

export async function getClientCareProfile(
  clientId: string,
): Promise<ClientCareProfile | null> {
  const permissions = await getCurrentUserPermissions();
  if (!permissions) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "allergies_sensitivities, contraindications, treatment_preferences",
    )
    .eq("organization_id", permissions.organizationId)
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    console.error("getClientCareProfile failed:", error.message);
    throw new Error("Nije moguće dohvatiti podatke njege klijenta.");
  }

  if (!data) return null;

  return {
    allergies_sensitivities: data.allergies_sensitivities ?? null,
    contraindications: data.contraindications ?? null,
    treatment_preferences: data.treatment_preferences ?? null,
  };
}
