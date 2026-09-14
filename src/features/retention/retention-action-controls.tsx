"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Clock3,
  Loader2,
  MailPlus,
  MessageCircleCheck,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createRetentionAction } from "@/features/retention/actions";
import { sendRetentionFollowupEmailAction } from "@/features/retention/followup-actions";
import type {
  RetentionActionCode,
  RetentionReasonCode,
} from "@/features/retention/queries";
import type { AppLocale } from "@/lib/i18n";

type PendingOperation = RetentionActionCode | "followup" | null;

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      followup: "Send follow-up email",
      sending: "Sending email...",
      followupSuccess: "Follow-up email sent and client marked as contacted.",
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
      followup: "Invia email di follow-up",
      sending: "Invio email...",
      followupSuccess: "Email di follow-up inviata e cliente segnato come contattato.",
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
    followup: "Pošalji follow-up email",
    sending: "Slanje emaila...",
    followupSuccess: "Follow-up email je poslan i klijent označen kao kontaktiran.",
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
  const [operation, setOperation] = useState<PendingOperation>(null);
  const [snoozeDays, setSnoozeDays] = useState<7 | 14 | 30>(7);

  function run(action: RetentionActionCode, days?: 7 | 14 | 30) {
    setOperation(action);
    startTransition(async () => {
      try {
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
      } finally {
        setOperation(null);
      }
    });
  }

  function sendFollowup() {
    setOperation("followup");
    startTransition(async () => {
      try {
        const result = await sendRetentionFollowupEmailAction({
          clientId,
          signalKey,
          reasonCode,
        });

        if (!result.ok) {
          toast.error(result.error);
          router.refresh();
          return;
        }

        toast.success(t.followupSuccess);
        router.refresh();
      } finally {
        setOperation(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={sendFollowup}
        disabled={pending}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-app-accent/30 bg-app-accent/10 px-3 py-2 text-sm font-semibold text-app-accent transition hover:bg-app-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && operation === "followup" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MailPlus className="h-4 w-4" />
        )}
        {pending && operation === "followup" ? t.sending : t.followup}
      </button>

      <div className="flex flex-col gap-2 xl:flex-row xl:flex-wrap xl:items-center">
        <button
          type="button"
          onClick={() => run("contacted")}
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-app-accent px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && operation === "contacted" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MessageCircleCheck className="h-4 w-4" />
          )}
          {pending && operation === "contacted" ? t.saving : t.contacted}
        </button>

        <button
          type="button"
          onClick={() => run("resolved")}
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && operation === "resolved" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {pending && operation === "resolved" ? t.saving : t.resolved}
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
            {pending && operation === "snoozed" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock3 className="h-4 w-4" />
            )}
            {pending && operation === "snoozed" ? t.saving : t.snooze}
          </button>
        </div>

        <button
          type="button"
          onClick={() => run("ignored")}
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-app-muted transition hover:bg-app-bg hover:text-app-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending && operation === "ignored" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
          {pending && operation === "ignored" ? t.saving : t.ignored}
        </button>
      </div>
    </div>
  );
}
