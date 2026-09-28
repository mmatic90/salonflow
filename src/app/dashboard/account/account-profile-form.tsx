"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  updateAccountProfileAction,
  type AccountActionState,
} from "@/features/account/actions";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  initialDisplayName: string;
  initialColorHex: string | null;
  canEditColor: boolean;
};

const initialState: AccountActionState = {
  error: "",
  success: "",
};

export default function AccountProfileForm({
  locale = "hr",
  initialDisplayName,
  initialColorHex,
  canEditColor,
}: Props) {
  const t = getDictionary(locale).account;
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    updateAccountProfileAction,
    initialState,
  );

  useEffect(() => {
    if (state.error) {
      toast.error(state.error);
    }

    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <label className="mb-1 block text-sm font-medium text-app-text">
          {t.displayName}
        </label>
        <input
          name="display_name"
          defaultValue={initialDisplayName}
          className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-app-text">
          {t.employeeColor}
        </label>
        <input
          name="color_hex"
          type="color"
          defaultValue={initialColorHex || "#999999"}
          disabled={!canEditColor}
          className="h-12 w-full rounded-xl border border-app-soft bg-white px-2 py-2 outline-none disabled:bg-app-card-alt"
        />
      </div>

      <div className="flex items-end">
        {!canEditColor ? (
          <div className="text-sm text-app-muted">
            {t.noEmployeeProfile}
          </div>
        ) : null}
      </div>

      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-app-accent px-5 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? t.saving : t.saveChanges}
        </button>
      </div>
    </form>
  );
}
