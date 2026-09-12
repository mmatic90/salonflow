"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw, KeyRound, UserX } from "lucide-react";
import type { EmployeeItem } from "@/features/settings/types";
import {
  bulkUpdateEmployeesAction,
  deactivateEmployeeAction,
  resetEmployeePasswordAction,
} from "@/features/settings/actions";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  employees: EmployeeItem[];
};

type EditableEmployee = {
  id: string;
  display_name: string;
  email: string;
  phone: string;
  color: string;
  is_active: boolean;
};

function toEditable(employee: EmployeeItem): EditableEmployee {
  return {
    id: employee.id,
    display_name: employee.display_name,
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    color: employee.color ?? "",
    is_active: employee.is_active,
  };
}

export default function EmployeesTable({ locale = "hr", employees }: Props) {
  const t = getDictionary(locale).settings;
  const initialItems = useMemo(() => employees.map(toEditable), [employees]);

  const [items, setItems] = useState<EditableEmployee[]>(initialItems);
  const [pending, startTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

  function updateItem(
    id: string,
    field: keyof EditableEmployee,
    value: string | boolean,
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
      const result = await bulkUpdateEmployeesAction(
        items.map((item) => ({
          ...item,
          email: item.email.trim() || null,
          phone: item.phone.trim() || null,
          color: item.color.trim() || null,
        })),
      );

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  }

  function resetPassword(employeeId: string) {
    setActionPendingId(employeeId);

    startTransition(async () => {
      const result = await resetEmployeePasswordAction(employeeId);

      if (result.ok) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      setActionPendingId(null);
    });
  }

  function deactivateEmployee(employeeId: string) {
    setActionPendingId(employeeId);

    startTransition(async () => {
      const result = await deactivateEmployeeAction(employeeId);

      if (result.ok) {
        toast.success(result.message);
        setItems((prev) =>
          prev.map((item) =>
            item.id === employeeId ? { ...item, is_active: false } : item,
          ),
        );
      } else {
        toast.error(result.message);
      }

      setActionPendingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-app-muted">
          {t.employees.editHint}{" "}
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

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-app-table-head">
            <tr className="text-left text-sm text-app-muted">
              <th className="px-4 py-3 font-semibold">{t.employees.fullName}</th>
              <th className="px-4 py-3 font-semibold">{t.email}</th>
              <th className="px-4 py-3 font-semibold">{t.phone}</th>
              <th className="px-4 py-3 font-semibold">{t.color}</th>
              <th className="px-4 py-3 font-semibold">{t.active}</th>
              <th className="px-4 py-3 font-semibold">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((employee) => (
              <tr
                key={employee.id}
                className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
              >
                <td className="px-4 py-4">
                  <input
                    value={employee.display_name}
                    onChange={(e) =>
                      updateItem(employee.id, "display_name", e.target.value)
                    }
                    className="min-w-[220px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>

                <td className="px-4 py-4">
                  <input
                    value={employee.email}
                    onChange={(e) =>
                      updateItem(employee.id, "email", e.target.value)
                    }
                    className="min-w-[240px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>

                <td className="px-4 py-4">
                  <input
                    value={employee.phone}
                    onChange={(e) =>
                      updateItem(employee.id, "phone", e.target.value)
                    }
                    className="min-w-[180px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={employee.color || "#C084FC"}
                      onChange={(e) =>
                        updateItem(employee.id, "color", e.target.value)
                      }
                      className="h-10 w-14 cursor-pointer rounded-lg border border-app-soft bg-white p-1"
                    />

                    <span className="text-xs text-app-muted">
                      {employee.color || "#C084FC"}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={employee.is_active}
                    onClick={() =>
                      updateItem(employee.id, "is_active", !employee.is_active)
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      employee.is_active ? "bg-app-accent" : "bg-app-soft"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        employee.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>

                <td className="px-4 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => resetPassword(employee.id)}
                      disabled={pending || actionPendingId === employee.id}
                      className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg disabled:opacity-50"
                    >
                      <KeyRound className="h-4 w-4" />
                      {t.employees.resetPassword}
                    </button>

                    <button
                      type="button"
                      onClick={() => deactivateEmployee(employee.id)}
                      disabled={
                        pending ||
                        actionPendingId === employee.id ||
                        !employee.is_active
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      <UserX className="h-4 w-4" />
                      {t.employees.deactivate}
                    </button>
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
