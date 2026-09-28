import Link from "next/link";
import { redirect } from "next/navigation";
import { Ban, ShieldCheck } from "lucide-react";
import LogoutButton from "@/components/logout-button";
import {
  getCurrentUserPermissions,
  getSuspendedOrganizationForCurrentUser,
} from "@/lib/permissions";
import { getPlatformAdminContext } from "@/lib/platform-admin";
import { createClient } from "@/lib/supabase/server";

function copy(locale: "hr" | "en" | "it") {
  if (locale === "en") {
    return {
      eyebrow: "SalonFlow account",
      title: "This salon is currently suspended",
      description:
        "Access to the salon workspace is temporarily disabled. Your salon data has not been deleted. Contact the person responsible for your SalonFlow account for more information.",
      salon: "Salon",
      platformAdmin: "Open Platform Admin",
    };
  }

  if (locale === "it") {
    return {
      eyebrow: "Account SalonFlow",
      title: "Questo salone è attualmente sospeso",
      description:
        "L'accesso all'area del salone è temporaneamente disabilitato. I dati del salone non sono stati eliminati. Contatta il referente del tuo account SalonFlow per maggiori informazioni.",
      salon: "Salone",
      platformAdmin: "Apri Platform Admin",
    };
  }

  return {
    eyebrow: "SalonFlow račun",
    title: "Ovaj salon je trenutačno suspendiran",
    description:
      "Pristup radnom prostoru salona privremeno je onemogućen. Podaci salona nisu obrisani. Za više informacija kontaktirajte osobu odgovornu za vaš SalonFlow račun.",
    salon: "Salon",
    platformAdmin: "Otvori Platform Admin",
  };
}

export default async function SuspendedPage() {
  const activePermissions = await getCurrentUserPermissions();
  if (activePermissions) redirect("/dashboard");

  const suspended = await getSuspendedOrganizationForCurrentUser();
  if (!suspended) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    redirect(user ? "/onboarding" : "/login");
  }

  const platformAdmin = await getPlatformAdminContext();
  const t = copy(suspended.organizationLocale);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950"
      lang={suspended.organizationLocale}
    >
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Ban className="h-7 w-7" />
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
            {suspended.organizationName}
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
          <LogoutButton locale={suspended.organizationLocale} />
        </div>
      </section>
    </main>
  );
}
