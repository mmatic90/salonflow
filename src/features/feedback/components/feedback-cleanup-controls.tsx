"use client";

import { useTransition } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cleanupOldFeedback } from "@/features/feedback/actions";
import { getDictionary, type AppLocale } from "@/lib/i18n";

export default function FeedbackCleanupControls({ locale = "hr", candidateCount }: { locale?: AppLocale; candidateCount: number }) {
  const t = getDictionary(locale).developerFeedback;
  const [isPending, startTransition] = useTransition();

  function handleCleanup() {
    const confirmed = window.confirm(
      `${t.cleanupConfirmPrefix} ${candidateCount} ${t.cleanupConfirmSuffix}`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await cleanupOldFeedback();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.deletedCount
          ? `${t.cleanupDeleted} ${result.deletedCount}.`
          : t.cleanupNone,
      );
      window.location.reload();
    });
  }

  return (
    <button
      type="button"
      onClick={handleCleanup}
      disabled={isPending || candidateCount === 0}
      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {isPending ? t.cleaning : t.cleanupButton + " (" + candidateCount + ")"}
    </button>
  );
}
