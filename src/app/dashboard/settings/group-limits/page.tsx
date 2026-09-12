import { redirect } from "next/navigation";
import { requireAdminForSettings } from "@/lib/page-guards";

export default async function SettingsGroupLimitsPage() {
  await requireAdminForSettings();
  redirect("/dashboard/settings");
}
