"use client";

import { useState, useTransition } from "react";
import { Check, Clock3, Loader2, MessageCircleCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRetentionAction } from "@/features/retention/actions";
import type {
  RetentionActionCode,
  RetentionReasonCode,
} from "@/features/retention/queries";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      contacted: "Mark contacted",
      resolved: "Resolved",
      ignored: "Ignore",
      snooze: "Snooze",
      days7: "7 days",
      days14: "14 days",
      days30: "30 days",
      saving: "Saving...",
      success: {
        contacted: "Client marked as contacted.",
        resolved: "CRM signal resolved.",
        ignored: "CRM signal ignored.",
        snoozed: "CRM signal snoozed.",
      },
    };
  }

  if (locale === "it") {
    return {
      contacted: "Segna contattato",
      resolved: "Risolto",
      ignored: "Ignora",
      snooze: "Rimanda",
      days7: "7 giorni",
      days14: "14 giorni",
      days30: "30 giorni",
      saving: "Salvataggio...",
      success: {
        contacted: "Cliente segnato come contattato.",
        resolved: "Segnale CRM risolto.",
        ignored: "Segnale CRM ignorato.",
        snoozed: "Segnale CRM rimandato.",
      },
    };
  }

  return {
    contacted: "Označi kontaktiran",
    resolved: "Riješeno",
    ignored: "Ignoriraj",
    snooze: "Odgodi",
    days7: "7 dana",
    days14: "14 dana",
    days30: "30 dana",
    saving: "Spremanje...",
    success: {
      contacted: "Klijent je označen kao kontaktiran.",
      resolved: "CRM signal je riješen.",
      ignored: "CRM signal je ignoriran.",
      snoozed: "CRM signal je odgođen.",
    },
  };
}

export default function RetentionActionControls({
  locale,
  clientId,
  signalKey,
  reasonCode,
}: {
  locale: AppLocale;
  clientId: string;
  signalKey: string;
  reasonCode: RetentionReasonCode;
}) {
  const t = copy(locale);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [snoozeDays, setSnoozeDays] = useState<7 | 14 | 30>(7);

  function run(action: RetentionActionCode, days?: 7 | 14 | 30) {
    startTransition(async () => {
      const result = await createRetentionAction({
        clientId,
        signalKey,
        reasonCode,
        action,
        snoozeDays: action === "snoozed" ? days : undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(t.success[result.action]);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
      <button
        type="button"
        onClick={() => run("contacted")}
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-app-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageCircleCheck className="h-4 w-4" />
        )}
        {pending ? t.saving : t.contacted}
      </button>

      <button
        type="button"
        onClick={() => run("resolved")}
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Check className="h-4 w-4" /> {t.resolved}
      </button>

      <div className="flex min-w-0 items-stretch gap-2">
        <select
          value={snoozeDays}
          onChange={(event) =>
            setSnoozeDays(
              event.target.value === "14"
                ? 14
                : event.target.value === "30"
                  ? 30
                  : 7,
            )
          }
          disabled={pending}
          className="min-w-0 flex-1 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent disabled:opacity-60"
        >
          <option value="7">{t.days7}</option>
          <option value="14">{t.days14}</option>
          <option value="30">{t.days30}</option>
        </select>
        <button
          type="button"
          onClick={() => run("snoozed", snoozeDays)}
          disabled={pending}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Clock3 className="h-4 w-4" /> {t.snooze}
        </button>
      </div>

      <button
        type="button"
        onClick={() => run("ignored")}
        disabled={pending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-app-muted transition hover:bg-app-bg hover:text-app-text disabled:cursor-not-allowed disabled:opacity-60"
      >
        <X className="h-4 w-4" /> {t.ignored}
      </button>
    </div>
  );
}
