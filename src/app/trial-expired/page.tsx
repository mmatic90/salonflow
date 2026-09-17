import Link from "next/link";
import { redirect } from "next/navigation";
import { Hourglass, ShieldCheck } from "lucide-react";
import LogoutButton from "@/components/logout-button";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getPlatformAdminContext } from "@/lib/platform-admin";
import { isTrialEntitlementActive } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      eyebrow: "SalonFlow trial",
      title: "Your trial has ended",
      description:
        "Access to the salon workspace and public online booking is paused. Your salon data is still safely stored. Activate a paid plan to continue using SalonFlow.",
      salon: "Salon",
      platformAdmin: "Open Platform Admin",
    };
  }

  if (locale === "it") {
    return {
      eyebrow: "Prova SalonFlow",
      title: "Il periodo di prova è terminato",
      description:
        "L'accesso all'area del salone e alla prenotazione online pubblica è sospeso. I dati del salone restano salvati. Attiva un piano a pagamento per continuare a usare SalonFlow.",
      salon: "Salone",
      platformAdmin: "Apri Platform Admin",
    };
  }

  return {
    eyebrow: "SalonFlow probno razdoblje",
    title: "Probno razdoblje je završilo",
    description:
      "Pristup radnom prostoru salona i javnim online rezervacijama je pauziran. Podaci salona ostaju sigurno sačuvani. Aktivirajte plaćeni plan za nastavak korištenja SalonFlowa.",
    salon: "Salon",
    platformAdmin: "Otvori Platform Admin",
  };
}

export default async function TrialExpiredPage() {
  const permissions = await getCurrentUserPermissions();

  if (!permissions) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/login");
  }

  const trialActive = isTrialEntitlementActive(
    permissions.organizationLifecycleStatus,
    permissions.organizationTrialEndsAt,
  );

  if (permissions.organizationLifecycleStatus !== "trial" || trialActive) {
    if (permissions.organizationLifecycleStatus === "active") {
      const supabase = await createClient();
      const { data: setupProgress, error: setupError } = await supabase
        .from("organization_setup_progress")
        .select("dismissed_at, completed_at")
        .eq("organization_id", permissions.organizationId)
        .maybeSingle();

      if (
        !setupError &&
        setupProgress &&
        !setupProgress.completed_at &&
        !setupProgress.dismissed_at
      ) {
        redirect("/dashboard/setup");
      }
    }

    redirect("/dashboard");
  }

  const platformAdmin = await getPlatformAdminContext();
  const t = copy(permissions.organizationLocale);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950"
      lang={permissions.organizationLocale}
    >
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Hourglass className="h-7 w-7" />
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          {t.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {t.description}
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t.salon}
          </p>
          <p className="mt-1 font-bold text-slate-900">
            {permissions.organizationName}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {platformAdmin ? (
            <Link
              href="/platform"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <ShieldCheck className="h-4 w-4" /> {t.platformAdmin}
            </Link>
          ) : null}
          <LogoutButton locale={permissions.organizationLocale} />
        </div>
      </section>
    </main>
  );
}
