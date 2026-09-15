"use client";

import { useActionState } from "react";
import {
  createRoomAction,
  type SettingsActionState,
} from "@/features/settings/actions";
import { useEffect } from "react";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import { useRouter } from "next/navigation";

const initialState: SettingsActionState = {
  error: "",
  success: "",
};

export default function RoomCreateForm({ locale = "hr" }: { locale?: AppLocale }) {
  const t = getDictionary(locale).settings.rooms;
  const [state, formAction, pending] = useActionState(
    createRoomAction,
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
        name="name"
        placeholder={t.namePlaceholder}
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none"
        required
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? t.adding : t.add}
        </button>
      </div>
    </form>
  );
}
