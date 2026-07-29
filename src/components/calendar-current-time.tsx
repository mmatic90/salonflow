"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

function formatCurrentTime(date: Date) {
  return new Intl.DateTimeFormat("hr-HR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function CalendarCurrentTime({ selectedDate, today }: { selectedDate: string; today: string }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  if (selectedDate !== today) return null;

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 shadow-sm">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
      </span>
      <Clock3 className="h-4 w-4" />
      Sada {formatCurrentTime(now)}
    </div>
  );
}
