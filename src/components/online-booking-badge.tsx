"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

type Listener = (count: number) => void;

let sharedCount = 0;
let previousCount: number | null = null;
let pollInterval: number | null = null;
let requestInFlight: Promise<void> | null = null;
let subscriberCount = 0;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(sharedCount);
  }
}

async function loadSharedCount() {
  if (requestInFlight) return requestInFlight;

  requestInFlight = (async () => {
    try {
      const res = await fetch("/api/online-bookings/pending-count", {
        cache: "no-store",
      });

      if (!res.ok) return;

      const data = await res.json();
      const nextCount = Number(data.count ?? 0);

      if (previousCount !== null && nextCount > previousCount) {
        const diff = nextCount - previousCount;

        toast.info(
          diff === 1
            ? "Stigla je nova online rezervacija."
            : `Stiglo je ${diff} novih online rezervacija.`,
          {
            description: "Otvori Online rezervacije za pregled zahtjeva.",
            action: {
              label: "Otvori",
              onClick: () => {
                window.location.href = "/dashboard/online-bookings";
              },
            },
          },
        );
      }

      previousCount = nextCount;
      sharedCount = nextCount;
      notifyListeners();
    } catch (error) {
      console.error("Greška pri dohvaćanju broja online rezervacija:", error);
    } finally {
      requestInFlight = null;
    }
  })();

  return requestInFlight;
}

function startPolling() {
  if (pollInterval !== null) return;

  void loadSharedCount();
  pollInterval = window.setInterval(() => {
    void loadSharedCount();
  }, 20000);
}

function stopPollingIfUnused() {
  if (subscriberCount > 0 || pollInterval === null) return;

  window.clearInterval(pollInterval);
  pollInterval = null;
}

export default function OnlineBookingBadge() {
  const [count, setCount] = useState(sharedCount);

  useEffect(() => {
    subscriberCount += 1;
    listeners.add(setCount);
    setCount(sharedCount);
    startPolling();

    return () => {
      listeners.delete(setCount);
      subscriberCount = Math.max(0, subscriberCount - 1);
      stopPollingIfUnused();
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
      {count}
    </span>
  );
}
