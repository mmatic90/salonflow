"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import {
  createSalesTrialAction,
  type CreateSalesTrialResult,
} from "@/features/platform-admin/trial-actions";

export default function CreateSalesTrialForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateSalesTrialResult | null>(null);

  function submit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const response = await createSalesTrialAction({
        salonName: String(formData.get("salonName") ?? ""),
        ownerName: String(formData.get("ownerName") ?? ""),
        ownerEmail: String(formData.get("ownerEmail") ?? ""),
        locale: String(formData.get("locale") ?? "hr") as "hr" | "en" | "it",
        countryCode: String(formData.get("countryCode") ?? "HR") as "HR" | "IT",
        city: String(formData.get("city") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        seedDemoData: formData.get("seedDemoData") === "on",
      });
      setResult(response);
    });
  }

  return (
    <div className="space-y-5">
      <form action={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-semibold text-slate-800">Naziv salona</span>
            <input
              name="salonName"
              required
              minLength={2}
              maxLength={120}
              placeholder="Beauty Studio Luna"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Kontakt osoba / vlasnik</span>
            <input
              name="ownerName"
              required
              minLength={2}
              maxLength={120}
              placeholder="Martina Rossi"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Email za pristup</span>
            <input
              name="ownerEmail"
              type="email"
              required
              placeholder="martina@example.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            <span className="block text-xs leading-5 text-slate-500">
              Mora biti email koji još nema SalonFlow račun. Na njega se šalje pozivnica.
            </span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Jezik aplikacije i pozivnice</span>
            <select
              name="locale"
              defaultValue="hr"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="hr">Hrvatski</option>
              <option value="it">Italiano</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Tržište</span>
            <select
              name="countryCode"
              defaultValue="HR"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            >
              <option value="HR">Hrvatska · Europe/Zagreb</option>
              <option value="IT">Italia · Europe/Rome</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Grad (opcionalno)</span>
            <input
              name="city"
              placeholder="Rovinj / Trieste"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-slate-800">Telefon salona (opcionalno)</span>
            <input
              name="phone"
              placeholder="+385 ... / +39 ..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            name="seedDemoData"
            type="checkbox"
            defaultChecked
            className="mt-1 h-4 w-4 rounded border-slate-300"
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Sparkles className="h-4 w-4" /> Popuni realističnim demo podacima
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-600">
              Dodaje zaposlenike, usluge, klijente, termine, listu čekanja i jedan online zahtjev. Demo klijenti nemaju email adrese pa automatske poruke ne mogu otići stvarnim osobama.
            </span>
          </span>
        </label>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isPending ? "Kreiram privatni trial..." : "Kreiraj trial i pošalji pozivnicu"}
          </button>
          <span className="text-xs text-slate-500">14 dana · Pro mogućnosti · osnovni plan nakon isteka</span>
        </div>
      </form>

      {result && !result.ok ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="font-semibold">Trial nije kreiran.</div>
          <div className="mt-1">{result.error}</div>
        </div>
      ) : null}

      {result?.ok ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
          <div className="text-base font-bold">{result.salonName} je spreman za probu.</div>
          <div className="mt-2">
            {result.inviteSent
              ? "Pozivni email je poslan vlasniku salona."
              : "Salon je kreiran, ali pozivni email nije poslan."}
          </div>
          {result.warning ? <div className="mt-2 font-medium text-amber-800">{result.warning}</div> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/platform/salons/${result.organizationId}`}
              className="rounded-lg bg-emerald-950 px-3 py-2 font-semibold text-white"
            >
              Otvori salon u Platform Adminu
            </Link>
            <Link
              href={`/booking/${result.slug}`}
              target="_blank"
              className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold text-emerald-950"
            >
              Otvori javni booking
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
