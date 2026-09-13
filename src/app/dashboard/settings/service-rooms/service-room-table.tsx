"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, DoorOpen, RotateCcw, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { bulkUpdateServiceRoomsAction } from "@/features/settings/actions";
import type { ServiceRoomMappingRow } from "@/features/settings/queries";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type ServiceItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type RoomItem = {
  id: string;
  name: string;
  is_active: boolean;
};

type Props = {
  locale?: AppLocale;
  services: ServiceItem[];
  rooms: RoomItem[];
  mappings: ServiceRoomMappingRow[];
};

type EditableMapping = {
  service_id: string;
  room_ids: string[];
};

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      search: "Search services…",
      roomCount: "rooms selected",
      none: "No room selected",
      empty: "No services match your search.",
      help: "For each service, choose every room where it can be performed.",
    };
  }
  if (locale === "it") {
    return {
      search: "Cerca servizi…",
      roomCount: "cabine selezionate",
      none: "Nessuna cabina selezionata",
      empty: "Nessun servizio corrisponde alla ricerca.",
      help: "Per ogni servizio scegli tutte le cabine in cui può essere eseguito.",
    };
  }
  return {
    search: "Pretraži usluge…",
    roomCount: "odabrane sobe",
    none: "Nijedna soba nije odabrana",
    empty: "Nema usluga koje odgovaraju pretrazi.",
    help: "Za svaku uslugu odaberi sve sobe u kojima se može izvoditi.",
  };
}

export default function ServiceRoomTable({
  locale = "hr",
  services,
  rooms,
  mappings,
}: Props) {
  const router = useRouter();
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
  const activeServices = useMemo(
    () => services.filter((service) => service.is_active),
    [services],
  );
  const activeRooms = useMemo(
    () => rooms.filter((room) => room.is_active),
    [rooms],
  );
  const initialItems = useMemo<EditableMapping[]>(
    () =>
      activeServices.map((service) => ({
        service_id: service.id,
        room_ids: mappings
          .filter((mapping) => mapping.service_id === service.id)
          .map((mapping) => mapping.room_id)
          .sort(),
      })),
    [activeServices, mappings],
  );

  const [items, setItems] = useState<EditableMapping[]>(initialItems);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const normalizedItems = useMemo(
    () => items.map((item) => ({ ...item, room_ids: [...item.room_ids].sort() })),
    [items],
  );
  const hasChanges =
    JSON.stringify(normalizedItems) !== JSON.stringify(initialItems);
  const filteredServices = activeServices.filter((service) =>
    service.name.toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)),
  );

  function toggleRoom(serviceId: string, roomId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.service_id !== serviceId) return item;
        const exists = item.room_ids.includes(roomId);
        return {
          ...item,
          room_ids: exists
            ? item.room_ids.filter((id) => id !== roomId)
            : [...item.room_ids, roomId],
        };
      }),
    );
  }

  function resetChanges() {
    setItems(initialItems);
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateServiceRoomsAction(normalizedItems);
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
          <p className="text-sm font-semibold text-app-text">{t.mapping.roomsHint}</p>
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
            const count = item?.room_ids.length ?? 0;
            return (
              <section
                key={service.id}
                className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-app-text">{service.name}</h3>
                    <p className="mt-1 text-xs text-app-muted">
                      {count ? `${count}/${activeRooms.length} ${ui.roomCount}` : ui.none}
                    </p>
                  </div>
                  <DoorOpen className="h-5 w-5 shrink-0 text-app-muted" />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {activeRooms.map((room) => {
                    const checked = item?.room_ids.includes(room.id) ?? false;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => toggleRoom(service.id, room.id)}
                        className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                          checked
                            ? "border-app-accent/40 bg-app-accent/5"
                            : "border-app-soft bg-app-card-alt/35 hover:bg-app-card-alt"
                        }`}
                      >
                        <span className="text-sm font-medium text-app-text">
                          {room.name}
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
