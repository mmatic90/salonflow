"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import {
  createEmployeeAction,
  type EmployeeActionState,
} from "@/features/settings/actions";

const initialState: EmployeeActionState = {
  error: "",
  success: "",
  values: {
    display_name: "",
    email: "",
    phone: "",
    color_hex: "",
    password: "",
  },
};

export default function EmployeeCreateForm({ locale = "hr" }: { locale?: AppLocale }) {
  const t = getDictionary(locale).settings;
  const [state, formAction, pending] = useActionState(
    createEmployeeAction,
    initialState,
  );

  const router = useRouter();

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
    <form action={formAction} className="space-y-4">
      <input
        name="display_name"
        placeholder={t.employees.fullNamePlaceholder}
        defaultValue={state.values.display_name}
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
        required
      />

      <input
        name="email"
        type="email"
        placeholder={t.employees.emailPlaceholder}
        defaultValue={state.values.email}
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
        required
      />

      <input
        name="phone"
        placeholder={t.phone}
        defaultValue={state.values.phone}
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
      />

      <div className="space-y-2">
        <label className="block text-sm font-medium">{t.color}</label>

        <div className="flex items-center gap-3">
          <input
            name="color_hex"
            type="color"
            defaultValue={state.values.color_hex || "#C084FC"}
            className="h-12 w-16 cursor-pointer rounded-lg border border-neutral-300 bg-white p-1"
          />

          <span className="text-sm text-neutral-600">
            {t.employees.chooseColor}
          </span>
        </div>
      </div>

      <p className="text-sm text-neutral-600">
        {t.employees.accountHint}
      </p>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? t.employees.adding : t.employees.add}
        </button>
      </div>
    </form>
  );
}
