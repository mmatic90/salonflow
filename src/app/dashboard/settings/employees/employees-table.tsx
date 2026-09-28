"use client";

import { useMemo, useState, useTransition } from "react";
import { KeyRound, Mail, Phone, RotateCcw, Search, UserRound, UserX } from "lucide-react";
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

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      search: "Search employees...",
      active: "Active employee",
      inactive: "Inactive",
      activeHelp: "Available in scheduling and appointments",
      noResults: "No employees match your search.",
      identity: "Profile",
    };
  }
  if (locale === "it") {
    return {
      search: "Cerca operatori...",
      active: "Operatore attivo",
      inactive: "Inattivo",
      activeHelp: "Disponibile nei turni e negli appuntamenti",
      noResults: "Nessun operatore corrisponde alla ricerca.",
      identity: "Profilo",
    };
  }
  return {
    search: "Pretraži djelatnike...",
    active: "Aktivan djelatnik",
    inactive: "Neaktivan",
    activeHelp: "Dostupan u rasporedu i terminima",
    noResults: "Nema djelatnika koji odgovaraju pretrazi.",
    identity: "Profil",
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

export default function EmployeesTable({ locale = "hr", employees }: Props) {
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
  const initialItems = useMemo(() => employees.map(toEditable), [employees]);
  const [items, setItems] = useState<EditableEmployee[]>(initialItems);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    if (!query) return items;
    return items.filter((item) =>
      `${item.display_name} ${item.email} ${item.phone}`
        .toLocaleLowerCase(locale)
        .includes(query),
    );
  }, [items, locale, search]);

  function updateItem(
    id: string,
    field: keyof EditableEmployee,
    value: string | boolean,
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
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
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-soft bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative max-w-xl flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={ui.search}
              className="w-full rounded-xl border border-app-soft bg-white py-2.5 pl-10 pr-4 text-sm text-app-text outline-none"
            />
          </label>
          <div className="flex gap-2">
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
          {visibleItems.map((employee) => (
            <article
              key={employee.id}
              className="rounded-2xl border border-app-soft bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-app-soft bg-white text-app-muted">
                    <UserRound className="h-5 w-5" />
                    <span
                      className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: employee.color || "#8A7D6F" }}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
                      {ui.identity}
                    </p>
                    <h3 className="mt-1 truncate text-lg font-bold text-app-text">
                      {employee.display_name}
                    </h3>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    employee.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-app-soft bg-app-card-alt text-app-muted"
                  }`}
                >
                  {employee.is_active ? t.active : ui.inactive}
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <label className="block space-y-1.5 text-sm font-medium text-app-text">
                  <span>{t.employees.fullName}</span>
                  <input
                    value={employee.display_name}
                    onChange={(event) =>
                      updateItem(employee.id, "display_name", event.target.value)
                    }
                    className="w-full rounded-xl border border-app-soft bg-white px-3.5 py-2.5 outline-none"
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm font-medium text-app-text">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-app-muted" /> {t.email}
                    </span>
                    <input
                      type="email"
                      value={employee.email}
                      onChange={(event) => updateItem(employee.id, "email", event.target.value)}
                      className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none"
                    />
                  </label>
                  <label className="space-y-1.5 text-sm font-medium text-app-text">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-app-muted" /> {t.phone}
                    </span>
                    <input
                      type="tel"
                      value={employee.phone}
                      onChange={(event) => updateItem(employee.id, "phone", event.target.value)}
                      className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-app-soft p-3.5">
                    <p className="text-sm font-semibold text-app-text">{t.color}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <input
                        type="color"
                        value={employee.color || "#8A7D6F"}
                        onChange={(event) => updateItem(employee.id, "color", event.target.value)}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-app-soft bg-white p-1"
                      />
                      <span className="text-xs text-app-muted">
                        {employee.color || "#8A7D6F"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-app-soft p-3.5">
                    <div>
                      <p className="text-sm font-semibold text-app-text">{ui.active}</p>
                      <p className="mt-0.5 text-xs text-app-muted">{ui.activeHelp}</p>
                    </div>
                    <Switch
                      checked={employee.is_active}
                      onClick={() =>
                        updateItem(employee.id, "is_active", !employee.is_active)
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-app-soft pt-4">
                  <button
                    type="button"
                    onClick={() => resetPassword(employee.id)}
                    disabled={pending || actionPendingId === employee.id}
                    className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-bg disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" /> {t.employees.resetPassword}
                  </button>
                  <button
                    type="button"
                    onClick={() => deactivateEmployee(employee.id)}
                    disabled={
                      pending ||
                      actionPendingId === employee.id ||
                      !employee.is_active
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <UserX className="h-4 w-4" /> {t.employees.deactivate}
                  </button>
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
    </div>
  );
}
