"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ClientComboboxItem = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  internal_note: string | null;
};

type Props = {
  clients: ClientComboboxItem[];
  selectedClientId: string;
  clientName: string;
  onSelectClient: (client: ClientComboboxItem) => void;
  onUseTypedAsNew: (typedValue: string) => void;
  onClearSelection: () => void;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export default function ClientCombobox({
  clients,
  selectedClientId,
  clientName,
  onSelectClient,
  onUseTypedAsNew,
  onClearSelection,
}: Props) {
  const [query, setQuery] = useState(clientName);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setQuery(clientName);
  }, [clientName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredClients = useMemo(() => {
    const q = normalize(query);
    if (!q) return clients.slice(0, 8);

    return clients
      .filter((client) => {
        return (
          normalize(client.full_name).includes(q) ||
          normalize(client.phone ?? "").includes(q) ||
          normalize(client.email ?? "").includes(q)
        );
      })
      .slice(0, 8);
  }, [clients, query]);

  const exactMatch = useMemo(() => {
    const q = normalize(query);
    return clients.some((client) => normalize(client.full_name) === q);
  }, [clients, query]);

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            setOpen(true);

            if (selectedClientId) {
              onClearSelection();
            }

            onUseTypedAsNew(value);
          }}
          placeholder="Pretraži klijenta po imenu, telefonu ili emailu..."
          className="w-full rounded-xl border border-app-soft bg-white px-4 py-3 text-app-text outline-none transition focus:border-app-accent focus:ring-2 focus:ring-app-accent/20"
        />

        {selectedClientId ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onClearSelection();
              setOpen(false);
            }}
            className="rounded-xl border border-app-soft bg-white px-4 py-3 text-sm font-medium text-app-text transition hover:bg-app-bg hover:text-app-accent"
          >
            Makni
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-app-soft bg-app-card p-2 shadow-xl">
          {filteredClients.length > 0 ? (
            <div className="space-y-1">
              {filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    onSelectClient(client);
                    setQuery(client.full_name);
                    setOpen(false);
                  }}
                  className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-app-bg"
                >
                  <div className="font-medium text-app-text">
                    {client.full_name}
                  </div>
                  <div className="mt-1 text-xs text-app-muted">
                    {client.phone || "-"}
                    {client.email ? ` · ${client.email}` : ""}
                  </div>
                </button>
              ))}
            </div>
          ) : null}

          {!exactMatch && query.trim() ? (
            <button
              type="button"
              onClick={() => {
                onUseTypedAsNew(query);
                setOpen(false);
              }}
              className="mt-2 block w-full rounded-xl border border-dashed border-app-soft px-3 py-3 text-left transition hover:bg-app-bg"
            >
              <div className="font-medium text-app-text">
                Dodaj novog klijenta: &quot;{query}&quot;
              </div>
              <div className="mt-1 text-xs text-app-muted">
                Novi klijent će biti kreiran prilikom spremanja termina.
              </div>
            </button>
          ) : null}

          {filteredClients.length === 0 && !query.trim() ? (
            <div className="px-3 py-3 text-sm text-app-muted">
              Nema dostupnih klijenata.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
