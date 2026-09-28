"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  completeGuidedSetupAction,
  confirmGuidedSetupStepAction,
  dismissGuidedSetupAction,
  resetTrialDemoDataForFreshSetupAction,
} from "@/features/guided-setup/actions";
import type { GuidedSetupStepCode } from "@/features/guided-setup/queries";

export function ConfirmSetupStepButton({
  stepCode,
  disabled,
  label,
  pendingLabel,
}: {
  stepCode: GuidedSetupStepCode;
  disabled: boolean;
  label: string;
  pendingLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await confirmGuidedSetupStepAction(stepCode);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={disabled || pending}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      {pending ? pendingLabel : label}
    </button>
  );
}

export function GuidedSetupFooterActions({
  canComplete,
  laterLabel,
  completeLabel,
  workingLabel,
}: {
  canComplete: boolean;
  laterLabel: string;
  completeLabel: string;
  workingLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function continueLater() {
    startTransition(async () => {
      const result = await dismissGuidedSetupAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  function complete() {
    startTransition(async () => {
      const result = await completeGuidedSetupAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={continueLater}
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-app-soft bg-white px-5 py-3 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:opacity-50"
      >
        {pending ? workingLabel : laterLabel}
      </button>
      <button
        type="button"
        onClick={complete}
        disabled={!canComplete || pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-app-accent px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {pending ? workingLabel : completeLabel}
      </button>
    </div>
  );
}

export function FreshStartDemoDataControl({
  organizationName,
  triggerLabel,
  title,
  description,
  warning,
  inputLabel,
  cancelLabel,
  confirmLabel,
  pendingLabel,
  successLabel,
}: {
  organizationName: string;
  triggerLabel: string;
  title: string;
  description: string;
  warning: string;
  inputLabel: string;
  cancelLabel: string;
  confirmLabel: string;
  pendingLabel: string;
  successLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  const confirmed = confirmation.trim() === organizationName;

  function reset() {
    if (!confirmed) return;

    startTransition(async () => {
      const result = await resetTrialDemoDataForFreshSetupAction(confirmation);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(successLabel);
      setOpen(false);
      setConfirmation("");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        <RotateCcw className="h-4 w-4" /> {triggerLabel}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
          <Trash2 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-red-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-red-900/80">{description}</p>
          <p className="mt-3 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-red-800">
            {warning}
          </p>

          <label className="mt-4 block text-sm font-semibold text-red-950">
            {inputLabel}
            <span className="mt-1 block font-mono text-xs font-normal text-red-800">
              {organizationName}
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              disabled={pending}
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-red-200 bg-white px-3 py-2.5 text-app-text outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
            />
          </label>

          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
              }}
              disabled={pending}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-900 transition hover:bg-red-50 disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!confirmed || pending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
