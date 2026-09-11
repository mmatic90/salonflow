export type AppLocale = "hr" | "en" | "it";

export const localeLabels: Record<AppLocale, string> = {
  hr: "Hrvatski",
  en: "English",
  it: "Italiano",
};

const dictionaries = {
  hr: {
    salonAdminPanel: "Salon admin panel",
    loggedInAs: "Logiran kao",
    myAccount: "Moj račun",
    nav: {
      dashboard: "Dashboard",
      onlineBookings: "Online rezervacije",
      appointments: "Termini",
      calendar: "Kalendar",
      weekCalendar: "Tjedni kalendar",
      timeGrid: "Time Grid",
      clients: "Klijenti",
      schedule: "Rasporedi",
      reports: "Reports",
      settings: "Postavke",
    },
  },
  en: {
    salonAdminPanel: "Salon admin panel",
    loggedInAs: "Signed in as",
    myAccount: "My account",
    nav: {
      dashboard: "Dashboard",
      onlineBookings: "Online bookings",
      appointments: "Appointments",
      calendar: "Calendar",
      weekCalendar: "Weekly calendar",
      timeGrid: "Time Grid",
      clients: "Clients",
      schedule: "Schedules",
      reports: "Reports",
      settings: "Settings",
    },
  },
  it: {
    salonAdminPanel: "Pannello amministrazione salone",
    loggedInAs: "Accesso come",
    myAccount: "Il mio account",
    nav: {
      dashboard: "Dashboard",
      onlineBookings: "Prenotazioni online",
      appointments: "Appuntamenti",
      calendar: "Calendario",
      weekCalendar: "Calendario settimanale",
      timeGrid: "Time Grid",
      clients: "Clienti",
      schedule: "Orari",
      reports: "Report",
      settings: "Impostazioni",
    },
  },
} as const;

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale] ?? dictionaries.hr;
}
