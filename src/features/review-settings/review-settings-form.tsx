"use client";

import { useState, useTransition } from "react";
import { ExternalLink, Loader2, Save, Star } from "lucide-react";
import { toast } from "sonner";
import ToggleSwitch from "@/components/toggle-switch";
import { updateReviewSettingsAction } from "@/features/review-settings/actions";
import type { ReviewSettings } from "@/features/review-settings/queries";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      enabled: "Automatic review requests",
      enabledHelp:
        "When enabled, qualifying completed appointments receive one Google review request by email.",
      url: "Google review link",
      urlPlaceholder: "https://g.page/r/.../review",
      urlHelp:
        "Use the direct Google review link for this salon. The link is stored separately for each salon and is never shared with another tenant.",
      delay: "Earliest send time",
      twoHours: "At least 2 hours after the appointment ends",
      day: "At least 24 hours after the appointment ends",
      safety: "No retroactive sending",
      safetyBody:
        "Only appointments ending after the automation was enabled are eligible. Existing historical visits are not contacted. The background process sends at the first hourly run after the selected delay has elapsed.",
      save: "Save review automation",
      saving: "Saving...",
      saved: "Review automation settings saved.",
      preview: "Open review link",
    };
  }

  if (locale === "it") {
    return {
      enabled: "Richieste recensione automatiche",
      enabledHelp:
        "Quando è attiva, gli appuntamenti completati che soddisfano i requisiti ricevono una sola richiesta di recensione Google via email.",
      url: "Link per la recensione Google",
      urlPlaceholder: "https://g.page/r/.../review",
      urlHelp:
        "Usa il link diretto per lasciare una recensione Google a questo salone. Il link viene salvato separatamente per ogni salone.",
      delay: "Invio non prima di",
      twoHours: "Almeno 2 ore dalla fine dell'appuntamento",
      day: "Almeno 24 ore dalla fine dell'appuntamento",
      safety: "Nessun invio retroattivo",
      safetyBody:
        "Sono idonei solo gli appuntamenti che terminano dopo l'attivazione dell'automazione. Le visite storiche non vengono contattate. Il processo in background invia al primo controllo orario dopo il ritardo selezionato.",
      save: "Salva automazione recensioni",
      saving: "Salvataggio...",
      saved: "Impostazioni dell'automazione recensioni salvate.",
      preview: "Apri il link recensione",
    };
  }

  return {
    enabled: "Automatski zahtjevi za recenziju",
    enabledHelp:
      "Kad je uključeno, završeni termini koji ispunjavaju uvjete dobivaju jedan zahtjev za Google recenziju emailom.",
    url: "Google link za recenziju",
    urlPlaceholder: "https://g.page/r/.../review",
    urlHelp:
      "Koristi izravni Google link za ostavljanje recenzije ovom salonu. Link se sprema odvojeno za svaki salon.",
    delay: "Najranije pošalji",
    twoHours: "Najranije 2 sata nakon završetka termina",
    day: "Najranije 24 sata nakon završetka termina",
    safety: "Bez retroaktivnog slanja",
    safetyBody:
      "Uvjet ispunjavaju samo termini koji završavaju nakon uključivanja automatizacije. Stare posjete neće dobiti poruku. Pozadinski proces provjerava stanje jednom na sat i šalje pri prvom pokretanju nakon isteka odabrane odgode.",
    save: "Spremi automatizaciju recenzija",
    saving: "Spremanje...",
    saved: "Postavke automatizacije recenzija su spremljene.",
    preview: "Otvori link za recenziju",
  };
}

export default function ReviewSettingsForm({
  locale,
  settings,
}: {
  locale: AppLocale;
  settings: ReviewSettings;
}) {
  const t = copy(locale);
  const [enabled, setEnabled] = useState(settings.enabled);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    settings.googleReviewUrl ?? "",
  );
  const [delayHours, setDelayHours] = useState<2 | 24>(settings.delayHours);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateReviewSettingsAction({
        enabled,
        googleReviewUrl,
        delayHours,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setEnabled(result.enabled);
      setGoogleReviewUrl(result.googleReviewUrl ?? "");
      setDelayHours(result.delayHours);
      toast.success(t.saved);
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
            <Star className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-app-text">{t.enabled}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-app-muted">
                  {t.enabledHelp}
                </p>
              </div>
              <ToggleSwitch
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={pending}
                ariaLabel={t.enabled}
              />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_260px]">
              <label className="block text-sm font-semibold text-app-text">
                {t.url}
                <input
                  type="url"
                  value={googleReviewUrl}
                  onChange={(event) => setGoogleReviewUrl(event.target.value)}
                  placeholder={t.urlPlaceholder}
                  disabled={pending}
                  className="mt-2 w-full rounded-xl border border-app-soft bg-white px-3 py-3 text-sm text-app-text outline-none transition focus:border-app-accent disabled:opacity-60"
                />
                <span className="mt-2 block text-xs font-normal leading-5 text-app-muted">
                  {t.urlHelp}
                </span>
              </label>

              <label className="block text-sm font-semibold text-app-text">
                {t.delay}
                <select
                  value={delayHours}
                  onChange={(event) =>
                    setDelayHours(event.target.value === "2" ? 2 : 24)
                  }
                  disabled={pending}
                  className="mt-2 w-full rounded-xl border border-app-soft bg-white px-3 py-3 text-sm text-app-text outline-none transition focus:border-app-accent disabled:opacity-60"
                >
                  <option value="2">{t.twoHours}</option>
                  <option value="24">{t.day}</option>
                </select>
              </label>
            </div>

            {googleReviewUrl.trim() ? (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-app-accent hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> {t.preview}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-app-soft bg-app-bg p-5">
        <p className="font-semibold text-app-text">{t.safety}</p>
        <p className="mt-1 text-sm leading-6 text-app-muted">{t.safetyBody}</p>
      </section>

      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {pending ? t.saving : t.save}
      </button>
    </div>
  );
}
