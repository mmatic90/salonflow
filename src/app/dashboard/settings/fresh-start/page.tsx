import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { requireAdminForSettings } from "@/lib/page-guards";
import { getGuidedSetupDemoResetAvailability } from "@/features/guided-setup/queries";
import { FreshStartDemoDataControl } from "@/features/guided-setup/guided-setup-controls";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      eyebrow: "One-time fresh start",
      title: "Replace trial demo data with your real salon setup",
      description:
        "Use this only if the salon was created with seeded trial data and you now want to configure the paid account with real operational data.",
      back: "Back to settings",
      setup: "Open guided setup",
      unavailableTitle: "Fresh start is no longer available",
      unavailableDescription:
        "This option is one-time only and appears only for converted Sales Trial salons that still contain seeded demo data.",
      trigger: "Start with a clean salon",
      dangerTitle: "Permanently remove the trial demo data?",
      dangerDescription:
        "After the reset, guided setup returns to 0% so you can enter the salon's real employees, services, working hours, resources and booking configuration.",
      warning:
        "This permanently deletes appointments, clients, employees, services, rooms, equipment, waitlist entries, online booking requests and salon working hours in this salon. The organization, owner access, paid plan and billing remain intact.",
      input: "Type the salon name exactly to confirm",
      cancel: "Cancel",
      confirm: "Delete demo data and start fresh",
      pending: "Resetting...",
      success: "Demo data removed. Configure the salon with real data.",
    };
  }

  if (locale === "it") {
    return {
      eyebrow: "Nuovo inizio una tantum",
      title: "Sostituisci i dati demo della prova con i dati reali del salone",
      description:
        "Usa questa opzione solo se il salone è stato creato con dati demo durante la prova e ora vuoi configurare l'account a pagamento con dati reali.",
      back: "Torna alle impostazioni",
      setup: "Apri la configurazione guidata",
      unavailableTitle: "Il nuovo inizio non è più disponibile",
      unavailableDescription:
        "Questa opzione è utilizzabile una sola volta e compare solo per i Sales Trial convertiti che contengono ancora dati demo.",
      trigger: "Inizia con un salone vuoto",
      dangerTitle: "Eliminare definitivamente i dati demo della prova?",
      dangerDescription:
        "Dopo il reset, la configurazione guidata torna allo 0% e puoi inserire collaboratori, servizi, orari, risorse e impostazioni di prenotazione reali.",
      warning:
        "Questa operazione elimina definitivamente appuntamenti, clienti, collaboratori, servizi, stanze, attrezzature, lista d'attesa, richieste di prenotazione online e orari del salone. Organizzazione, accesso del proprietario, piano a pagamento e billing restano invariati.",
      input: "Inserisci esattamente il nome del salone per confermare",
      cancel: "Annulla",
      confirm: "Elimina i dati demo e ricomincia",
      pending: "Eliminazione...",
      success: "Dati demo eliminati. Ora configura il salone con dati reali.",
    };
  }

  return {
    eyebrow: "Jednokratni novi početak",
    title: "Zamijeni trial demo podatke pravim podacima salona",
    description:
      "Koristi ovu opciju samo ako je salon tijekom triala dobio demo podatke i sada plaćeni račun želiš postaviti za stvarni rad.",
    back: "Natrag na postavke",
    setup: "Otvori vođeno postavljanje",
    unavailableTitle: "Postavljanje ispočetka više nije dostupno",
    unavailableDescription:
      "Ova je mogućnost jednokratna i prikazuje se samo konvertiranom Sales Trial salonu koji još sadrži demo podatke.",
    trigger: "Kreni s praznim salonom",
    dangerTitle: "Trajno ukloniti trial demo podatke?",
    dangerDescription:
      "Nakon resetiranja vođeno postavljanje vraća se na 0% pa možeš unijeti stvarne djelatnike, usluge, radno vrijeme, resurse i booking postavke.",
    warning:
      "Ovo trajno briše termine, klijente, djelatnike, usluge, sobe, opremu, listu čekanja, online booking zahtjeve i radno vrijeme u ovom salonu. Organizacija, vlasnički pristup, plaćeni paket i billing ostaju sačuvani.",
    input: "Za potvrdu upiši točan naziv salona",
    cancel: "Odustani",
    confirm: "Obriši demo podatke i kreni ispočetka",
    pending: "Brisanje...",
    success: "Demo podaci su uklonjeni. Sada postavi salon s pravim podacima.",
  };
}

export default async function FreshStartPage() {
  const permissions = await requireAdminForSettings();
  const available = await getGuidedSetupDemoResetAvailability(
    permissions.organizationId,
  );
  const t = copy(permissions.organizationLocale);

  return (
    <main className="min-h-screen bg-app-bg px-4 py-6 md:p-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/dashboard/settings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </Link>

        <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
            <RotateCcw className="h-5 w-5" />
          </div>
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-app-accent">
            {t.eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-app-text">
            {t.title}
          </h1>
          <p className="mt-3 leading-7 text-app-muted">{t.description}</p>
        </section>

        {available ? (
          <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
            <FreshStartDemoDataControl
              organizationName={permissions.organizationName}
              triggerLabel={t.trigger}
              title={t.dangerTitle}
              description={t.dangerDescription}
              warning={t.warning}
              inputLabel={t.input}
              cancelLabel={t.cancel}
              confirmLabel={t.confirm}
              pendingLabel={t.pending}
              successLabel={t.success}
            />
          </section>
        ) : (
          <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-app-text">
              {t.unavailableTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-app-muted">
              {t.unavailableDescription}
            </p>
            <Link
              href="/dashboard/setup"
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white"
            >
              {t.setup}
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
