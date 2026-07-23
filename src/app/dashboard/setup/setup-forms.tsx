"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FormKind = "employee" | "service" | "room";

type FormMessage = {
  type: "success" | "error";
  text: string;
} | null;

const fieldClass =
  "w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/15";
const buttonClass =
  "inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-4 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

function Message({ message }: { message: FormMessage }) {
  if (!message) return null;

  const className =
    message.type === "success"
      ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
      : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700";

  return <p className={className}>{message.text}</p>;
}

export default function SetupForms() {
  const router = useRouter();
  const [pending, setPending] = useState<FormKind | null>(null);
  const [messages, setMessages] = useState<Record<FormKind, FormMessage>>({
    employee: null,
    service: null,
    room: null,
  });

  async function submitForm(
    event: FormEvent<HTMLFormElement>,
    kind: FormKind,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload: Record<string, unknown> = { type: kind };
    formData.forEach((value, key) => {
      payload[key] = value;
    });

    if (kind === "service") {
      payload.duration_minutes = Number(payload.duration_minutes);
      payload.price = payload.price ? Number(payload.price) : null;
    }

    setPending(kind);
    setMessages((current) => ({ ...current, [kind]: null }));

    try {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || "Podatak nije moguće spremiti.");
      }

      setMessages((current) => ({
        ...current,
        [kind]: { type: "success", text: result.message || "Podatak je spremljen." },
      }));
      form.reset();
      router.refresh();
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [kind]: {
          type: "error",
          text: error instanceof Error ? error.message : "Podatak nije moguće spremiti.",
        },
      }));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        onSubmit={(event) => submitForm(event, "employee")}
        className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-app-text">Zaposlenik</h2>
          <p className="mt-1 text-sm text-app-muted">
            Dodaj osobu kojoj se mogu dodijeliti termini.
          </p>
        </div>
        <input className={fieldClass} name="first_name" placeholder="Ime" required />
        <input className={fieldClass} name="last_name" placeholder="Prezime" />
        <label className="block text-sm font-medium text-app-text">
          Boja u kalendaru
          <input
            className="mt-2 h-12 w-full rounded-xl border border-app-soft bg-white p-2"
            name="color"
            type="color"
            defaultValue="#776B5D"
          />
        </label>
        <Message message={messages.employee} />
        <button className={buttonClass} disabled={pending === "employee"} type="submit">
          {pending === "employee" ? "Spremanje..." : "Dodaj zaposlenika"}
        </button>
      </form>

      <form
        onSubmit={(event) => submitForm(event, "service")}
        className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-app-text">Usluga</h2>
          <p className="mt-1 text-sm text-app-muted">
            Dodaj naziv, trajanje i opcionalnu cijenu.
          </p>
        </div>
        <input className={fieldClass} name="name" placeholder="Naziv usluge" required />
        <input
          className={fieldClass}
          name="duration_minutes"
          type="number"
          min="1"
          step="1"
          placeholder="Trajanje u minutama"
          required
        />
        <input
          className={fieldClass}
          name="price"
          type="number"
          min="0"
          step="0.01"
          placeholder="Cijena u EUR"
        />
        <Message message={messages.service} />
        <button className={buttonClass} disabled={pending === "service"} type="submit">
          {pending === "service" ? "Spremanje..." : "Dodaj uslugu"}
        </button>
      </form>

      <form
        onSubmit={(event) => submitForm(event, "room")}
        className="space-y-4 rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-xl font-bold text-app-text">Soba</h2>
          <p className="mt-1 text-sm text-app-muted">
            Soba nije obavezna za termin, ali pomaže organizaciji.
          </p>
        </div>
        <input className={fieldClass} name="name" placeholder="Naziv sobe" required />
        <Message message={messages.room} />
        <button className={buttonClass} disabled={pending === "room"} type="submit">
          {pending === "room" ? "Spremanje..." : "Dodaj sobu"}
        </button>
      </form>
    </div>
  );
}
