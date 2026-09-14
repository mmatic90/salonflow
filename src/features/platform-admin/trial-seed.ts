import type { SupabaseClient } from "@supabase/supabase-js";

export const SALES_TRIAL_SEED_VERSION = 1;

type TrialLocale = "hr" | "en" | "it";

type SeedResult = {
  employees: number;
  services: number;
  clients: number;
  appointments: number;
  waitlistEntries: number;
  onlineBookingRequests: number;
};

type LocalizedSeed = {
  employeeNames: Array<[string, string, string]>;
  rooms: string[];
  services: Array<{
    name: string;
    category: string;
    description: string;
    duration: number;
    cleanup: number;
    price: number;
  }>;
  clientNames: Array<[string, string]>;
  care: {
    sensitivities: string;
    contraindications: string;
    preferences: string;
    notes: string;
  };
  waitlistNote: string;
  bookingNote: string;
};

function seedCopy(locale: TrialLocale): LocalizedSeed {
  if (locale === "it") {
    return {
      employeeNames: [
        ["Giulia", "Rossi", "Estetista senior"],
        ["Martina", "Bianchi", "Beauty therapist"],
        ["Luca", "Romano", "Massaggi e corpo"],
      ],
      rooms: ["Cabina 1", "Cabina 2", "Cabina corpo"],
      services: [
        { name: "Pulizia viso profonda", category: "Viso", description: "Pulizia professionale e trattamento finale.", duration: 60, cleanup: 10, price: 65 },
        { name: "Trattamento viso idratante", category: "Viso", description: "Trattamento idratante e illuminante.", duration: 60, cleanup: 10, price: 75 },
        { name: "Lash Lift", category: "Ciglia e sopracciglia", description: "Lifting e definizione delle ciglia naturali.", duration: 60, cleanup: 10, price: 48 },
        { name: "Sopracciglia", category: "Ciglia e sopracciglia", description: "Forma e colore delle sopracciglia.", duration: 30, cleanup: 5, price: 25 },
        { name: "Manicure gel", category: "Mani e piedi", description: "Manicure con smalto semipermanente.", duration: 60, cleanup: 10, price: 38 },
        { name: "Pedicure spa", category: "Mani e piedi", description: "Pedicure estetico completo.", duration: 60, cleanup: 10, price: 45 },
        { name: "Massaggio relax 60 min", category: "Massaggi", description: "Massaggio rilassante total body.", duration: 60, cleanup: 10, price: 60 },
        { name: "Body Sculpt", category: "Corpo", description: "Trattamento corpo modellante.", duration: 50, cleanup: 10, price: 75 },
      ],
      clientNames: [
        ["Chiara", "Conti"], ["Sofia", "Ricci"], ["Elena", "Gallo"], ["Laura", "Costa"],
        ["Alice", "Fontana"], ["Sara", "Moretti"], ["Valentina", "Greco"], ["Marta", "Lombardi"],
        ["Francesca", "Riva"], ["Ilaria", "Marini"], ["Anna", "De Luca"], ["Giada", "Serra"],
      ],
      care: {
        sensitivities: "Pelle sensibile; in passato lieve rossore dopo trattamenti intensivi.",
        contraindications: "Verificare lo stato della pelle prima di trattamenti intensivi.",
        preferences: "Preferisce trattamenti delicati e una fase finale idratante.",
        notes: "Cliente demo con profilo cura e sicurezza compilato.",
      },
      waitlistNote: "Preferisce un appuntamento anticipato se si libera un posto.",
      bookingNote: "Prima visita; preferisce il pomeriggio.",
    };
  }

  if (locale === "en") {
    return {
      employeeNames: [
        ["Emma", "Martin", "Senior beautician"],
        ["Sophie", "Clark", "Beauty therapist"],
        ["Lucas", "Brown", "Massage & body therapist"],
      ],
      rooms: ["Treatment room 1", "Treatment room 2", "Body room"],
      services: [
        { name: "Deep facial cleansing", category: "Face", description: "Professional cleansing with finishing care.", duration: 60, cleanup: 10, price: 65 },
        { name: "Hydrating facial", category: "Face", description: "Hydrating and brightening facial treatment.", duration: 60, cleanup: 10, price: 75 },
        { name: "Lash Lift", category: "Brows & lashes", description: "Lift and definition for natural lashes.", duration: 60, cleanup: 10, price: 48 },
        { name: "Brow shaping", category: "Brows & lashes", description: "Brow shaping and tinting.", duration: 30, cleanup: 5, price: 25 },
        { name: "Gel manicure", category: "Hands & feet", description: "Manicure with long-lasting polish.", duration: 60, cleanup: 10, price: 38 },
        { name: "Spa pedicure", category: "Hands & feet", description: "Complete aesthetic pedicure.", duration: 60, cleanup: 10, price: 45 },
        { name: "Relax massage 60 min", category: "Massage", description: "Full-body relaxation massage.", duration: 60, cleanup: 10, price: 60 },
        { name: "Body Sculpt", category: "Body", description: "Body shaping treatment.", duration: 50, cleanup: 10, price: 75 },
      ],
      clientNames: [
        ["Olivia", "Taylor"], ["Amelia", "Wilson"], ["Isla", "Thomas"], ["Emily", "Walker"],
        ["Grace", "Hall"], ["Sophie", "Young"], ["Ella", "King"], ["Mia", "Wright"],
        ["Lily", "Green"], ["Lucy", "Baker"], ["Anna", "Hill"], ["Eva", "Adams"],
      ],
      care: {
        sensitivities: "Sensitive skin; mild redness after a previous intensive treatment.",
        contraindications: "Check current skin condition before intensive treatments.",
        preferences: "Prefers gentle treatments and a hydrating finish.",
        notes: "Demo client with completed care and safety profile.",
      },
      waitlistNote: "Would prefer an earlier appointment if a slot becomes available.",
      bookingNote: "First visit; prefers an afternoon appointment.",
    };
  }

  return {
    employeeNames: [
      ["Ana", "Marić", "Senior kozmetičarka"],
      ["Petra", "Kovač", "Beauty terapeutkinja"],
      ["Luka", "Novak", "Masaže i body tretmani"],
    ],
    rooms: ["Soba 1", "Soba 2", "Soba za body tretmane"],
    services: [
      { name: "Dubinsko čišćenje lica", category: "Njega lica", description: "Profesionalno čišćenje i završna njega kože.", duration: 60, cleanup: 10, price: 65 },
      { name: "Hidratantni tretman lica", category: "Njega lica", description: "Hidratacija i glow efekt.", duration: 60, cleanup: 10, price: 75 },
      { name: "Lash Lift", category: "Obrve i trepavice", description: "Podizanje i definiranje prirodnih trepavica.", duration: 60, cleanup: 10, price: 48 },
      { name: "Oblikovanje obrva", category: "Obrve i trepavice", description: "Oblikovanje i bojenje obrva.", duration: 30, cleanup: 5, price: 25 },
      { name: "Gel manikura", category: "Ruke i stopala", description: "Manikura s trajnim lakom.", duration: 60, cleanup: 10, price: 38 },
      { name: "Spa pedikura", category: "Ruke i stopala", description: "Kompletna estetska pedikura.", duration: 60, cleanup: 10, price: 45 },
      { name: "Relax masaža 60 min", category: "Masaže", description: "Opuštajuća masaža cijelog tijela.", duration: 60, cleanup: 10, price: 60 },
      { name: "Body Sculpt", category: "Tijelo", description: "Tretman oblikovanja tijela.", duration: 50, cleanup: 10, price: 75 },
    ],
    clientNames: [
      ["Sara", "Marić"], ["Nina", "Kovačić"], ["Ema", "Babić"], ["Maja", "Novak"],
      ["Iva", "Radić"], ["Lara", "Božić"], ["Tea", "Horvat"], ["Klara", "Matić"],
      ["Marina", "Vuković"], ["Lucija", "Barišić"], ["Martina", "Šarić"], ["Andrea", "Knežević"],
    ],
    care: {
      sensitivities: "Osjetljiva koža; ranije blago crvenilo nakon intenzivnijeg tretmana.",
      contraindications: "Prije intenzivnih tretmana provjeriti trenutno stanje kože.",
      preferences: "Preferira blaže tretmane i hidratantnu završnu njegu.",
      notes: "Demo klijentica s popunjenim profilom njege i sigurnosti.",
    },
    waitlistNote: "Preferira raniji termin ako se oslobodi mjesto.",
    bookingNote: "Prvi dolazak; preferira poslijepodnevni termin.",
  };
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function weekdayRelative(days: number) {
  let date = addDays(new Date(), days);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date = addDays(date, days < 0 ? -1 : 1);
  }
  return isoDate(date);
}

async function insertOrThrow<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  context: string,
) {
  const result = await promise;
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  if (!result.data) throw new Error(`${context}: no data returned`);
  return result.data;
}

export async function seedSalesTrialOrganization(args: {
  supabase: SupabaseClient;
  organizationId: string;
  locale: TrialLocale;
}): Promise<SeedResult> {
  const { supabase, organizationId, locale } = args;
  const copy = seedCopy(locale);

  const employees = await insertOrThrow(
    supabase
      .from("employees")
      .insert(
        copy.employeeNames.map(([firstName, lastName, jobTitle], index) => ({
          organization_id: organizationId,
          first_name: firstName,
          last_name: lastName,
          job_title: jobTitle,
          email: null,
          phone: null,
          is_active: true,
          sort_order: index + 1,
        })),
      )
      .select("id, first_name, last_name"),
    "Could not seed employees",
  );

  const rooms = await insertOrThrow(
    supabase
      .from("rooms")
      .insert(
        copy.rooms.map((name, index) => ({
          organization_id: organizationId,
          name,
          capacity: 1,
          is_active: true,
          sort_order: index + 1,
        })),
      )
      .select("id, name"),
    "Could not seed rooms",
  );

  const services = await insertOrThrow(
    supabase
      .from("services")
      .insert(
        copy.services.map((service, index) => ({
          organization_id: organizationId,
          name: service.name,
          category: service.category,
          description: service.description,
          duration_minutes: service.duration,
          cleanup_minutes: service.cleanup,
          price: service.price,
          currency: "EUR",
          is_active: true,
          is_online_bookable: true,
          sort_order: index + 1,
        })),
      )
      .select("id, name, duration_minutes, price, currency"),
    "Could not seed services",
  );

  await insertOrThrow(
    supabase
      .from("equipment")
      .insert([
        {
          organization_id: organizationId,
          name: "Body Sculpt",
          description: locale === "it" ? "Dispositivo demo" : locale === "en" ? "Demo device" : "Demo uređaj",
          quantity_total: 1,
          is_active: true,
          sort_order: 1,
        },
      ])
      .select("id"),
    "Could not seed equipment",
  );

  const salonHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    organization_id: organizationId,
    day_of_week: dayOfWeek,
    opens_at: dayOfWeek === 0 ? "09:00" : "08:00",
    closes_at: dayOfWeek === 0 ? "17:00" : "20:00",
    is_closed: dayOfWeek === 0,
  }));
  const { error: hoursError } = await supabase
    .from("salon_working_hours")
    .insert(salonHours);
  if (hoursError) throw new Error(`Could not seed salon hours: ${hoursError.message}`);

  const schedules = employees.flatMap((employee, employeeIndex) =>
    Array.from({ length: 7 }, (_, dayOfWeek) => {
      const works =
        dayOfWeek !== 0 &&
        (employeeIndex < 2 || (dayOfWeek >= 1 && dayOfWeek <= 5));
      return {
        organization_id: organizationId,
        employee_id: employee.id,
        day_of_week: dayOfWeek,
        is_working: works,
        start_time: works ? (employeeIndex === 2 ? "11:00" : "09:00") : null,
        end_time: works ? (employeeIndex === 2 ? "19:00" : "17:00") : null,
      };
    }),
  );
  const { error: scheduleError } = await supabase
    .from("employee_default_schedule")
    .insert(schedules);
  if (scheduleError) throw new Error(`Could not seed schedules: ${scheduleError.message}`);

  const employeeServices = services.map((service, index) => ({
    organization_id: organizationId,
    employee_id: employees[index < 3 ? 0 : index < 6 ? 1 : 2].id,
    service_id: service.id,
  }));
  const { error: employeeServicesError } = await supabase
    .from("employee_services")
    .insert(employeeServices);
  if (employeeServicesError) {
    throw new Error(`Could not seed employee/service mappings: ${employeeServicesError.message}`);
  }

  const serviceRooms = services.map((service, index) => ({
    organization_id: organizationId,
    service_id: service.id,
    room_id: rooms[index < 3 ? 0 : index < 6 ? 1 : 2].id,
  }));
  const { error: serviceRoomsError } = await supabase
    .from("service_rooms")
    .insert(serviceRooms);
  if (serviceRoomsError) {
    throw new Error(`Could not seed service/room mappings: ${serviceRoomsError.message}`);
  }

  const clients = await insertOrThrow(
    supabase
      .from("clients")
      .insert(
        copy.clientNames.map(([firstName, lastName], index) => ({
          organization_id: organizationId,
          first_name: firstName,
          last_name: lastName,
          email: null,
          phone: null,
          notes: index === 2 ? copy.care.notes : null,
          allergies_sensitivities: index === 2 ? copy.care.sensitivities : null,
          contraindications: index === 2 ? copy.care.contraindications : null,
          treatment_preferences: index === 2 ? copy.care.preferences : null,
          marketing_consent: false,
          marketing_email_status: "unknown",
          marketing_email_source: "manual",
          is_active: true,
        })),
      )
      .select("id, first_name, last_name"),
    "Could not seed clients",
  );

  const appointmentSpecs: Array<{
    date: string;
    employeeIndex: number;
    serviceIndex: number;
    clientIndex: number;
    roomIndex: number;
    startTime: string;
    status: "completed" | "cancelled" | "no_show" | "scheduled" | "confirmed";
  }> = [];

  const pastOffsets = [-27, -24, -21, -18, -15, -12, -9, -6, -4, -2];
  pastOffsets.forEach((offset, index) => {
    const employeeIndex = index % 3;
    appointmentSpecs.push({
      date: weekdayRelative(offset),
      employeeIndex,
      serviceIndex: employeeIndex === 0 ? index % 3 : employeeIndex === 1 ? 3 + (index % 3) : 6 + (index % 2),
      clientIndex: (index + 3) % clients.length,
      roomIndex: employeeIndex,
      startTime: employeeIndex === 2 ? "13:00" : index % 2 === 0 ? "10:00" : "14:00",
      status: index === 3 ? "cancelled" : index === 7 ? "no_show" : "completed",
    });
  });

  appointmentSpecs.push(
    { date: weekdayRelative(-84), employeeIndex: 2, serviceIndex: 6, clientIndex: 0, roomIndex: 2, startTime: "13:00", status: "completed" },
    { date: weekdayRelative(-49), employeeIndex: 2, serviceIndex: 6, clientIndex: 0, roomIndex: 2, startTime: "13:00", status: "completed" },
  );

  const futureOffsets = [1, 2, 3, 5, 7, 9, 12];
  futureOffsets.forEach((offset, index) => {
    const employeeIndex = index % 3;
    appointmentSpecs.push({
      date: weekdayRelative(offset),
      employeeIndex,
      serviceIndex: employeeIndex === 0 ? index % 3 : employeeIndex === 1 ? 3 + (index % 3) : 6 + (index % 2),
      clientIndex: 4 + (index % Math.max(clients.length - 4, 1)),
      roomIndex: employeeIndex,
      startTime: employeeIndex === 2 ? "16:00" : index % 2 === 0 ? "11:00" : "15:00",
      status: index % 2 === 0 ? "confirmed" : "scheduled",
    });
  });

  let appointmentCount = 0;
  for (const spec of appointmentSpecs) {
    const service = services[spec.serviceIndex];
    const client = clients[spec.clientIndex];
    const [hour, minute] = spec.startTime.split(":").map(Number);
    const endMinutes = hour * 60 + minute + Number(service.duration_minutes ?? 60);
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const appointment = await insertOrThrow(
      supabase
        .from("appointments")
        .insert({
          organization_id: organizationId,
          client_id: client.id,
          employee_id: employees[spec.employeeIndex].id,
          room_id: rooms[spec.roomIndex].id,
          appointment_date: spec.date,
          start_time: spec.startTime,
          end_time: endTime,
          status: spec.status,
          client_name: `${client.first_name} ${client.last_name ?? ""}`.trim(),
          client_email: null,
          client_phone: null,
          notes: null,
          source: "sales_trial_seed",
          total_price: service.price,
          currency: service.currency ?? "EUR",
        })
        .select("id")
        .single(),
      "Could not seed appointment",
    );

    const { error: appointmentServiceError } = await supabase
      .from("appointment_services")
      .insert({
        organization_id: organizationId,
        appointment_id: appointment.id,
        service_id: service.id,
        service_name: service.name,
        duration_minutes: service.duration_minutes,
        price: service.price,
        currency: service.currency ?? "EUR",
        sort_order: 0,
      });
    if (appointmentServiceError) {
      throw new Error(`Could not seed appointment service: ${appointmentServiceError.message}`);
    }
    appointmentCount += 1;
  }

  const { error: waitlistError } = await supabase.from("waitlist_entries").insert({
    organization_id: organizationId,
    client_id: clients[1].id,
    service_id: services[1].id,
    preferred_employee_id: employees[0].id,
    preferred_date_from: weekdayRelative(2),
    preferred_date_to: weekdayRelative(14),
    preferred_time_from: "09:00",
    preferred_time_to: "16:00",
    notes: copy.waitlistNote,
    status: "waiting",
  });
  if (waitlistError) throw new Error(`Could not seed waitlist: ${waitlistError.message}`);

  const requestedDate = weekdayRelative(4);
  const { error: bookingError } = await supabase
    .from("online_booking_requests")
    .insert({
      organization_id: organizationId,
      service_id: services[0].id,
      requested_date: requestedDate,
      start_time: "15:00",
      end_time: "16:00",
      duration_minutes: Number(services[0].duration_minutes ?? 60),
      suggested_employee_id: employees[0].id,
      suggested_room_id: rooms[0].id,
      client_full_name: locale === "it" ? "Cliente Online Demo" : locale === "en" ? "Online Demo Client" : "Online Demo Klijentica",
      client_phone: null,
      client_email: null,
      client_note: copy.bookingNote,
      language: locale,
      status: "pending",
    });
  if (bookingError) {
    throw new Error(`Could not seed online booking request: ${bookingError.message}`);
  }

  return {
    employees: employees.length,
    services: services.length,
    clients: clients.length,
    appointments: appointmentCount,
    waitlistEntries: 1,
    onlineBookingRequests: 1,
  };
}
