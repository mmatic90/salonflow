"use client";

import { useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { sendReviewTestEmailAction } from "@/features/review-settings/actions";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      title: "Test the email before enabling it for clients",
      body: "Sends one real Managed Email to your signed-in account using the saved Google review link. It consumes one managed-email attempt but does not touch any appointment.",
      button: "Send test email to me",
      sending: "Sending test...",
      success: "Test review email sent to your account.",
    };
  }

  if (locale === "it") {
    return {
      title: "Prova l'email prima di attivarla per i clienti",
      body: "Invia una vera Managed Email all'account con cui hai effettuato l'accesso usando il link Google salvato. Consuma un tentativo email ma non modifica alcun appuntamento.",
      button: "Invia email di test a me",
      sending: "Invio test...",
      success: "Email di test per la recensione inviata al tuo account.",
    };
  }

  return {
    title: "Testiraj email prije slanja klijentima",
    body: "Šalje jedan stvarni Managed Email na tvoj prijavljeni račun koristeći spremljeni Google review link. Troši jedan email pokušaj iz kvote, ali ne dira nijedan termin.",
    button: "Pošalji testni email meni",
    sending: "Slanje testa...",
    success: "Testni review email poslan je na tvoj račun.",
  };
}

export default function ReviewTestEmailButton({ locale }: { locale: AppLocale }) {
  const t = copy(locale);
  const [pending, startTransition] = useTransition();

  function handleTest() {
    startTransition(async () => {
      const result = await sendReviewTestEmailAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.success);
    });
  }

  return (
    <section className="rounded-3xl border border-dashed border-app-soft bg-app-bg p-5">
      <h2 className="font-semibold text-app-text">{t.title}</h2>
      <p className="mt-1 text-sm leading-6 text-app-muted">{t.body}</p>
      <button
        type="button"
        onClick={handleTest}
        disabled={pending}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-card-alt disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {pending ? t.sending : t.button}
      </button>
    </section>
  );
}
