"use client";

import { useMemo, useState, useTransition } from "react";
import { Clock3, Euro, RotateCcw, Search, Shapes } from "lucide-react";
import type { ServiceItem } from "@/features/settings/types";
import {
  bulkUpdateServicesAction,
  deleteServiceAction,
} from "@/features/settings/actions";
import SettingsDeleteButton from "@/components/settings-delete-button";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  services: ServiceItem[];
};

type EditableService = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number | null;
  category: string;
  is_active: boolean;
  is_online_bookable: boolean;
};

function toEditable(service: ServiceItem): EditableService {
  return {
    id: service.id,
    name: service.name,
    description: service.description ?? "",
    duration_minutes: service.duration_minutes,
    price: service.price,
    category: service.category ?? "",
    is_active: service.is_active,
    is_online_bookable: service.is_online_bookable,
  };
}

function parsePrice(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      search: "Search services...",
      all: "All categories",
      noResults: "No services match the selected filters.",
      details: "Basic details",
      availability: "Availability",
      activeHelp: "Can be used for new appointments",
      onlineHelp: "Visible in online booking",
    };
  }
  if (locale === "it") {
    return {
      search: "Cerca servizi...",
      all: "Tutte le categorie",
      noResults: "Nessun servizio corrisponde ai filtri selezionati.",
      details: "Dati principali",
      availability: "Disponibilità",
      activeHelp: "Utilizzabile per nuovi appuntamenti",
      onlineHelp: "Visibile nella prenotazione online",
    };
  }
  return {
    search: "Pretraži usluge...",
    all: "Sve kategorije",
    noResults: "Nema usluga koje odgovaraju odabranim filtrima.",
    details: "Osnovni podaci",
    availability: "Dostupnost",
    activeHelp: "Može se koristiti za nove termine",
    onlineHelp: "Vidljivo u online rezervacijama",
  };
}

function Switch({ checked, onClick }: { checked: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
        checked ? "bg-app-accent" : "bg-app-soft"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function ServicesTable({ locale = "hr", services }: Props) {
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
  const initialItems = useMemo(() => services.map(toEditable), [services]);
  const [items, setItems] = useState<EditableService[]>(initialItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(items.map((item) => item.category.trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, locale)),
    [items, locale],
  );
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (!query) return true;
      return `${item.name} ${item.category} ${item.description}`
        .toLocaleLowerCase(locale)
        .includes(query);
    });
  }, [category, items, locale, search]);

  function updateItem(
    id: string,
    field: keyof EditableService,
    value: string | number | boolean | null,
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateServicesAction(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          duration_minutes: Number(item.duration_minutes),
          price: item.price,
          category: item.category || null,
          is_active: item.is_active,
          is_online_bookable: item.is_online_bookable,
        })),
      );
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-soft bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={ui.search}
                className="w-full rounded-xl border border-app-soft bg-white py-2.5 pl-10 pr-4 text-sm text-app-text outline-none"
              />
            </label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-xl border border-app-soft bg-white px-3 py-2.5 text-sm text-app-text outline-none"
            >
              <option value="">{ui.all}</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setItems(initialItems)}
              disabled={pending || !hasChanges}
              className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> {t.reset}
            </button>
            <button
              type="button"
              onClick={saveChanges}
              disabled={pending || !hasChanges}
              className="rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {pending ? t.saving : t.saveChanges}
            </button>
          </div>
        </div>
      </div>

      {visibleItems.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleItems.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-app-soft bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
                    {service.category || ui.details}
                  </p>
                  <h3 className="mt-1 truncate text-lg font-bold text-app-text">
                    {service.name}
                  </h3>
                </div>
                <SettingsDeleteButton
                  locale={locale}
                  label={service.name}
                  onDelete={deleteServiceAction.bind(null, service.id)}
                />
              </div>

              <div className="mt-5 space-y-4">
                <label className="block space-y-1.5 text-sm font-medium text-app-text">
                  <span>{t.name}</span>
                  <input
                    value={service.name}
                    onChange={(event) => updateItem(service.id, "name", event.target.value)}
                    className="w-full rounded-xl border border-app-soft bg-white px-3.5 py-2.5 outline-none"
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium text-app-text">
                  <span>{t.descriptionLabel}</span>
                  <textarea
                    value={service.description}
                    onChange={(event) =>
                      updateItem(service.id, "description", event.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-app-soft bg-white px-3.5 py-2.5 outline-none"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1.5 text-sm font-medium text-app-text">
                    <span className="flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4 text-app-muted" /> {t.duration}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={service.duration_minutes}
                      onChange={(event) =>
                        updateItem(service.id, "duration_minutes", Number(event.target.value))
                      }
                      className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-app-text">
                    <span className="flex items-center gap-1.5">
                      <Euro className="h-4 w-4 text-app-muted" /> {t.price}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={service.price ?? ""}
                      onChange={(event) =>
                        updateItem(service.id, "price", parsePrice(event.target.value))
                      }
                      className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-app-text">
                    <span className="flex items-center gap-1.5">
                      <Shapes className="h-4 w-4 text-app-muted" /> {t.category}
                    </span>
                    <input
                      value={service.category}
                      onChange={(event) =>
                        updateItem(service.id, "category", event.target.value)
                      }
                      list="service-category-options"
                      className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-app-soft p-3.5">
                    <div>
                      <p className="text-sm font-semibold text-app-text">{t.active}</p>
                      <p className="mt-0.5 text-xs text-app-muted">{ui.activeHelp}</p>
                    </div>
                    <Switch
                      checked={service.is_active}
                      onClick={() =>
                        updateItem(service.id, "is_active", !service.is_active)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-app-soft p-3.5">
                    <div>
                      <p className="text-sm font-semibold text-app-text">{t.online}</p>
                      <p className="mt-0.5 text-xs text-app-muted">{ui.onlineHelp}</p>
                    </div>
                    <Switch
                      checked={service.is_online_bookable}
                      onClick={() =>
                        updateItem(
                          service.id,
                          "is_online_bookable",
                          !service.is_online_bookable,
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-app-soft bg-white p-8 text-center text-sm text-app-muted">
          {ui.noResults}
        </div>
      )}

      <datalist id="service-category-options">
        {categories.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
}
