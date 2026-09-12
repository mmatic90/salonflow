export type AppLocale = "hr" | "en" | "it";

export const localeLabels: Record<AppLocale, string> = {
  hr: "Hrvatski",
  en: "English",
  it: "Italiano",
};

const dictionaries = {
  hr: {
    salonAdminPanel: "Administracija salona",
    loggedInAs: "Prijavljeni kao",
    myAccount: "Moj račun",
    logout: "Odjavi se",
    loggingOut: "Odjava...",
    logoutSuccess: "Uspješno ste odjavljeni.",
    activeSalon: "Aktivni salon",
    feedbackReview: "Pregled feedbacka",
    adminSystem: "administracijski sustav",
    createdBy: "Izradio",
    nav: {
      dashboard: "Nadzorna ploča",
      onlineBookings: "Online rezervacije",
      appointments: "Termini",
      calendar: "Kalendar",
      weekCalendar: "Tjedni kalendar",
      timeGrid: "Vremenski raspored",
      clients: "Klijenti",
      schedule: "Rasporedi",
      reports: "Izvještaji",
      settings: "Postavke",
    },
  },
  en: {
    salonAdminPanel: "Salon administration",
    loggedInAs: "Signed in as",
    myAccount: "My account",
    logout: "Sign out",
    loggingOut: "Signing out...",
    logoutSuccess: "You have been signed out.",
    activeSalon: "Active salon",
    feedbackReview: "Review feedback",
    adminSystem: "admin system",
    createdBy: "Created by",
    nav: {
      dashboard: "Dashboard",
      onlineBookings: "Online bookings",
      appointments: "Appointments",
      calendar: "Calendar",
      weekCalendar: "Weekly calendar",
      timeGrid: "Time grid",
      clients: "Clients",
      schedule: "Schedules",
      reports: "Reports",
      settings: "Settings",
    },
  },
  it: {
    salonAdminPanel: "Amministrazione salone",
    loggedInAs: "Accesso come",
    myAccount: "Il mio account",
    logout: "Esci",
    loggingOut: "Uscita...",
    logoutSuccess: "Disconnessione effettuata.",
    activeSalon: "Salone attivo",
    feedbackReview: "Visualizza feedback",
    adminSystem: "sistema di amministrazione",
    createdBy: "Realizzato da",
    nav: {
      dashboard: "Dashboard",
      onlineBookings: "Prenotazioni online",
      appointments: "Appuntamenti",
      calendar: "Calendario",
      weekCalendar: "Calendario settimanale",
      timeGrid: "Griglia oraria",
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
