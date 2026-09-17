"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppointmentFormService } from "@/features/appointments/queries";
import type { AppointmentServiceInput } from "@/features/appointments/types";
import { X, Plus } from "lucide-react";

type Props = {
  services: AppointmentFormService[];
  items: AppointmentServiceInput[];
  onChange: (items: AppointmentServiceInput[]) => void;
};

type GroupedServices = {
  groupName: string;
  items: AppointmentFormService[];
};

type FlatOption = {
  type: "option";
  groupName: string;
  service: AppointmentFormService;
};

function getGroupLabel(service: AppointmentFormService) {
  return service.service_group?.trim() || "Ostalo";
}

function ServiceSearchSelect({
  services,
  value,
  onSelect,
  placeholder = "Počni upisivati naziv usluge...",
}: {
  services: AppointmentFormService[];
  value: string;
  onSelect: (serviceId: string) => void;
  placeholder?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedService =
    services.find((service) => service.id === value) ?? null;
  const displayedSearch = open ? search : (selectedService?.name ?? "");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const groupedServices = useMemo<GroupedServices[]>(() => {
    const query = search.trim().toLowerCase();

    const filtered = query
      ? services.filter((service) => service.name.toLowerCase().includes(query))
      : services;

    const groups = new Map<string, AppointmentFormService[]>();

    for (const service of filtered) {
      const groupLabel = getGroupLabel(service);

      if (!groups.has(groupLabel)) {
        groups.set(groupLabel, []);
      }

      groups.get(groupLabel)!.push(service);
    }

    return Array.from(groups.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "hr"))
      .map(([groupName, items]) => ({
        groupName,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name, "hr")),
      }));
  }, [services, search]);

  const flatOptions = useMemo<FlatOption[]>(() => {
    return groupedServices.flatMap((group) =>
      group.items.map((service) => ({
        type: "option" as const,
        groupName: group.groupName,
        service,
      })),
    );
  }, [groupedServices]);

  useEffect(() => {
    if (!open || activeIndex < 0 || !listRef.current) return;

    const element = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`,
    );

    element?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex, open]);

  function openSearch() {
    setSearch(selectedService?.name ?? "");
    setOpen(true);
    setActiveIndex(0);
  }

  function handleSelect(service: AppointmentFormService) {
    onSelect(service.id);
    setSearch(service.name);
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      openSearch();
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (flatOptions.length === 0) return;

      setActiveIndex((prev) => (prev < flatOptions.length - 1 ? prev + 1 : 0));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (flatOptions.length === 0) return;

      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatOptions.length - 1));
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && flatOptions[activeIndex]) {
        event.preventDefault();
        handleSelect(flatOptions[activeIndex].service);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={displayedSearch}
        placeholder={placeholder}
        onFocus={openSearch}
        onKeyDown={handleKeyDown}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
      />

      {open ? (
        <div
          ref={listRef}
          className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-app-soft bg-white shadow-lg"
        >
          {groupedServices.length === 0 ? (
            <div className="px-4 py-3 text-sm text-app-muted">
              Nema rezultata.
            </div>
          ) : (
            (() => {
              let runningIndex = -1;

              return groupedServices.map((group) => (
                <div
                  key={group.groupName}
                  className="border-b border-app-soft last:border-b-0"
                >
                  <div className="sticky top-0 bg-app-card-alt px-4 py-2 text-xs font-semibold uppercase tracking-wide text-app-muted">
                    {group.groupName}
                  </div>

                  {group.items.map((service) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;

                    return (
                      <button
                        key={service.id}
                        type="button"
                        data-option-index={runningIndex}
                        onMouseEnter={() => setActiveIndex(runningIndex)}
                        onClick={() => handleSelect(service)}
                        className={`block w-full px-4 py-3 text-left text-sm text-app-text transition ${
                          isActive ? "bg-app-card-alt" : "hover:bg-app-card-alt"
                        }`}
                      >
                        <div className="font-medium">{service.name}</div>
                        <div className="text-xs text-app-muted">
                          {service.duration_minutes} min
                        </div>
                      </button>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function AppointmentServicesEditor({
  services,
  items,
  onChange,
}: Props) {
  function addItem() {
    onChange([
      ...items,
      {
        service_id: "",
        duration_minutes: 0,
      },
    ]);
  }

  function updateItem(index: number, serviceId: string) {
    const selectedService =
      services.find((service) => service.id === serviceId) ?? null;

    onChange(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              service_id: serviceId,
              duration_minutes: selectedService?.duration_minutes ?? 0,
            }
          : item,
      ),
    );
  }

  function updateDuration(index: number, value: string) {
    const parsed = Number(value);

    onChange(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              duration_minutes:
                Number.isFinite(parsed) && parsed > 0 ? parsed : 0,
            }
          : item,
      ),
    );
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const selectedService =
          services.find((service) => service.id === item.service_id) ?? null;

        return (
          <div
            key={`${item.service_id || "empty"}-${index}`}
            className="rounded-2xl border border-app-soft bg-app-card p-4"
          >
            <div className="grid gap-3 md:grid-cols-[1fr_140px_auto] md:items-start">
              <div className="space-y-2">
                <ServiceSearchSelect
                  services={services}
                  value={item.service_id}
                  onSelect={(serviceId) => updateItem(index, serviceId)}
                />

                <div className="text-xs text-app-muted">
                  Default trajanje:{" "}
                  <span className="font-medium">
                    {selectedService?.duration_minutes ?? "-"} min
                  </span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-app-text">
                  Trajanje
                </label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={item.duration_minutes || ""}
                  onChange={(e) => updateDuration(index, e.target.value)}
                  className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none"
                  placeholder="min"
                />
              </div>

              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length <= 1}
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addItem}
        className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-4 py-3 text-sm font-medium text-app-text transition hover:bg-app-card-alt"
      >
        <Plus className="h-4 w-4" />
        Dodaj uslugu
      </button>
    </div>
  );
}
