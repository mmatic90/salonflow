"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ExternalLink, Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  createMissingShowcaseDemosAction,
  refreshShowcaseDemoAction,
  type ShowcaseDemoActionResult,
} from "@/features/platform-admin/showcase-demo-actions";
import type { ShowcaseDemoStatus } from "@/features/platform-admin/showcase-demo-queries";

function formatDateTime(value: string | null) {
  if (!value) return "Još nije osvježeno";
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ShowcaseDemoManager({ demos }: { demos: ShowcaseDemoStatus[] }) {
  const [isPending, startTransition] = useTransition();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [result, setResult] = useState<ShowcaseDemoActionResult | null>(null);

  function createMissing() {
    setResult(null);
    setActiveKey("create");
    startTransition(async () => {
      const response = await createMissingShowcaseDemosAction();
      setResult(response);
      setActiveKey(null);
      if (response.ok) window.location.reload();
    });
  }

  function refresh(key: string) {
    setResult(null);
    setActiveKey(key);
    startTransition(async () => {
      const response = await refreshShowcaseDemoAction(key);
      setResult(response);
      setActiveKey(null);
      if (response.ok) window.location.reload();
    });
  }

  const missingCount = demos.filter((demo) => !demo.exists).length;

  return (
    <div className="space-y-5">
      {missingCount > 0 ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-violet-950">Kreiraj stalne showcase demo salone</h2>
              <p className="mt-1 text-sm leading-6 text-violet-800">
                Nedostaje {missingCount} od 3 demo salona. Kreiranje ne šalje pozivnice i ne pokreće trial; saloni ostaju aktivni Pro tenant računi namijenjeni isključivo prodajnim demonstracijama.
              </p>
            </div>
            <button
              type="button"
              onClick={createMissing}
              disabled={isPending}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && activeKey === "create" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Kreiraj demo salone
            </button>
          </div>
        </div>
      ) : null}

      {result ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          {result.ok ? result.message : result.error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {demos.map((demo) => (
          <article
            key={demo.key}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-950">{demo.name}</h2>
                  <span className="rounded-full bg-fuchsia-100 px-2.5 py-1 text-xs font-bold text-fuchsia-800">
                    DEMO
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-600">{demo.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {demo.city} · /{demo.slug}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold uppercase text-slate-700">
                {demo.locale}
              </span>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold">
                {demo.exists ? "Aktivan Pro showcase tenant" : "Još nije kreiran"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Zadnje osvježavanje: {formatDateTime(demo.lastRefreshedAt)}
              </p>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                Osvježavanje briše samo operativne demo podatke i ponovno generira zaposlenike, usluge, klijente, povijest, buduće termine, waitlist i online booking relativno na današnji datum.
              </p>
            </div>

            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={() => refresh(demo.key)}
                disabled={isPending || !demo.exists}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending && activeKey === demo.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Osvježi demo podatke
              </button>

              {demo.organizationId ? (
                <Link
                  href={`/platform/salons/${demo.organizationId}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Upravljaj tenantom
                </Link>
              ) : null}

              {demo.exists ? (
                <Link
                  href={`/booking/${demo.slug}`}
                  target="_blank"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Otvori booking <ExternalLink className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
