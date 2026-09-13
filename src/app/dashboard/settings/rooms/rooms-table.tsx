"use client";

import { useMemo, useState, useTransition } from "react";
import { DoorOpen, RotateCcw, Search } from "lucide-react";
import type { RoomItem } from "@/features/settings/types";
import {
  bulkUpdateRoomsAction,
  deleteRoomAction,
} from "@/features/settings/actions";
import SettingsDeleteButton from "@/components/settings-delete-button";
import { toast } from "sonner";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  rooms: RoomItem[];
};

type EditableRoom = {
  id: string;
  name: string;
  is_active: boolean;
};

function toEditable(room: RoomItem): EditableRoom {
  return {
    id: room.id,
    name: room.name,
    is_active: room.is_active,
  };
}

function copy(locale: AppLocale) {
  if (locale === "en") {
    return {
      search: "Search rooms...",
      noResults: "No rooms match your search.",
      activeHelp: "Available when booking appointments",
    };
  }
  if (locale === "it") {
    return {
      search: "Cerca cabine...",
      noResults: "Nessuna cabina corrisponde alla ricerca.",
      activeHelp: "Disponibile durante la prenotazione degli appuntamenti",
    };
  }
  return {
    search: "Pretraži sobe...",
    noResults: "Nema soba koje odgovaraju pretrazi.",
    activeHelp: "Dostupna kod rezerviranja termina",
  };
}

export default function RoomsTable({ locale = "hr", rooms }: Props) {
  const t = getDictionary(locale).settings;
  const ui = copy(locale);
  const initialItems = useMemo(() => rooms.map(toEditable), [rooms]);
  const [items, setItems] = useState<EditableRoom[]>(initialItems);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    if (!query) return items;
    return items.filter((item) => item.name.toLocaleLowerCase(locale).includes(query));
  }, [items, locale, search]);

  function updateItem(
    id: string,
    field: keyof EditableRoom,
    value: string | boolean,
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function saveChanges() {
    startTransition(async () => {
      const result = await bulkUpdateRoomsAction(items);
      result.ok ? toast.success(result.message) : toast.error(result.message);
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleItems.map((room) => (
            <article
              key={room.id}
              className="rounded-2xl border border-app-soft bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-app-soft bg-white text-app-muted">
                    <DoorOpen className="h-5 w-5" />
                  </span>
                  <h3 className="truncate font-bold text-app-text">{room.name}</h3>
                </div>
                <SettingsDeleteButton
                  locale={locale}
                  label={room.name}
                  onDelete={deleteRoomAction.bind(null, room.id)}
                />
              </div>

              <label className="mt-5 block space-y-1.5 text-sm font-medium text-app-text">
                <span>{t.name}</span>
                <input
                  value={room.name}
                  onChange={(event) => updateItem(room.id, "name", event.target.value)}
                  className="w-full rounded-xl border border-app-soft bg-white px-3.5 py-2.5 outline-none"
                />
              </label>

              <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-app-soft p-3.5">
                <div>
                  <p className="text-sm font-semibold text-app-text">{t.active}</p>
                  <p className="mt-0.5 text-xs text-app-muted">{ui.activeHelp}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={room.is_active}
                  onClick={() => updateItem(room.id, "is_active", !room.is_active)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    room.is_active ? "bg-app-accent" : "bg-app-soft"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      room.is_active ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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
