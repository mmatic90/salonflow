"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { bulkUpdateEmployeeServicesAction } from "@/features/settings/actions";
import type { EmployeeServiceMappingRow } from "@/features/settings/queries";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type EmployeeItem = {
  id: string;
  display_name: string;
  is_active: boolean;
};

type ServiceItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type Props = {
  locale?: AppLocale;
  employees: EmployeeItem[];
  services: ServiceItem[];
  mappings: EmployeeServiceMappingRow[];
};

type EditableMapping = {
  employee_id: string;
  service_ids: string[];
};

export default function EmployeeServiceTable({
  locale = "hr",
  employees,
  services,
  mappings,
}: Props) {
  const t = getDictionary(locale).settings;
  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active),
    [employees],
  );

  const activeServices = useMemo(
    () => services.filter((service) => service.is_active),
    [services],
  );

  const initialItems = useMemo<EditableMapping[]>(
    () =>
      activeEmployees.map((employee) => ({
        employee_id: employee.id,
        service_ids: mappings
          .filter((mapping) => mapping.employee_id === employee.id)
          .map((mapping) => mapping.service_id),
      })),
    [activeEmployees, mappings],
  );

  const [items, setItems] = useState<EditableMapping[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

  function toggleService(employeeId: string, serviceId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.employee_id !== employeeId) return item;

        const exists = item.service_ids.includes(serviceId);

        return {
          ...item,
          service_ids: exists
            ? item.service_ids.filter((id) => id !== serviceId)
            : [...item.service_ids, serviceId],
        };
      }),
    );
  }

  function resetChanges() {
    setItems(initialItems);
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateEmployeeServicesAction(items);

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function selectAllServices(employeeId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.employee_id === employeeId
          ? {
              ...item,
              service_ids: activeServices.map((service) => service.id),
            }
          : item,
      ),
    );
  }

  function clearAllServices(employeeId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.employee_id === employeeId
          ? {
              ...item,
              service_ids: [],
            }
          : item,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-app-muted">
          {t.employeeServices.editHint}{" "}
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

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full border-collapse overflow-hidden rounded-2xl">
          <thead className="bg-app-table-head">
            <tr className="text-left text-sm text-app-muted">
              <th className="px-4 py-3 font-semibold">{t.employee}</th>
              {activeServices.map((service) => (
                <th
                  key={service.id}
                  className="px-4 py-3 text-center font-semibold"
                >
                  {service.name}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {activeEmployees.map((employee) => {
              const item = items.find((row) => row.employee_id === employee.id);

              return (
                <tr
                  key={employee.id}
                  className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
                >
                  <td className="px-4 py-4 font-medium text-app-text">
                    <div className="flex flex-col gap-2">
                      <div>{employee.display_name}</div>

                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => selectAllServices(employee.id)}
                          className="rounded-lg border border-app-soft bg-white px-2 py-1 text-app-text transition hover:bg-app-bg"
                        >
                          Sve
                        </button>

                        <button
                          type="button"
                          onClick={() => clearAllServices(employee.id)}
                          className="rounded-lg border border-app-soft bg-white px-2 py-1 text-app-text transition hover:bg-app-bg"
                        >
                          Ništa
                        </button>
                      </div>
                    </div>
                  </td>

                  {activeServices.map((service) => {
                    const checked =
                      item?.service_ids.includes(service.id) ?? false;

                    return (
                      <td key={service.id} className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            toggleService(employee.id, service.id)
                          }
                          className="h-4 w-4 accent-[var(--color-app-accent)]"
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
        {activeEmployees.map((employee) => {
          const item = items.find((row) => row.employee_id === employee.id);

          return (
            <div
              key={employee.id}
              className="rounded-2xl border border-app-soft bg-app-card p-4 shadow-sm"
            >
              <div className="flex flex-col gap-2">
                <div className="font-medium text-app-text">
                  {employee.display_name}
                </div>

                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => selectAllServices(employee.id)}
                    className="rounded-lg border border-app-soft bg-white px-2 py-1 text-app-text transition hover:bg-app-bg"
                  >
                    {t.allServices}
                  </button>

                  <button
                    type="button"
                    onClick={() => clearAllServices(employee.id)}
                    className="rounded-lg border border-app-soft bg-white px-2 py-1 text-app-text transition hover:bg-app-bg"
                  >
                    {t.removeAll}
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {activeServices.map((service) => {
                  const checked =
                    item?.service_ids.includes(service.id) ?? false;

                  return (
                    <label
                      key={service.id}
                      className="flex items-center justify-between rounded-xl border border-app-soft bg-white px-3 py-2 transition hover:bg-app-bg"
                    >
                      <span className="text-sm text-app-text">
                        {service.name}
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleService(employee.id, service.id)}
                        className="h-4 w-4 accent-[var(--color-app-accent)]"
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
