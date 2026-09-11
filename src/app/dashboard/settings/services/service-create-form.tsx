"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createServiceAction,
  type SettingsActionState,
} from "@/features/settings/actions";

const initialState: SettingsActionState = {
  error: "",
  success: "",
};

export default function ServiceCreateForm() {
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
        placeholder="Naziv usluge"
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
        required
      />
      <input
        name="duration_minutes"
        type="number"
        min={1}
        placeholder="Trajanje (min)"
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
        required
      />
      <input
        name="price"
        type="number"
        min={0}
        step="0.01"
        placeholder="Cijena (€)"
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
      />
      <input
        name="category"
        placeholder="Kategorija"
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none"
      />
      <textarea
        name="description"
        placeholder="Opis usluge"
        rows={3}
        className="rounded-xl border border-app-soft bg-white px-4 py-3 outline-none md:col-span-2"
      />

      <div className="md:col-span-2 xl:col-span-3 flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-app-accent px-5 py-3 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Dodavanje..." : "Dodaj uslugu"}
        </button>
      </div>
    </form>
  );
}
