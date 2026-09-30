"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Mail, Phone, Search, UsersRound } from "lucide-react";
import type { PlatformSalon } from "@/features/platform-admin/queries";
import { billingProviderLabel } from "@/lib/billing";
import { lifecycleLabel, salonPlans, type SalonLifecycleStatus } from "@/lib/plans";

type FilterKey =
  | "all"
  | "customers"
  | "demo"
  | "active"
  | "trial"
  | "solo"
  | "team"
  | "pro"
  | "past_due"
  | "suspended";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function lifecycleClasses(status: SalonLifecycleStatus) {
  switch (status) {
    case "trial":
      return "bg-blue-100 text-blue-800";
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "past_due":
      return "bg-amber-100 text-amber-800";
    case "suspended":
      return "bg-red-100 text-red-800";
  }
}

export default function PlatformSalonDirectory({
  salons,
  demoOrganizationIds,
}: {
  salons: PlatformSalon[];
  demoOrganizationIds: string[];
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const demoIds = useMemo(() => new Set(demoOrganizationIds), [demoOrganizationIds]);

  const counts = useMemo(() => {
    const customers = salons.filter((salon) => !demoIds.has(salon.id));
    return {
      all: salons.length,
      customers: customers.length,
      demo: salons.filter((salon) => demoIds.has(salon.id)).length,
      active: customers.filter((salon) => salon.lifecycleStatus === "active").length,
      trial: customers.filter((salon) => salon.lifecycleStatus === "trial").length,
      solo: customers.filter((salon) => salon.planCode === "starter").length,
      team: customers.filter((salon) => salon.planCode === "growth").length,
      pro: customers.filter((salon) => salon.planCode === "pro").length,
      past_due: customers.filter((salon) => salon.lifecycleStatus === "past_due").length,
      suspended: customers.filter((salon) => salon.lifecycleStatus === "suspended").length,
    };
  }, [demoIds, salons]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return salons.filter((salon) => {
      const isDemo = demoIds.has(salon.id);
      const matchesFilter =
        filter === "all" ||
        (filter === "customers" && !isDemo) ||
        (filter === "demo" && isDemo) ||
        (filter === "active" && !isDemo && salon.lifecycleStatus === "active") ||
        (filter === "trial" && !isDemo && salon.lifecycleStatus === "trial") ||
        (filter === "solo" && !isDemo && salon.planCode === "starter") ||
        (filter === "team" && !isDemo && salon.planCode === "growth") ||
        (filter === "pro" && !isDemo && salon.planCode === "pro") ||
        (filter === "past_due" && !isDemo && salon.lifecycleStatus === "past_due") ||
        (filter === "suspended" && !isDemo && salon.lifecycleStatus === "suspended");

      if (!matchesFilter) return false;
      if (!needle) return true;

      return [
        salon.name,
        salon.slug,
        salon.ownerName,
        salon.ownerEmail,
        salon.email,
        salon.city,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [demoIds, filter, salons, search]);

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: "all", label: "Svi", count: counts.all },
    { key: "customers", label: "Klijenti", count: counts.customers },
    { key: "demo", label: "Demo", count: counts.demo },
    { key: "active", label: "Aktivni", count: counts.active },
    { key: "trial", label: "Trial", count: counts.trial },
    { key: "solo", label: "Solo", count: counts.solo },
    { key: "team", label: "Team", count: counts.team },
    { key: "pro", label: "Pro", count: counts.pro },
    { key: "past_due", label: "Past due", count: counts.past_due },
    { key: "suspended", label: "Suspendirani", count: counts.suspended },
  ];

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="space-y-4 border-b border-slate-200 px-5 py-5 sm:px-6">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Saloni</h2>
          <p className="mt-1 text-sm text-slate-500">
            Filtriraj klijentske, trial, demo i aktivne salone ili ih pregledaj prema paketu.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                filter === item.key
                  ? "bg-slate-950 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {item.label} <span className="ml-1 opacity-70">{item.count}</span>
            </button>
          ))}
        </div>

        <label className="relative block max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pretraži naziv, vlasnika, email, grad ili slug..."
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
          />
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          Nema salona koji odgovaraju odabranom filtru.
        </div>
      ) : (
        <div className="grid gap-4 p-4 sm:p-5 xl:grid-cols-2">
          {filtered.map((salon) => {
            const isDemo = demoIds.has(salon.id);
            return (
              <article
                key={salon.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-bold text-slate-950">
                        {salon.name}
                      </h3>
                      {isDemo ? (
                        <span className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-bold text-fuchsia-800">
                          DEMO
                        </span>
                      ) : null}
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {salonPlans[salon.planCode].name}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${lifecycleClasses(
                          salon.lifecycleStatus,
                        )}`}
                      >
                        {lifecycleLabel(salon.lifecycleStatus)}
                      </span>
                      <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800">
                        {billingProviderLabel(salon.billingProvider)} billing
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      /{salon.slug} · {salon.locale.toUpperCase()} · {salon.currency}
                    </p>
                    {!isDemo && salon.lifecycleStatus === "trial" && salon.trialEndsAt ? (
                      <p className="mt-1 text-xs font-medium text-blue-700">
                        Trial do {formatDate(salon.trialEndsAt)}
                      </p>
                    ) : null}
                  </div>
                  {salon.openFeedback > 0 ? (
                    <Link
                      href="/platform/feedback"
                      className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800"
                    >
                      {salon.openFeedback} feedback
                    </Link>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Vlasnik</p>
                    <p className="mt-1 font-semibold text-slate-800">
                      {salon.ownerName || "Nije navedeno"}
                    </p>
                    <p className="mt-1 break-all text-xs text-slate-500">
                      {salon.ownerEmail || "Email nije dostupan"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Billing kontakt</p>
                    <p className="mt-1 flex items-center gap-2 text-slate-700">
                      <Mail className="h-3.5 w-3.5" /> {salon.billingEmail || salon.email || "-"}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-slate-700">
                      <Phone className="h-3.5 w-3.5" /> {salon.phone || "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <UsersRound className="h-3.5 w-3.5" /> {salon.activeMembers} aktivnih članova
                  </span>
                  <span>{[salon.city, salon.countryCode].filter(Boolean).join(", ")}</span>
                  <span>Kreiran {formatDate(salon.createdAt)}</span>
                </div>

                <Link
                  href={`/platform/salons/${salon.id}`}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                >
                  Upravljaj tenant računom <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
