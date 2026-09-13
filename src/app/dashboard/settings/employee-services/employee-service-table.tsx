"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, RotateCcw, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
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

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      chooseEmployee: "Choose an employee",
      servicesFor: "Services for",
      search: "Search services…",
      selected: "selected",
      all: "Select all",
      none: "Clear all",
      empty: "No services match your search.",
      help: "Select the services this employee can perform.",
    };
  }

  if (locale === "it") {
    return {
      chooseEmployee: "Scegli un operatore",
      servicesFor: "Servizi per",
      search: "Cerca servizi…",
      selected: "selezionati",
      all: "Seleziona tutti",
      none: "Deseleziona tutti",
      empty: "Nessun servizio corrisponde alla ricerca.",
      help: "Seleziona i servizi che questo operatore può eseguire.",
    };
  }

  return {
    chooseEmployee: "Odaberi djelatnika",
    servicesFor: "Usluge za",
    search: "Pretraži usluge…",
    selected: "odabrano",
    all: "Odaberi sve",
    none: "Ukloni sve",
    empty: "Nema usluga koje odgovaraju pretrazi.",
    help: "Odaberi usluge koje ovaj djelatnik može raditi.",
  };
}

export default function EmployeeServiceTable({
  locale = "hr",
  employees,
  services,
  mappings,
}: Props) {
  const router = useRouter();
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
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
          .map((mapping) => mapping.service_id)
          .sort(),
      })),
    [activeEmployees, mappings],
  );

  const [items, setItems] = useState<EditableMapping[]>(initialItems);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    activeEmployees[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const normalizedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        service_ids: [...item.service_ids].sort(),
      })),
    [items],
  );
  const hasChanges =
    JSON.stringify(normalizedItems) !== JSON.stringify(initialItems);
  const selectedEmployee = activeEmployees.find(
    (employee) => employee.id === selectedEmployeeId,
  );
  const selectedItem = items.find(
    (item) => item.employee_id === selectedEmployeeId,
  );
  const filteredServices = activeServices.filter((service) =>
    service.name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)),
  );

  function toggleService(serviceId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.employee_id !== selectedEmployeeId) return item;
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
      const result = await bulkUpdateEmployeeServicesAction(normalizedItems);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  function selectAllServices() {
    setItems((prev) =>
      prev.map((item) =>
        item.employee_id === selectedEmployeeId
          ? { ...item, service_ids: activeServices.map((service) => service.id) }
          : item,
      ),
    );
  }

  function clearAllServices() {
    setItems((prev) =>
      prev.map((item) =>
        item.employee_id === selectedEmployeeId
          ? { ...item, service_ids: [] }
          : item,
      ),
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-app-soft bg-app-card-alt p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-app-text">{t.employeeServices.editHint}</p>
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

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
          {ui.chooseEmployee}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {activeEmployees.map((employee) => {
            const active = employee.id === selectedEmployeeId;
            const count =
              items.find((item) => item.employee_id === employee.id)?.service_ids
                .length ?? 0;
            return (
              <button
                key={employee.id}
                type="button"
                onClick={() => {
                  setSelectedEmployeeId(employee.id);
                  setQuery("");
                }}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-app-accent bg-app-accent/5 shadow-sm"
                    : "border-app-soft bg-white hover:bg-app-card-alt"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? "bg-app-accent text-white"
                      : "bg-app-card-alt text-app-muted"
                  }`}
                >
                  <UserRound className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-app-text">
                    {employee.display_name}
                  </span>
                  <span className="mt-0.5 block text-xs text-app-muted">
                    {count}/{activeServices.length} {ui.selected}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedEmployee ? (
        <section className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
                {ui.servicesFor}
              </p>
              <h2 className="mt-1 text-xl font-bold text-app-text">
                {selectedEmployee.display_name}
              </h2>
              <p className="mt-1 text-sm text-app-muted">
                {selectedItem?.service_ids.length ?? 0}/{activeServices.length} {ui.selected}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllServices}
                className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
              >
                {ui.all}
              </button>
              <button
                type="button"
                onClick={clearAllServices}
                className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
              >
                {ui.none}
              </button>
            </div>
          </div>

          <label className="relative mt-5 block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ui.search}
              className="w-full rounded-xl border border-app-soft bg-app-card-alt py-3 pl-10 pr-4 text-sm text-app-text outline-none transition focus:border-app-accent focus:bg-white"
            />
          </label>

          {filteredServices.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredServices.map((service) => {
                const checked =
                  selectedItem?.service_ids.includes(service.id) ?? false;
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`flex min-h-14 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
                      checked
                        ? "border-app-accent/40 bg-app-accent/5"
                        : "border-app-soft bg-white hover:bg-app-card-alt"
                    }`}
                  >
                    <span className="text-sm font-medium text-app-text">
                      {service.name}
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
          ) : (
            <p className="mt-5 rounded-xl bg-app-card-alt p-4 text-sm text-app-muted">
              {ui.empty}
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
