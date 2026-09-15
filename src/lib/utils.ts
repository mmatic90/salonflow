export type UiLocale = "hr" | "en" | "it";

function intlLocale(locale: UiLocale) {
  if (locale === "en") return "en-GB";
  if (locale === "it") return "it-IT";
  return "hr-HR";
}

export function formatTime(value: string) {
  return value.slice(0, 5);
}

export function formatDateLabel(value: string, locale: UiLocale = "hr") {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function statusLabel(status: string, locale: UiLocale = "hr") {
  const labels: Record<UiLocale, Record<string, string>> = {
    hr: {
      scheduled: "Zakazan",
      confirmed: "Potvrđen",
      completed: "Odrađen",
      cancelled: "Otkazan",
      no_show: "Nije došao",
    },
    en: {
      scheduled: "Scheduled",
      confirmed: "Confirmed",
      completed: "Completed",
      cancelled: "Cancelled",
      no_show: "No-show",
    },
    it: {
      scheduled: "Programmato",
      confirmed: "Confermato",
      completed: "Completato",
      cancelled: "Annullato",
      no_show: "No-show",
    },
  };

  return labels[locale][status] ?? status;
}
