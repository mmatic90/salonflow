"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import {
  createServiceAction,
  type SettingsActionState,
} from "@/features/settings/actions";

const initialState: SettingsActionState = {
  error: "",
  success: "",
};

export default function ServiceCreateForm({ locale = "hr" }: { locale?: AppLocale }) {
  const t = getDictionary(locale).settings;
  const [state, formAction, pending] = useActionState(
    createServiceAction,
    initialState,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) {
      toast.success(state.success);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <input
        name="name"
        placeholder={t.services.serviceName}
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
        required
      />
      <input
        name="duration_minutes"
        type="number"
        min={1}
        placeholder={t.services.durationPlaceholder}
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
        required
      />
      <input
        name="price"
        type="number"
        min={0}
        step="0.01"
        placeholder={t.services.pricePlaceholder}
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
      />
      <input
        name="category"
        placeholder={t.services.categoryPlaceholder}
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
      />
      <textarea
        name="description"
        placeholder={t.services.descriptionPlaceholder}
        rows={3}
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none md:col-span-2"
      />

      <label className="flex items-center gap-3 rounded-xl border border-app-soft bg-app-bg/50 px-4 py-3 text-sm font-medium text-app-text">
        <input
          type="checkbox"
          name="is_online_bookable"
          className="h-4 w-4 rounded border-app-soft accent-app-accent"
        />
        {t.services.onlineBookable}
      </label>

      <div className="md:col-span-2 xl:col-span-3 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-app-accent px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? t.services.adding : t.services.add}
        </button>
      </div>
    </form>
  );
}
