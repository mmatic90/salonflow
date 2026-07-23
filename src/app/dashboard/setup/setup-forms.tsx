"use client";

import { useActionState } from "react";
import {
  createSetupEmployeeAction,
  createSetupRoomAction,
  createSetupServiceAction,
  type SetupActionState,
} from "@/features/setup/actions";

const initialState: SetupActionState = { error: "", success: "" };
const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";
const buttonClass =
  "inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

function Message({ state }: { state: SetupActionState }) {
  if (state.error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  }

  if (state.success) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        {state.success}
      </p>
    );
  }

  return null;
}

export default function SetupForms() {
  const [employeeState, employeeAction, employeePending] = useActionState(
    createSetupEmployeeAction,
    initialState,
  );
  const [serviceState, serviceAction, servicePending] = useActionState(
    createSetupServiceAction,
    initialState,
  );
  const [roomState, roomAction, roomPending] = useActionState(
    createSetupRoomAction,
    initialState,
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form action={employeeAction} className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-app-text">Zaposlenik</h2>
          <p className="mt-1 text-sm text-app-muted">Dodaj osobu kojoj se mogu dodijeliti termini.</p>
        </div>
        <input className={fieldClass} name="first_name" placeholder="Ime" required />
        <input className={fieldClass} name="last_name" placeholder="Prezime" />
        <label className="block text-sm font-medium text-app-text">
          Boja u kalendaru
          <input className="mt-2 h-12 w-full rounded-xl border border-app-soft bg-white p-2" name="color" type="color" defaultValue="#776B5D" />
        </label>
        <Message state={employeeState} />
        <button className={buttonClass} disabled={employeePending} type="submit">
          {employeePending ? "Spremanje..." : "Dodaj zaposlenika"}
        </button>
      </form>

      <form action={serviceAction} className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-app-text">Usluga</h2>
          <p className="mt-1 text-sm text-app-muted">Dodaj naziv, trajanje i opcionalnu cijenu.</p>
        </div>
        <input className={fieldClass} name="name" placeholder="Naziv usluge" required />
        <input className={fieldClass} name="duration_minutes" type="number" min="1" step="1" placeholder="Trajanje u minutama" required />
        <input className={fieldClass} name="price" type="number" min="0" step="0.01" placeholder="Cijena u EUR" />
        <Message state={serviceState} />
        <button className={buttonClass} disabled={servicePending} type="submit">
          {servicePending ? "Spremanje..." : "Dodaj uslugu"}
        </button>
      </form>

      <form action={roomAction} className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-app-text">Soba</h2>
          <p className="mt-1 text-sm text-app-muted">Soba nije obavezna za termin, ali pomaže organizaciji.</p>
        </div>
        <input className={fieldClass} name="name" placeholder="Naziv sobe" required />
        <Message state={roomState} />
        <button className={buttonClass} disabled={roomPending} type="submit">
          {roomPending ? "Spremanje..." : "Dodaj sobu"}
        </button>
      </form>
    </div>
  );
}
