"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
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

export default function ServiceEquipmentTable({
  locale = "hr",
  services,
  equipment,
  mappings,
}: Props) {
  const t = getDictionary(locale).settings;
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
          .map((mapping) => mapping.equipment_id),
      })),
    [activeServices, mappings],
  );

  const [items, setItems] = useState<EditableMapping[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

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
      const result = await bulkUpdateServiceEquipmentAction(items);
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
        <div className="text-sm text-neutral-600">
          {t.mapping.equipmentHint}{" "}
          <span className="font-medium">{t.saveChanges}</span>.
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetChanges}
            disabled={pending || !hasChanges}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            {t.reset}
          </button>

          <button
            type="button"
            onClick={saveChanges}
            disabled={pending || !hasChanges}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? t.saving : t.saveChanges}
          </button>
        </div>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-collapse">
          <thead className="bg-neutral-50">
            <tr className="text-left text-sm text-neutral-600">
              <th className="px-4 py-3 font-semibold">{t.mapping.service}</th>
              {activeEquipment.map((item) => (
                <th
                  key={item.id}
                  className="px-4 py-3 text-center font-semibold"
                >
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {activeServices.map((service) => {
              const item = items.find((row) => row.service_id === service.id);

              return (
                <tr
                  key={service.id}
                  className="border-t border-neutral-200 text-sm"
                >
                  <td className="px-4 py-4 font-medium">
                    <div className="flex flex-col gap-2">
                      <div>{service.name}</div>
                    </div>
                  </td>

                  {activeEquipment.map((equip) => {
                    const checked =
                      item?.equipment_ids.includes(equip.id) ?? false;

                    return (
                      <td key={equip.id} className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEquipment(service.id, equip.id)}
                          className="h-4 w-4"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {activeServices.map((service) => {
          const item = items.find((row) => row.service_id === service.id);

          return (
            <div
              key={service.id}
              className="rounded-2xl border border-neutral-200 p-4"
            >
              <div className="flex flex-col gap-2">
                <div className="font-medium text-neutral-900">
                  {service.name}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {activeEquipment.map((equip) => {
                  const checked =
                    item?.equipment_ids.includes(equip.id) ?? false;

                  return (
                    <label
                      key={equip.id}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2"
                    >
                      <span className="text-sm text-neutral-700">
                        {equip.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleEquipment(service.id, equip.id)}
                        className="h-4 w-4"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
