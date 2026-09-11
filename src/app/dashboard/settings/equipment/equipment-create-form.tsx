"use client";

import { useActionState } from "react";
import {
  createEquipmentAction,
  type SettingsActionState,
} from "@/features/settings/actions";
import { useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const initialState: SettingsActionState = {
  error: "",
  success: "",
};

export default function EquipmentCreateForm() {
  const [state, formAction, pending] = useActionState(
    createEquipmentAction,
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
    <form action={formAction} className="grid gap-4 md:grid-cols-2">
      <input
        name="name"
        placeholder="Naziv opreme"
        className="rounded-xl border border-neutral-300 px-4 py-3 outline-none"
        required
      />
      <input
        name="quantity_total"
        type="number"
        min={1}
        placeholder="Količina"
        className="rounded-xl border border-neutral-300 px-4 py-3 outline-none"
        required
      />

      <div className="md:col-span-2 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Dodavanje..." : "Dodaj opremu"}
        </button>
      </div>
    </form>
  );
}
