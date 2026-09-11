"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import type { ServiceItem } from "@/features/settings/types";
import {
  bulkUpdateServicesAction,
  deleteServiceAction,
} from "@/features/settings/actions";
import SettingsDeleteButton from "@/components/settings-delete-button";
import { toast } from "sonner";

type Props = {
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

export default function ServicesTable({ services }: Props) {
  const initialItems = useMemo(() => services.map(toEditable), [services]);
  const [items, setItems] = useState<EditableService[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

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

      result.ok ? toast.success(result.message) : toast.error(result.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-app-muted">
          Uredi podatke u tablici pa klikni{" "}
          <span className="font-medium text-app-text">Spremi izmjene</span>.
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setItems(initialItems)}
            disabled={pending || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Poništi
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={pending || !hasChanges}
            className="rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Spremanje..." : "Spremi izmjene"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-app-soft">
        <table className="min-w-full border-collapse">
          <thead className="bg-app-table-head">
            <tr className="text-left text-sm text-app-muted">
              <th className="px-4 py-3 font-semibold">Naziv</th>
              <th className="px-4 py-3 font-semibold">Opis</th>
              <th className="px-4 py-3 font-semibold">Trajanje</th>
              <th className="px-4 py-3 font-semibold">Cijena (€)</th>
              <th className="px-4 py-3 font-semibold">Kategorija</th>
              <th className="px-4 py-3 font-semibold">Aktivno</th>
              <th className="px-4 py-3 font-semibold">Online</th>
              <th className="px-4 py-3 font-semibold">Akcije</th>
            </tr>
          </thead>

          <tbody className="bg-app-card">
            {items.map((service) => (
              <tr
                key={service.id}
                className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
              >
                <td className="px-4 py-4">
                  <input
                    value={service.name}
                    onChange={(e) => updateItem(service.id, "name", e.target.value)}
                    className="w-full min-w-[220px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>
                <td className="px-4 py-4">
                  <textarea
                    value={service.description}
                    onChange={(e) =>
                      updateItem(service.id, "description", e.target.value)
                    }
                    rows={2}
                    className="w-full min-w-[260px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>
                <td className="px-4 py-4">
                  <input
                    type="number"
                    min={1}
                    value={service.duration_minutes}
                    onChange={(e) =>
                      updateItem(
                        service.id,
                        "duration_minutes",
                        Number(e.target.value),
                      )
                    }
                    className="w-28 rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>
                <td className="px-4 py-4">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={service.price ?? ""}
                    onChange={(e) =>
                      updateItem(service.id, "price", parsePrice(e.target.value))
                    }
                    className="w-28 rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>
                <td className="px-4 py-4">
                  <input
                    value={service.category}
                    onChange={(e) =>
                      updateItem(service.id, "category", e.target.value)
                    }
                    className="w-full min-w-[180px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={service.is_active}
                    onClick={() =>
                      updateItem(service.id, "is_active", !service.is_active)
                    }
                    className={\`relative inline-flex h-7 w-12 items-center rounded-full transition \${
                      service.is_active ? "bg-app-accent" : "bg-app-soft"
                    }\`}
                  >
                    <span
                      className={\`inline-block h-5 w-5 transform rounded-full bg-white shadow transition \${
                        service.is_active ? "translate-x-6" : "translate-x-1"
                      }\`}
                    />
                  </button>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={service.is_online_bookable}
                    onClick={() =>
                      updateItem(
                        service.id,
                        "is_online_bookable",
                        !service.is_online_bookable,
                      )
                    }
                    className={\`relative inline-flex h-7 w-12 items-center rounded-full transition \${
                      service.is_online_bookable
                        ? "bg-app-accent"
                        : "bg-app-soft"
                    }\`}
                  >
                    <span
                      className={\`inline-block h-5 w-5 transform rounded-full bg-white shadow transition \${
                        service.is_online_bookable
                          ? "translate-x-6"
                          : "translate-x-1"
                      }\`}
                    />
                  </button>
                </td>
                <td className="px-4 py-4">
                  <SettingsDeleteButton
                    label={service.name}
                    onDelete={deleteServiceAction.bind(null, service.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
