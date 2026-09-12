"use client";

import { useMemo, useState, useTransition } from "react";
import { RotateCcw } from "lucide-react";
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

export default function RoomsTable({ locale = "hr", rooms }: Props) {
  const t = getDictionary(locale).settings;
  const initialItems = useMemo(() => rooms.map(toEditable), [rooms]);

  const [items, setItems] = useState<EditableRoom[]>(initialItems);
  const [pending, startTransition] = useTransition();

  const hasChanges = JSON.stringify(items) !== JSON.stringify(initialItems);

  function updateItem(
    id: string,
    field: keyof EditableRoom,
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
      const result = await bulkUpdateRoomsAction(items);
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
          {t.rooms.editHint}{" "}
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
              <th className="px-4 py-3 font-semibold">{t.name}</th>
              <th className="px-4 py-3 font-semibold">{t.active}</th>
              <th className="px-4 py-3 font-semibold">{t.actions}</th>
            </tr>
          </thead>

          <tbody>
            {items.map((room) => (
              <tr
                key={room.id}
                className="border-t border-app-soft text-sm transition hover:bg-app-card-alt"
              >
                <td className="px-4 py-4">
                  <input
                    value={room.name}
                    onChange={(e) =>
                      updateItem(room.id, "name", e.target.value)
                    }
                    className="w-full min-w-[240px] rounded-lg border border-app-soft bg-white px-3 py-2 text-app-text outline-none"
                  />
                </td>

                <td className="px-4 py-4">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={room.is_active}
                    onClick={() =>
                      updateItem(room.id, "is_active", !room.is_active)
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      room.is_active ? "bg-app-accent" : "bg-app-soft"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                        room.is_active ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </td>

                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <SettingsDeleteButton
                      label={room.name}
                      onDelete={deleteRoomAction.bind(null, room.id)}
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
