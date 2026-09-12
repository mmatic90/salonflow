"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

export default function LogoutButton({ locale = "hr" }: { locale?: AppLocale }) {
  const router = useRouter();
  const dictionary = getDictionary(locale);
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success(dictionary.logoutSuccess);
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-app-card px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {loading ? dictionary.loggingOut : dictionary.logout}
    </button>
  );
}
