import { CheckCircle2, MailX, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { unsubscribeMarketingEmailAction } from "@/features/clients/marketing-unsubscribe-actions";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ done?: string }>;
type Locale = "hr" | "en" | "it";

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function copy(locale: Locale) {
  if (locale === "en") {
    return {
      title: "Marketing email preferences",
      description:
        "You can stop marketing and retention emails from this salon. Appointment confirmations, reminders and other service messages are not affected.",
      button: "Unsubscribe from marketing email",
      doneTitle: "You are unsubscribed",
      doneBody:
        "This salon will no longer send you marketing or retention emails through SalonFlow. Operational appointment messages remain separate.",
      invalidTitle: "This unsubscribe link is not valid",
      invalidBody:
        "The link may be incomplete or no longer available. Contact the salon if you want your communication preference changed.",
      privacy: "This link can only disable marketing email; it cannot access your salon profile or appointments.",
    };
  }
  if (locale === "it") {
    return {
      title: "Preferenze email marketing",
      description:
        "Puoi interrompere le email marketing e retention di questo salone. Conferme, promemoria e altre comunicazioni operative sugli appuntamenti non vengono modificate.",
      button: "Disiscrivimi dalle email marketing",
      doneTitle: "Disiscrizione completata",
      doneBody:
        "Questo salone non ti invierà più email marketing o retention tramite SalonFlow. Le comunicazioni operative sugli appuntamenti restano separate.",
      invalidTitle: "Questo link di disiscrizione non è valido",
      invalidBody:
        "Il link potrebbe essere incompleto o non più disponibile. Contatta il salone per modificare la preferenza di comunicazione.",
      privacy: "Questo link può soltanto disattivare le email marketing; non consente accesso al profilo o agli appuntamenti.",
    };
  }
  return {
    title: "Preference marketinških emailova",
    description:
      "Ovdje možeš zaustaviti marketinške i retention emailove ovog salona. Potvrde termina, podsjetnici i druge operativne poruke o terminima time se ne mijenjaju.",
    button: "Odjavi me s marketinških emailova",
    doneTitle: "Odjava je uspješna",
    doneBody:
      "Ovaj salon ti više neće slati marketinške ili retention emailove kroz SalonFlow. Operativne poruke o terminima vode se odvojeno.",
    invalidTitle: "Ovaj unsubscribe link nije ispravan",
    invalidBody:
      "Link je možda nepotpun ili više nije dostupan. Obrati se salonu ako želiš promijeniti preferencu komunikacije.",
    privacy: "Ovaj link može samo isključiti marketinški email; ne daje pristup profilu ni terminima.",
  };
}

export default async function MarketingUnsubscribePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const fallback = copy("hr");

  if (!isUuid(token)) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <MailX className="h-9 w-9 text-slate-500" />
          <h1 className="mt-5 text-2xl font-bold">{fallback.invalidTitle}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{fallback.invalidBody}</p>
        </div>
      </main>
    );
  }

  const supabase = createAdminClient();
  const { data: tokenRow } = await supabase
    .from("client_marketing_unsubscribe_tokens")
    .select("organization_id, client_id")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <MailX className="h-9 w-9 text-slate-500" />
          <h1 className="mt-5 text-2xl font-bold">{fallback.invalidTitle}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{fallback.invalidBody}</p>
        </div>
      </main>
    );
  }

  const [{ data: organization }, { data: client }] = await Promise.all([
    supabase
      .from("organizations")
      .select("name, locale")
      .eq("id", tokenRow.organization_id)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("marketing_email_status")
      .eq("organization_id", tokenRow.organization_id)
      .eq("id", tokenRow.client_id)
      .maybeSingle(),
  ]);

  const locale: Locale =
    organization?.locale === "en" || organization?.locale === "it"
      ? organization.locale
      : "hr";
  const t = copy(locale);
  const isDone = done === "1" || client?.marketing_email_status === "not_allowed";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
        {isDone ? (
          <>
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            <h1 className="mt-5 text-2xl font-bold">{t.doneTitle}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t.doneBody}</p>
          </>
        ) : (
          <>
            <ShieldCheck className="h-9 w-9 text-slate-700" />
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              {organization?.name || "SalonFlow"}
            </p>
            <h1 className="mt-2 text-2xl font-bold">{t.title}</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t.description}</p>

            <form action={unsubscribeMarketingEmailAction.bind(null, token)} className="mt-6">
              <button
                type="submit"
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {t.button}
              </button>
            </form>

            <p className="mt-5 text-xs leading-5 text-slate-500">{t.privacy}</p>
          </>
        )}
      </div>
    </main>
  );
}
