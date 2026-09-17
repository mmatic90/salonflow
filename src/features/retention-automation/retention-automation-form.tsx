"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import ToggleSwitch from "@/components/toggle-switch";
import { saveRetentionAutomationSettings } from "@/features/retention-automation/actions";
import type { AppLocale } from "@/lib/i18n";

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      enabled: "Enable automatic CRM follow-up",
      enabledHelp:
        "When enabled, SalonFlow sends follow-up emails once per day to current consent-eligible CRM candidates, up to the daily limit.",
      limit: "Daily send limit",
      limitHelp:
        "Only clients with an explicit marketing-email opt-in can consume this limit.",
      save: "Save automation settings",
      saving: "Saving...",
      saved: "Retention automation settings saved.",
    };
  }

  if (locale === "it") {
    return {
      enabled: "Attiva follow-up CRM automatico",
      enabledHelp:
        "Quando è attivo, SalonFlow invia una volta al giorno email di follow-up ai candidati CRM attuali con consenso valido, fino al limite giornaliero.",
      limit: "Limite giornaliero di invio",
      limitHelp:
        "Solo i clienti con consenso esplicito alle email marketing possono consumare questo limite.",
      save: "Salva impostazioni automazione",
      saving: "Salvataggio...",
      saved: "Impostazioni automazione retention salvate.",
    };
  }

  return {
    enabled: "Uključi automatski CRM follow-up",
    enabledHelp:
      "Kad je uključeno, SalonFlow jednom dnevno šalje follow-up email aktualnim CRM kandidatima s valjanim pristankom, do dnevnog limita.",
    limit: "Dnevni limit slanja",
    limitHelp:
      "Samo klijenti s izričitim pristankom na marketinški email mogu potrošiti ovaj limit.",
    save: "Spremi postavke automatizacije",
    saving: "Spremanje...",
    saved: "Postavke retention automatizacije su spremljene.",
  };
}

export default function RetentionAutomationForm({
  locale,
  initialEnabled,
  initialDailyLimit,
}: {
  locale: AppLocale;
  initialEnabled: boolean;
  initialDailyLimit: number;
}) {
  const t = copy(locale);
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [dailyLimit, setDailyLimit] = useState(initialDailyLimit);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveRetentionAutomationSettings({
        enabled,
        dailyLimit,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(t.saved);
      router.refresh();
    });
  }

  return (
    <section className="rounded-3xl border border-app-soft bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold text-app-text">{t.enabled}</p>
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

      <div className="mt-6 max-w-sm">
        <label className="block text-sm font-semibold text-app-text" htmlFor="retention-daily-limit">
          {t.limit}
        </label>
        <select
          id="retention-daily-limit"
          value={dailyLimit}
          onChange={(event) => setDailyLimit(Number(event.target.value))}
          disabled={pending}
          className="mt-2 w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 text-sm text-app-text outline-none focus:border-app-accent disabled:opacity-60"
        >
          {[3, 5, 10, 20].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm leading-6 text-app-muted">{t.limitHelp}</p>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {pending ? t.saving : t.save}
      </button>
    </section>
  );
}
