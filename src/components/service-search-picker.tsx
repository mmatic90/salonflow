"use client";

import { Check, Clock3, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { AppLocale } from "@/lib/i18n";

export type ServiceSearchOption = {
  id: string;
  label: string;
  durationMinutes: number;
  category: string | null;
};

type Props = {
  locale: AppLocale;
  services: ServiceSearchOption[];
  value: string;
  onChange: (serviceId: string) => void;
  name?: string;
  required?: boolean;
};

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      placeholder: "Search service...",
      noResults: "No services match your search.",
      other: "Other",
      clear: "Clear service",
    };
  }
  if (locale === "it") {
    return {
      placeholder: "Cerca servizio...",
      noResults: "Nessun servizio corrisponde alla ricerca.",
      other: "Altro",
      clear: "Rimuovi servizio",
    };
  }
  return {
    placeholder: "Pretraži uslugu...",
    noResults: "Nema usluga koje odgovaraju pretrazi.",
    other: "Ostalo",
    clear: "Očisti uslugu",
  };
}

export default function ServiceSearchPicker({
  locale,
  services,
  value,
  onChange,
  name = "service_id",
  required = false,
}: Props) {
  const t = copy(locale);
  const selected = services.find((service) => service.id === value) ?? null;
  const [query, setQuery] = useState(selected?.label ?? "");
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const rawQuery = selected && query === selected.label ? "" : query.trim();
    const normalizedQuery = rawQuery.toLocaleLowerCase(locale);
    const filtered = services.filter((service) => {
      if (!normalizedQuery) return true;
      return `${service.label} ${service.category ?? ""}`
        .toLocaleLowerCase(locale)
        .includes(normalizedQuery);
    });

    const map = new Map<string, ServiceSearchOption[]>();
    for (const service of filtered) {
      const category = service.category?.trim() || t.other;
      const current = map.get(category) ?? [];
      current.push(service);
      map.set(category, current);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, locale))
      .map(([category, items]) => ({
        category,
        items: items.sort((a, b) => a.label.localeCompare(b.label, locale)),
      }));
  }, [locale, query, selected, services, t.other]);

  function choose(service: ServiceSearchOption) {
    onChange(service.id);
    setQuery(service.label);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
        <input
          value={query}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onChange={(event) => {
            const nextQuery = event.target.value;
            setQuery(nextQuery);
            if (selected && nextQuery !== selected.label) onChange("");
            setOpen(true);
          }}
          placeholder={t.placeholder}
          autoComplete="off"
          className="w-full rounded-xl border border-app-soft bg-white py-3 pl-10 pr-11 text-app-text shadow-sm outline-none transition placeholder:text-app-muted/70 hover:border-app-accent/40 focus:border-app-accent focus:ring-4 focus:ring-app-accent/10"
        />
        {query ? (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-app-muted transition hover:bg-app-bg hover:text-app-text"
            aria-label={t.clear}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-40 mt-2 max-h-[26rem] w-full overflow-y-auto rounded-2xl border border-app-soft bg-white p-2 shadow-xl">
          {groups.length ? (
            <div className="space-y-2">
              {groups.map((group) => (
                <div key={group.category}>
                  <div className="sticky top-0 z-10 bg-white/95 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-app-muted backdrop-blur">
                    {group.category}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((service) => {
                      const active = service.id === value;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => choose(service)}
                          className={`flex w-full items-center justify-between gap-4 rounded-xl px-3 py-3 text-left transition ${
                            active
                              ? "bg-app-accent/10 text-app-text"
                              : "hover:bg-app-bg"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-app-text">
                              {service.label}
                            </p>
                            <p className="mt-1 flex items-center gap-1.5 text-xs text-app-muted">
                              <Clock3 className="h-3.5 w-3.5" />
                              {service.durationMinutes} min
                            </p>
                          </div>
                          {active ? (
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent text-white">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-3 py-5 text-center text-sm text-app-muted">
              {t.noResults}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
