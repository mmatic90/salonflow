"use client";

import { useSyncExternalStore } from "react";
import LogoutButton from "@/components/logout-button";
import type { AppLocale } from "@/lib/i18n";

function detectLocale(): AppLocale {
  if (typeof navigator === "undefined") return "hr";
  const language = navigator.language.toLowerCase();
  if (language.startsWith("it")) return "it";
  if (language.startsWith("en")) return "en";
  return "hr";
}

const subscribeToLocale = () => () => {};
const getServerLocale = (): AppLocale => "hr";

const COPY: Record<
  AppLocale,
  { eyebrow: string; title: string; description: string; help: string }
> = {
  hr: {
    eyebrow: "MiT Salon pristup",
    title: "Račun još nije povezan sa salonom",
    description:
      "Novi salon više nije moguće samostalno kreirati iz korisničkog računa. Pristup salonu dodjeljuje MiT Salon administrator kroz kontrolirani pozivni postupak.",
    help: "Ako ste očekivali pristup postojećem salonu, javite se osobi koja vam je poslala pozivnicu ili MiT Salon podršci.",
  },
  en: {
    eyebrow: "MiT Salon access",
    title: "Your account is not linked to a salon yet",
    description:
      "New salons can no longer be created directly from a user account. Salon access is provisioned by a MiT Salon administrator through the controlled invitation flow.",
    help: "If you expected access to an existing salon, contact the person who invited you or MiT Salon support.",
  },
  it: {
    eyebrow: "Accesso MiT Salon",
    title: "Il tuo account non è ancora collegato a un salone",
    description:
      "Non è più possibile creare autonomamente un nuovo salone dall'account utente. L'accesso viene assegnato da un amministratore MiT Salon tramite la procedura di invito controllata.",
    help: "Se ti aspettavi l'accesso a un salone esistente, contatta la persona che ti ha invitato o l'assistenza MiT Salon.",
  },
};

export default function OnboardingPage() {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    detectLocale,
    getServerLocale,
  );
  const copy = COPY[locale];

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-app-soft bg-app-card p-8 shadow-sm">
        <p className="text-sm font-semibold text-app-accent">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-app-text">{copy.title}</h1>
        <p className="mt-4 text-sm leading-6 text-app-muted">{copy.description}</p>
        <p className="mt-3 text-sm leading-6 text-app-muted">{copy.help}</p>
        <div className="mt-6">
          <LogoutButton locale={locale} />
        </div>
      </div>
    </main>
  );
}
