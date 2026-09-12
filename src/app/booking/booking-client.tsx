"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Lang = "hr" | "en" | "it";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  category: string | null;
};

type Slot = {
  start_time: string;
  end_time: string;
  employee_id: string;
  employee_name: string;
  room_id: string;
  room_name: string;
};

const text = {
  hr: {
    min: "min",
    back: "← Nazad na usluge",
    backToCategories: "← Nazad na kategorije",
    chooseService: "Odaberi uslugu",
    chooseCategory: "Odaberi kategoriju",
    categoryLabel: "Kategorija",
    chooseCategoryText:
      "Prvo odaberi kategoriju usluge, zatim odaberi tretman koji želiš rezervirati.",
    chooseServiceText:
      "Prikazane su samo usluge dostupne za online rezervaciju.",
    otherCategory: "Ostalo",
    dateTime: "Datum i vrijeme",
    selectedDate: "Odabrani datum",
    loading: "Učitavanje slobodnih termina...",
    noSlots: "Nema slobodnih termina za odabrani datum.",
    freeSlots: "Slobodni sati",
    contactTitle: "Kontakt podaci",
    contactText:
      "Unesi svoje podatke kako bi salon mogao potvrditi rezervaciju. Broj telefona je obavezan jer ćeš SMS-om dobiti potvrdu ili povratnu informaciju.",
    selectedSlot: "Odabrani termin",
    fullName: "Ime i prezime *",
    phone: "Telefon *",
    phoneHelp:
      "SMS potvrde šalju se samo na hrvatske brojeve. Ako nemaš hrvatski broj, obavezno unesi email kako bi salon mogao poslati potvrdu emailom.",
    email: "Email (opcionalno)",
    note: "Napomena (opcionalno)",
    submit: "Pošalji zahtjev za rezervaciju",
    submitting: "Slanje zahtjeva...",
    chooseSlotFirst: "Prvo odaberi slobodan sat.",
    serviceInfo: "Odaberi datum i početak termina. Trajanje tretmana:",
    priceLabel: "Cijena",
    alerts: {
      missingSlot: "Odaberi uslugu, datum i termin.",
      missingName: "Ime i prezime je obavezno.",
      availabilityError: "Greška pri dohvaćanju termina.",
      bookingError: "Greška pri rezervaciji.",
    },
  },
  en: {
    min: "min",
    back: "← Back to services",
    backToCategories: "← Back to categories",
    chooseService: "Choose a service",
    chooseCategory: "Choose a category",
    categoryLabel: "Category",
    chooseCategoryText:
      "First choose a service category, then select the treatment you would like to book.",
    chooseServiceText: "Only services available for online booking are shown.",
    otherCategory: "Other",
    dateTime: "Date and time",
    selectedDate: "Selected date",
    loading: "Loading available times...",
    noSlots: "No available times for the selected date.",
    freeSlots: "Available times",
    contactTitle: "Contact details",
    contactText:
      "Enter your details so the salon can review your request. Phone number is required because you will receive confirmation or feedback by SMS.",
    selectedSlot: "Selected appointment",
    fullName: "Full name *",
    phone: "Phone *",
    phoneHelp:
      "SMS notifications are available only for Croatian phone numbers. If you do not have a Croatian number, please enter your email so the salon can send confirmation by email.",
    email: "Email (optional)",
    note: "Note (optional)",
    submit: "Send booking request",
    submitting: "Sending request...",
    chooseSlotFirst: "Please choose an available time first.",
    serviceInfo: "Choose a date and start time. Treatment duration:",
    priceLabel: "Price",
    alerts: {
      missingSlot: "Please choose a service, date and time.",
      missingName: "Full name is required.",
      availabilityError: "Error loading available times.",
      bookingError: "Error sending booking request.",
    },
  },
  it: {
    min: "min",
    back: "← Torna ai servizi",
    backToCategories: "← Torna alle categorie",
    chooseService: "Scegli un servizio",
    chooseCategory: "Scegli una categoria",
    categoryLabel: "Categoria",
    chooseCategoryText:
      "Scegli prima una categoria, poi seleziona il trattamento che vuoi prenotare.",
    chooseServiceText:
      "Sono mostrati solo i servizi disponibili per la prenotazione online.",
    otherCategory: "Altro",
    dateTime: "Data e ora",
    selectedDate: "Data selezionata",
    loading: "Caricamento degli orari disponibili...",
    noSlots: "Nessun orario disponibile per la data selezionata.",
    freeSlots: "Orari disponibili",
    contactTitle: "Dati di contatto",
    contactText:
      "Inserisci i tuoi dati così il salone potrà verificare la richiesta e inviarti una conferma.",
    selectedSlot: "Appuntamento selezionato",
    fullName: "Nome e cognome *",
    phone: "Telefono *",
    phoneHelp:
      "Le notifiche SMS sono disponibili solo per numeri croati. Se non hai un numero croato, inserisci l'email.",
    email: "Email (opzionale)",
    note: "Nota (opzionale)",
    submit: "Invia richiesta di prenotazione",
    submitting: "Invio richiesta...",
    chooseSlotFirst: "Seleziona prima un orario disponibile.",
    serviceInfo: "Scegli data e ora di inizio. Durata del trattamento:",
    priceLabel: "Prezzo",
    alerts: {
      missingSlot: "Seleziona servizio, data e ora.",
      missingName: "Nome e cognome sono obbligatori.",
      availabilityError: "Errore nel caricamento degli orari.",
      bookingError: "Errore nell'invio della prenotazione.",
    },
  }
};

function getServiceDescription(service: Service) {
  return service.description;
}

function getServiceName(service: Service) {
  return service.name;
}

function getServiceGroup(service: Service) {
  return service.category;
}

function formatPrice(price: number | null | undefined, currency: string) {
  if (price == null) return null;
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: currency || "EUR",
  }).format(price);
}

function formatDateInputValue(date: unknown) {
  if (!date) return "";

  let d: Date;

  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "string") {
    d = new Date(`${date}T00:00:00`);
  } else {
    d = new Date(date as any);
  }

  if (Number.isNaN(d.getTime())) {
    console.error("Invalid date passed:", date);
    return "";
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayValue() {
  return formatDateInputValue(new Date());
}

function formatDateDisplay(date: string, lang: Lang) {
  if (!date) return "";
  const [year, month, day] = date.split("-");

  if (lang === "en") return `${day}/${month}/${year}`;
  return `${day}.${month}.${year}.`;
}

function getVisibleDays(startDate: string, lang: Lang, days = 4) {
  const base = new Date(`${startDate}T00:00:00`);
  const locale = lang === "en" ? "en-GB" : lang === "it" ? "it-IT" : "hr-HR";

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(base);
    date.setDate(date.getDate() + index);

    const value = formatDateInputValue(date);

    return {
      value,
      dayName: date.toLocaleDateString(locale, { weekday: "short" }),
      dayNumber: date.toLocaleDateString(locale, { day: "2-digit" }),
      month: date.toLocaleDateString(locale, { month: "short" }),
    };
  });
}

export default function BookingClient({
  services,
  lang,
  organizationSlug,
}: {
  services: Service[];
  lang: Lang;
  organizationSlug: string;
}) {
  const router = useRouter();
  const today = getTodayValue();
  const t = text[lang];

  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calendarStartDate, setCalendarStartDate] = useState(today);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const visibleDays = getVisibleDays(calendarStartDate, lang, 4);

  const serviceGroups = useMemo(() => {
    return Array.from(
      new Set(
        services.map(
          (service) => getServiceGroup(service) || t.otherCategory,
        ),
      ),
    );
  }, [services, lang, t.otherCategory]);

  const filteredServices = useMemo(() => {
    if (!selectedGroup) return [];

    return services.filter(
      (service) =>
        (getServiceGroup(service) || t.otherCategory) === selectedGroup,
    );
  }, [services, selectedGroup, lang, t.otherCategory]);

  async function loadAvailability(service: Service, date: string) {
    setLoading(true);
    setSlots([]);
    setSelectedSlot(null);

    try {
      const res = await fetch("/api/public/availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationSlug,
          serviceId: service.id,
          date,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || t.alerts.availabilityError);
        return;
      }

      const suggestions: Slot[] = data.suggestions || [];

      const uniqueByTime = Array.from(
        new Map(suggestions.map((slot) => [slot.start_time, slot])).values(),
      );

      setSlots(uniqueByTime);
    } catch (error) {
      console.error(error);
      alert(t.alerts.availabilityError);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailability(selectedService, selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedService]);

  async function submitBooking() {
    if (submitting) return;

    if (!selectedService || !selectedDate || !selectedSlot) {
      alert(t.alerts.missingSlot);
      return;
    }

    if (!fullName.trim()) {
      alert(t.alerts.missingName);
      return;
    }

    const normalizedPhone = phone.trim().replace(/\s+/g, "");
    const hasCroatianPhone =
      normalizedPhone.startsWith("+385") ||
      normalizedPhone.startsWith("00385") ||
      normalizedPhone.startsWith("09");

    if (!phone.trim() && !email.trim()) {
      alert(
        lang === "en"
          ? "Please enter a Croatian phone number or an email address."
          : lang === "it"
            ? "Inserisci un numero di telefono croato o un indirizzo email."
            : "Unesi hrvatski broj telefona ili email adresu.",
      );
      return;
    }

    if (!hasCroatianPhone && !email.trim()) {
      alert(
        lang === "en"
          ? "SMS confirmations are available only for Croatian numbers. Please enter your email."
          : lang === "it"
            ? "Le conferme SMS sono disponibili solo per numeri croati. Inserisci la tua email."
            : "SMS potvrde šalju se samo na hrvatske brojeve. Molimo unesi email.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/public/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationSlug,
          serviceId: selectedService.id,
          date: selectedDate,
          slot: selectedSlot,
          fullName,
          phone,
          email,
          note,
          lang,
        }),
      });

      const rawResponse = await res.text();

      let data: {
        ok?: boolean;
        requestId?: string;
        error?: string;
      } = {};

      if (rawResponse) {
        try {
          data = JSON.parse(rawResponse);
        } catch {
          console.error("Public booking returned a non-JSON response:", rawResponse);
        }
      }

      if (!res.ok) {
        alert(
          data.error ||
            `${t.alerts.bookingError} (${res.status})`,
        );
        return;
      }

      if (!data.requestId) {
        alert(t.alerts.bookingError);
        return;
      }

      const params = new URLSearchParams({
        lang,
        id: data.requestId,
        date: selectedDate,
        time: selectedSlot.start_time,
        service: getServiceName(selectedService),
      });

      router.push(`/booking/${organizationSlug}/success?${params.toString()}`);
    } catch (error) {
      console.error(error);
      alert(t.alerts.bookingError);
    } finally {
      setSubmitting(false);
    }
  }

  const now = new Date();

  const filteredSlots = slots.filter((slot) => {
    const slotDateTime = new Date(`${selectedDate}T${slot.start_time}`);
    return slotDateTime > now;
  });

  return (
    <div className="space-y-10">
      {!selectedService && (
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-semibold">
              {selectedGroup ? t.chooseService : t.chooseCategory}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#6f5a50]">
              {selectedGroup ? t.chooseServiceText : t.chooseCategoryText}
            </p>
          </div>

          {!selectedGroup ? (
            <div className="grid gap-4 md:grid-cols-2">
              {serviceGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className="rounded-2xl border border-[#eadbd2] bg-[#f8f3ef] p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b6f5b]">
                    {t.categoryLabel}
                  </div>

                  <div className="mt-2 text-xl font-semibold">{group}</div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="mb-4 text-sm font-medium text-[#9b6f5b]"
              >
                {t.backToCategories}
              </button>

              <div className="grid gap-4 md:grid-cols-2">
                {filteredServices.map((service) => {
                  const price = formatPrice(service.price, service.currency);

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        setSelectedDate(today);
                        setCalendarStartDate(today);
                      }}
                      className="group rounded-2xl border border-[#eadbd2] bg-[#f8f3ef] p-5 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9b6f5b]">
                        {selectedGroup}
                      </div>

                      <div className="mt-2 text-lg font-semibold">
                        {getServiceName(service)}
                      </div>

                      {service.description ? (
                        <p className="mt-2 text-sm leading-6 text-[#6f5a50]">
                          {getServiceDescription(service)}
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#6f5a50]">
                        {" "}
                        <span>
                          {service.duration_minutes} {t.min}
                        </span>
                        {price ? (
                          <>
                            <span>·</span>
                            <span>{price}</span>
                          </>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedService && (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedService(null);
              setSelectedDate(today);
              setCalendarStartDate(today);
              setSlots([]);
              setSelectedSlot(null);
            }}
            className="mb-6 text-sm font-medium text-[#9b6f5b]"
          >
            {t.back}
          </button>

          <div className="mb-8 rounded-2xl border border-[#eadbd2] bg-[#f8f3ef] p-5">
            <h2 className="text-2xl font-semibold">
              {getServiceName(selectedService)}
            </h2>

            {selectedService.description ? (
              <p className="mt-3 text-sm leading-7 text-[#6f5a50]">
                {selectedService.description}
              </p>
            ) : null}

            <p className="mt-2 text-sm leading-6 text-[#6f5a50]">
              {t.serviceInfo} {selectedService.duration_minutes} {t.min}.
            </p>

            {formatPrice(selectedService.price, selectedService.currency) ? (
              <p className="mt-2 text-sm font-semibold text-[#2f2723]">
                {t.priceLabel}: {formatPrice(selectedService.price, selectedService.currency)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-8">
            <section className="rounded-[1.75rem] border border-[#eadbd2] bg-[#f8f3ef] p-6 md:p-8">
              <h3 className="text-xl font-semibold">{t.dateTime}</h3>

              <div className="mt-5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const previous = new Date(`${calendarStartDate}T00:00:00`);
                    previous.setDate(previous.getDate() - 4);

                    const previousValue = formatDateInputValue(previous);
                    const safeValue =
                      previousValue < today ? today : previousValue;

                    setCalendarStartDate(safeValue);
                  }}
                  disabled={calendarStartDate <= today}
                  className="rounded-xl border border-[#eadbd2] bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40"
                >
                  ←
                </button>

                <input
                  type="date"
                  value={selectedDate}
                  min={today}
                  onChange={(e) => {
                    const date = e.target.value;
                    setSelectedDate(date);
                    setCalendarStartDate(date);
                    loadAvailability(selectedService, date);
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-[#eadbd2] bg-white px-4 py-3 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={() => {
                    const next = new Date(`${calendarStartDate}T00:00:00`);
                    next.setDate(next.getDate() + 4);
                    setCalendarStartDate(formatDateInputValue(next));
                  }}
                  className="rounded-xl border border-[#eadbd2] bg-white px-4 py-3 text-sm font-semibold"
                >
                  →
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {visibleDays.map((day) => {
                  const active = selectedDate === day.value;

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => {
                        setSelectedDate(day.value);
                        loadAvailability(selectedService, day.value);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[#2f2723] bg-[#2f2723] text-white"
                          : "border-[#eadbd2] bg-white hover:bg-[#fffaf7]"
                      }`}
                    >
                      <div className="text-xs uppercase opacity-70">
                        {day.dayName}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {day.dayNumber}
                      </div>
                      <div className="text-xs opacity-70">{day.month}</div>
                    </button>
                  );
                })}
              </div>

              <p className="mt-4 text-sm text-[#6f5a50]">
                {t.selectedDate}:{" "}
                <span className="font-semibold text-[#2f2723]">
                  {formatDateDisplay(selectedDate, lang)}
                </span>
              </p>

              {loading && (
                <p className="mt-6 text-sm text-[#6f5a50]">{t.loading}</p>
              )}

              {!loading && selectedDate && filteredSlots.length === 0 && (
                <p className="mt-6 rounded-xl bg-white p-4 text-sm text-[#6f5a50]">
                  {t.noSlots}
                </p>
              )}

              {!loading && filteredSlots.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-sm font-semibold text-[#6f5a50]">
                    {t.freeSlots}
                  </h4>

                  <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-3">
                    {filteredSlots.map((slot) => {
                      const active =
                        selectedSlot?.start_time === slot.start_time &&
                        selectedSlot?.employee_id === slot.employee_id &&
                        selectedSlot?.room_id === slot.room_id;

                      return (
                        <button
                          key={`${slot.start_time}-${slot.employee_id}-${slot.room_id}`}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`min-w-0 rounded-2xl border px-3 py-4 text-center text-base font-semibold leading-none transition sm:text-lg ${
                            active
                              ? "border-[#2f2723] bg-[#2f2723] text-white"
                              : "border-[#eadbd2] bg-white hover:bg-[#fffaf7]"
                          }`}
                        >
                          {slot.start_time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[1.75rem] border border-[#eadbd2] bg-white p-6 md:p-8 2xl:sticky 2xl:top-8">
              <h3 className="text-xl font-semibold">{t.contactTitle}</h3>

              <p className="mt-3 text-sm leading-6 text-[#6f5a50]">
                {t.contactText}
              </p>

              {selectedSlot && (
                <div className="mt-5 rounded-xl bg-[#f8f3ef] p-4 text-sm text-[#6f5a50]">
                  {t.selectedSlot}:{" "}
                  <span className="font-semibold text-[#2f2723]">
                    {formatDateDisplay(selectedDate, lang)}{" "}
                    {selectedSlot.start_time} - {selectedSlot.end_time}
                  </span>
                </div>
              )}

              <input
                placeholder={t.fullName}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-5 w-full rounded-xl border border-[#eadbd2] px-4 py-3 outline-none"
              />

              <input
                placeholder={t.phone}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-4 w-full rounded-xl border border-[#eadbd2] px-4 py-3 outline-none"
              />

              <p className="mt-2 text-xs text-[#6f5a50]">{t.phoneHelp}</p>

              <input
                type="email"
                placeholder={t.email}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-4 w-full rounded-xl border border-[#eadbd2] px-4 py-3 outline-none"
              />

              <textarea
                placeholder={t.note}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="mt-4 w-full resize-none rounded-xl border border-[#eadbd2] px-4 py-3 outline-none"
              />

              <button
                type="button"
                onClick={submitBooking}
                disabled={submitting || !selectedSlot}
                className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#2f2723] py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    {t.submitting}
                    <span className="ml-2 animate-spin">⏳</span>
                  </>
                ) : (
                  t.submit
                )}
              </button>

              {!selectedSlot && (
                <p className="mt-3 text-center text-xs text-[#6f5a50]">
                  {t.chooseSlotFirst}
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
