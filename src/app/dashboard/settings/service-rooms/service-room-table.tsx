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

type RoomMapping = {
  room_id: string;
  service_ids: string[];
};

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      chooseRoom: "Choose a room",
      servicesFor: "Services available in",
      search: "Search services…",
      selected: "selected",
      all: "Select all",
      none: "Clear all",
      empty: "No services match your search.",
      help: "Choose a room, then select every service that can be performed there.",
    };
  }
  if (locale === "it") {
    return {
      chooseRoom: "Scegli una cabina",
      servicesFor: "Servizi disponibili in",
      search: "Cerca servizi…",
      selected: "selezionati",
      all: "Seleziona tutti",
      none: "Deseleziona tutti",
      empty: "Nessun servizio corrisponde alla ricerca.",
      help: "Scegli una cabina e poi seleziona tutti i servizi che possono essere eseguiti lì.",
    };
  }
  return {
    chooseRoom: "Odaberi sobu",
    servicesFor: "Usluge dostupne u",
    search: "Pretraži usluge…",
    selected: "odabrano",
    all: "Odaberi sve",
    none: "Ukloni sve",
    empty: "Nema usluga koje odgovaraju pretrazi.",
    help: "Odaberi sobu, a zatim označi sve usluge koje se u toj sobi mogu izvoditi.",
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

  const initialItems = useMemo<RoomMapping[]>(
    () =>
      activeRooms.map((room) => ({
        room_id: room.id,
        service_ids: mappings
          .filter((mapping) => mapping.room_id === room.id)
          .map((mapping) => mapping.service_id)
          .filter((serviceId) =>
            activeServices.some((service) => service.id === serviceId),
          )
          .sort(),
      })),
    [activeRooms, activeServices, mappings],
  );

  const [items, setItems] = useState<RoomMapping[]>(initialItems);
  const [selectedRoomId, setSelectedRoomId] = useState(activeRooms[0]?.id ?? "");
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
  const hasChanges = JSON.stringify(normalizedItems) !== JSON.stringify(initialItems);
  const selectedRoom = activeRooms.find((room) => room.id === selectedRoomId);
  const selectedItem = items.find((item) => item.room_id === selectedRoomId);
  const normalizedQuery = query.trim().toLocaleLowerCase(locale);
  const filteredServices = activeServices.filter((service) =>
    service.name.toLocaleLowerCase(locale).includes(normalizedQuery),
  );

  function toggleService(serviceId: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.room_id !== selectedRoomId) return item;
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

  function selectAllServices() {
    setItems((prev) =>
      prev.map((item) =>
        item.room_id === selectedRoomId
          ? { ...item, service_ids: activeServices.map((service) => service.id) }
          : item,
      ),
    );
  }

  function clearAllServices() {
    setItems((prev) =>
      prev.map((item) =>
        item.room_id === selectedRoomId ? { ...item, service_ids: [] } : item,
      ),
    );
  }

  function resetChanges() {
    setItems(initialItems);
  }

  function saveChanges() {
    const servicePayload = activeServices.map((service) => ({
      service_id: service.id,
      room_ids: normalizedItems
        .filter((item) => item.service_ids.includes(service.id))
        .map((item) => item.room_id)
        .sort(),
    }));

    startTransition(async () => {
      const result = await bulkUpdateServiceRoomsAction(servicePayload);
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

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
          {ui.chooseRoom}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {activeRooms.map((room) => {
            const active = room.id === selectedRoomId;
            const count =
              items.find((item) => item.room_id === room.id)?.service_ids.length ?? 0;
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setSelectedRoomId(room.id);
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
                  <DoorOpen className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-app-text">
                    {room.name}
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

      {selectedRoom ? (
        <section className="rounded-2xl border border-app-soft bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-app-muted">
                {ui.servicesFor}
              </p>
              <h2 className="mt-1 text-xl font-bold text-app-text">{selectedRoom.name}</h2>
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
                const checked = selectedItem?.service_ids.includes(service.id) ?? false;
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
