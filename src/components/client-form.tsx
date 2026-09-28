"use client";

import Link from "next/link";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { useActionState } from "react";
import type { ClientActionState } from "@/features/clients/actions";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  title: string;
  description: string;
  action: (
    state: ClientActionState,
    formData: FormData,
  ) => Promise<ClientActionState>;
  initialValues: ClientActionState["values"];
  submitLabel: string;
  backHref?: string;
  backLabel?: string;
};

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20";

export default function ClientForm({
  locale = "hr",
  title,
  description,
  action,
  initialValues,
  submitLabel,
  backHref,
  backLabel,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.clients;
  const noteLabel =
    locale === "en"
      ? "Salon note"
      : locale === "it"
        ? "Nota del salone"
        : "Napomena salona";
  const noteHelp =
    locale === "en"
      ? "General information staff should know about this client."
      : locale === "it"
        ? "Informazioni generali sul cliente utili allo staff."
        : "Opće informacije o klijentu koje osoblje treba znati.";
  const careUi = {
    title:
      locale === "en"
        ? "Care and safety"
        : locale === "it"
          ? "Cura e sicurezza"
          : "Njega i sigurnost",
    help:
      locale === "en"
        ? "Optional information relevant to treatments."
        : locale === "it"
          ? "Informazioni facoltative rilevanti per i trattamenti."
          : "Opcionalni podaci važni za sigurno i prilagođeno izvođenje tretmana.",
    saved:
      locale === "en"
        ? "Care information saved"
        : locale === "it"
          ? "Dati di cura salvati"
          : "Podaci su spremljeni",
    allergies:
      locale === "en"
        ? "Allergies and sensitivities"
        : locale === "it"
          ? "Allergie e sensibilità"
          : "Alergije i osjetljivosti",
    allergiesPlaceholder:
      locale === "en"
        ? "Example: latex, fragrance, sensitive skin..."
        : locale === "it"
          ? "Esempio: lattice, profumi, pelle sensibile..."
          : "Primjer: lateks, mirisi, osjetljiva koža...",
    contraindications:
      locale === "en"
        ? "Contraindications"
        : locale === "it"
          ? "Controindicazioni"
          : "Kontraindikacije",
    contraindicationsPlaceholder:
      locale === "en"
        ? "Known restrictions relevant to treatments..."
        : locale === "it"
          ? "Limitazioni note rilevanti per i trattamenti..."
          : "Poznata ograničenja važna za izvođenje tretmana...",
    preferences:
      locale === "en"
        ? "Treatment preferences"
        : locale === "it"
          ? "Preferenze di trattamento"
          : "Preferencije tretmana",
    preferencesPlaceholder:
      locale === "en"
        ? "Example: gentle pressure, avoid specific products..."
        : locale === "it"
          ? "Esempio: pressione delicata, evitare determinati prodotti..."
          : "Primjer: nježniji pritisak, izbjegavati određene proizvode...",
  };
  const initialState: ClientActionState = {
    error: "",
    values: initialValues,
  };

  const [state, formAction, pending] = useActionState(action, initialState);
  const hasCareData = Boolean(
    state.values.allergies_sensitivities ||
      state.values.contraindications ||
      state.values.treatment_preferences,
  );

  return (
    <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">{title}</h1>
          <p className="mt-2 text-app-muted">{description}</p>
        </div>

        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
          >
            {backLabel ?? t.back}
          </Link>
        ) : null}
      </div>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="full_name"
            className="mb-1 block text-sm font-medium text-app-text"
          >
            {t.fullName}
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={state.values.full_name}
            className={fieldClass}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="phone"
              className="mb-1 block text-sm font-medium text-app-text"
            >
              {t.phone}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={state.values.phone}
              className={fieldClass}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-app-text"
            >
              {t.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={state.values.email}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="note"
            className="mb-1 block text-sm font-medium text-app-text"
          >
            {noteLabel}
          </label>
          <textarea
            id="note"
            name="note"
            rows={3}
            defaultValue={state.values.note}
            className={fieldClass}
          />
          <p className="mt-1.5 text-xs leading-5 text-app-muted">{noteHelp}</p>
        </div>

        <details className="group overflow-hidden rounded-2xl border border-app-soft bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-app-text">{careUi.title}</p>
                  {hasCareData ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      {careUi.saved}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-app-muted">
                  {careUi.help}
                </p>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-app-muted transition group-open:rotate-180" />
          </summary>

          <div className="space-y-4 border-t border-app-soft bg-app-bg/35 px-4 py-4 sm:px-5 sm:py-5">
            <div>
              <label
                htmlFor="allergies_sensitivities"
                className="mb-1 block text-sm font-medium text-app-text"
              >
                {careUi.allergies}
              </label>
              <textarea
                id="allergies_sensitivities"
                name="allergies_sensitivities"
                rows={2}
                defaultValue={state.values.allergies_sensitivities}
                placeholder={careUi.allergiesPlaceholder}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="contraindications"
                className="mb-1 block text-sm font-medium text-app-text"
              >
                {careUi.contraindications}
              </label>
              <textarea
                id="contraindications"
                name="contraindications"
                rows={2}
                defaultValue={state.values.contraindications}
                placeholder={careUi.contraindicationsPlaceholder}
                className={fieldClass}
              />
            </div>

            <div>
              <label
                htmlFor="treatment_preferences"
                className="mb-1 block text-sm font-medium text-app-text"
              >
                {careUi.preferences}
              </label>
              <textarea
                id="treatment_preferences"
                name="treatment_preferences"
                rows={2}
                defaultValue={state.values.treatment_preferences}
                placeholder={careUi.preferencesPlaceholder}
                className={fieldClass}
              />
            </div>
          </div>
        </details>

        {state.error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-app-accent px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.saving : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
