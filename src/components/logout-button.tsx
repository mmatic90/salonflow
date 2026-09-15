"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

export default function LogoutButton({
  locale = "hr",
  iconOnly = false,
}: {
  locale?: AppLocale;
  iconOnly?: boolean;
}) {
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

  const label = loading ? dictionary.loggingOut : dictionary.logout;

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      title={iconOnly ? label : undefined}
      aria-label={iconOnly ? label : undefined}
      className={`inline-flex items-center justify-center rounded-xl border border-app-soft bg-app-card text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-50 ${
        iconOnly ? "h-10 w-10 p-0" : "gap-2 px-3 py-2"
      }`}
    >
      <LogOut className="h-4 w-4 shrink-0" />
      {!iconOnly ? label : null}
    </button>
  );
}
