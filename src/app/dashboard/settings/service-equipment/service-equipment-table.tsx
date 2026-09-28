"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Cpu, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { bulkUpdateServiceEquipmentAction } from "@/features/settings/actions";
import type { ServiceEquipmentMappingRow } from "@/features/settings/queries";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type ServiceItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type EquipmentItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type Props = {
  locale?: AppLocale;
  services: ServiceItem[];
  equipment: EquipmentItem[];
  mappings: ServiceEquipmentMappingRow[];
};

type EditableMapping = {
  service_id: string;
  equipment_ids: string[];
};

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      search: "Search services…",
      count: "equipment selected",
      none: "No equipment required",
      empty: "No services match your search.",
      help: "Choose the equipment required by each service.",
    };
  }
  if (locale === "it") {
    return {
      search: "Cerca servizi…",
      count: "attrezzature selezionate",
      none: "Nessuna attrezzatura necessaria",
      empty: "Nessun servizio corrisponde alla ricerca.",
      help: "Scegli le attrezzature necessarie per ogni servizio.",
    };
  }
  return {
    search: "Pretraži usluge…",
    count: "odabrane opreme",
    none: "Oprema nije potrebna",
    empty: "Nema usluga koje odgovaraju pretrazi.",
    help: "Za svaku uslugu odaberi opremu koja joj je potrebna.",
  };
}

export default function ServiceEquipmentTable({
  locale = "hr",
  services,
  equipment,
  mappings,
}: Props) {
  const router = useRouter();
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
  const activeServices = useMemo(
    () => services.filter((service) => service.is_active),
    [services],
  );
  const activeEquipment = useMemo(
    () => equipment.filter((item) => item.is_active),
    [equipment],
  );
  const initialItems = useMemo<EditableMapping[]>(
    () =>
      activeServices.map((service) => ({
        service_id: service.id,
        equipment_ids: mappings
          .filter((mapping) => mapping.service_id === service.id)
          .map((mapping) => mapping.equipment_id)
          .sort(),
      })),
    [activeServices, mappings],
  );

  const [items, setItems] = useState<EditableMapping[]>(initialItems);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const normalizedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        equipment_ids: [...item.equipment_ids].sort(),
      })),
    [items],
  );
  const hasChanges =
    JSON.stringify(normalizedItems) !== JSON.stringify(initialItems);
  const filteredServices = activeServices.filter((service) =>
    service.name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)),
  );

  function toggleEquipment(serviceId: string, equipmentId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.service_id !== serviceId) return item;
        const exists = item.equipment_ids.includes(equipmentId);
        return {
          ...item,
          equipment_ids: exists
            ? item.equipment_ids.filter((id) => id !== equipmentId)
            : [...item.equipment_ids, equipmentId],
        };
      }),
    );
  }

  function resetChanges() {
    setItems(initialItems);
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateServiceEquipmentAction(normalizedItems);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-app-soft bg-app-card-alt p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-app-text">
            {t.mapping.equipmentHint}
          </p>
          <p className="mt-1 text-xs text-app-muted">{ui.help}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={resetChanges}
            disabled={pending || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> {t.reset}
          </button>
          <button
            type="button"
            onClick={saveChanges}
            disabled={pending || !hasChanges}
            className="rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {pending ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>

      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={ui.search}
          className="w-full rounded-xl border border-app-soft bg-white py-3 pl-10 pr-4 text-sm text-app-text outline-none transition focus:border-app-accent"
        />
      </label>

      {filteredServices.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {filteredServices.map((service) => {
            const item = items.find((row) => row.service_id === service.id);
            const count = item?.equipment_ids.length ?? 0;
            return (
              <section
                key={service.id}
                className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-app-text">{service.name}</h3>
                    <p className="mt-1 text-xs text-app-muted">
                      {count
                        ? `${count}/${activeEquipment.length} ${ui.count}`
                        : ui.none}
                    </p>
                  </div>
                  <Cpu className="h-5 w-5 shrink-0 text-app-muted" />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {activeEquipment.map((equip) => {
                    const checked = item?.equipment_ids.includes(equip.id) ?? false;
                    return (
                      <button
                        key={equip.id}
                        type="button"
                        onClick={() => toggleEquipment(service.id, equip.id)}
                        className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          checked
                            ? "border-app-accent/40 bg-app-accent/5"
                            : "border-app-soft bg-app-card-alt/35 hover:bg-app-card-alt"
                        }`}
                      >
                        <span className="text-sm font-medium text-app-text">
                          {equip.name}
                        </span>
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                            checked
                              ? "border-app-accent bg-app-accent text-white"
                              : "border-app-soft bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="rounded-xl bg-app-card-alt p-4 text-sm text-app-muted">
          {ui.empty}
        </p>
      )}
    </div>
  );
}
