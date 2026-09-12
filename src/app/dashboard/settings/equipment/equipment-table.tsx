"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, RotateCcw } from "lucide-react";
import type { EquipmentItem } from "@/features/settings/types";
import {
  bulkUpdateEquipmentAction,
  deleteEquipmentAction,
} from "@/features/settings/actions";
import SettingsDeleteButton from "@/components/settings-delete-button";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  equipment: EquipmentItem[];
};

type EditableEquipment = {
  id: string;
  name: string;
  quantity_total: number;
  is_active: boolean;
};

function toEditable(item: EquipmentItem): EditableEquipment {
  return {
    id: item.id,
    name: item.name,
    quantity_total: item.quantity_total,
    is_active: item.is_active,
  };
}

export default function EquipmentTable({ locale = "hr", equipment }: Props) {
  const t = getDictionary(locale).settings;
  const initialItems = useMemo(() => equipment.map(toEditable), [equipment]);

  const [items, setItems] = useState<EditableEquipment[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

  function updateItem(
    id: string,
    field: keyof EditableEquipment,
    value: string | number | boolean,
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function resetChanges() {
    setItems(initialItems);
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateEquipmentAction(items);
      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-app-muted">
          {t.equipment.editHint}{" "}
          <span className="font-medium text-app-text">{t.saveChanges}</span>.
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetChanges}
            disabled={pending || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={pending || !hasChanges}
            className="rounded-xl bg-app-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-app-soft">
        <table className="min-w-full border-collapse">
          <thead className="bg-app-table-head">
            <tr className="text-left text-sm text-app-muted">
              <th className="px-4 py-3 font-semibold">{t.name}</th>
              <th className="px-4 py-3 font-semibold">{t.quantity}</th>
              <th className="px-4 py-3 font-semibold">{t.active}</th>
              <th className="px-4 py-3 font-semibold">{t.actions}</th>
            </tr>
          </thead>

          <tbody className="bg-app-card">
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
              >
                <td className="px-4 py-4">
                  <input
                    value={item.name}
                    onChange={(e) =>
                      updateItem(item.id, "name", e.target.value)
                    }
                    className="w-full min-w-[220px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none transition focus:border-app-accent"
                  />
                </td>

                <td className="px-4 py-4">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity_total}
                    onChange={(e) =>
                      updateItem(item.id, "quantity_total", Number(e.target.value))
                    }
                    className="w-28 rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none transition focus:border-app-accent"
                  />
                </td>

                <td className="px-4 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.is_active}
                    onClick={() =>
                      updateItem(item.id, "is_active", !item.is_active)
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      item.is_active ? "bg-app-accent" : "bg-app-soft"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        item.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-app-soft bg-white p-2 text-app-muted">
                      <Pencil className="h-4 w-4" />
                    </span>

                    <SettingsDeleteButton
                      locale={locale}
                      label={item.name}
                      onDelete={deleteEquipmentAction.bind(null, item.id)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
