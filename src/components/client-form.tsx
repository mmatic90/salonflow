"use client";

import Link from "next/link";
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
      ? "Preferences and important information staff should know."
      : locale === "it"
        ? "Preferenze e informazioni importanti che lo staff deve conoscere."
        : "Preferencije i važne informacije koje osoblje treba znati.";
  const initialState: ClientActionState = {
    error: "",
    values: initialValues,
  };

  const [state, formAction, pending] = useActionState(action, initialState);

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
            className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
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
              className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
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
              className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
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
            rows={4}
            defaultValue={state.values.note}
            className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
          />
          <p className="mt-1.5 text-xs leading-5 text-app-muted">{noteHelp}</p>
        </div>

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
