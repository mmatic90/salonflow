"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updatePlatformSalonBillingContactAction } from "@/features/platform-admin/billing-actions";

export default function SalonBillingContactControl({
  organizationId,
  billingEmail,
}: {
  organizationId: string;
  billingEmail: string | null;
}) {
  const [email, setEmail] = useState(billingEmail ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    startTransition(async () => {
      const result = await updatePlatformSalonBillingContactAction({
        organizationId,
        billingEmail: email,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      setEmail(result.billingEmail ?? "");
      toast.success("Billing kontakt je spremljen.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <label className="block text-sm font-semibold text-slate-700">
        <span>Billing email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="billing@example.com"
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
        />
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        Administrativni kontakt za račune i pretplatu. Može biti različit od
        javnog emaila salona.
      </p>
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {pending ? "Spremanje..." : "Spremi billing email"}
      </button>
    </div>
  );
}
