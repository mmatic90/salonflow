"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  completeGuidedSetupAction,
  confirmGuidedSetupStepAction,
  dismissGuidedSetupAction,
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
