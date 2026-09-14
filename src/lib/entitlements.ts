import {
  isPlanAtLeast,
  type SalonLifecycleStatus,
  type SalonPlanCode,
} from "@/lib/plans";

export const salonCapabilityCodes = [
  "calendar",
  "appointments",
  "clients",
  "client_care_safety",
  "services_resources",
  "employee_schedules",
  "appearance_branding",
  "online_booking",
  "booking_notifications",
  "basic_reports",
  "waitlist",
  "smart_waitlist",
  "crm_insights",
  "attendance_insights",
  "advanced_reports",
  "appointment_reminders",
  "audit_log",
  "advanced_crm",
  "review_requests",
  "automations",
  "integrations",
  "priority_support",
] as const;

export type SalonCapabilityCode = (typeof salonCapabilityCodes)[number];
export type SalonCapabilityAvailability = "available" | "partial" | "planned";

export type SalonCapabilityDefinition = {
  code: SalonCapabilityCode;
  name: string;
  description: string;
  minimumPlan: SalonPlanCode;
  availability: SalonCapabilityAvailability;
};

export const salonCapabilities: Record<
  SalonCapabilityCode,
  SalonCapabilityDefinition
> = {
  calendar: {
    code: "calendar",
    name: "Kalendar",
    description:
      "Dnevni, tjedni i time-grid pregled termina i raspoloživosti.",
    minimumPlan: "starter",
    availability: "available",
  },
  appointments: {
    code: "appointments",
    name: "Upravljanje terminima",
    description:
      "Kreiranje, uređivanje, više usluga, statusi i provjera raspoloživosti termina.",
    minimumPlan: "starter",
    availability: "available",
  },
  clients: {
    code: "clients",
    name: "Klijenti i povijest",
    description:
      "Baza klijenata, kontaktni podaci, povijest termina i ponovno rezerviranje.",
    minimumPlan: "starter",
    availability: "available",
  },
  client_care_safety: {
    code: "client_care_safety",
    name: "Njega i sigurnost klijenta",
    description:
      "Alergije, osjetljivosti, kontraindikacije, preferencije i tretmanske bilješke po posjetu.",
    minimumPlan: "starter",
    availability: "available",
  },
  services_resources: {
    code: "services_resources",
    name: "Usluge, sobe i oprema",
    description:
      "Upravljanje uslugama, sobama, opremom i pravilima mapiranja resursa.",
    minimumPlan: "starter",
    availability: "available",
  },
  employee_schedules: {
    code: "employee_schedules",
    name: "Djelatnici i rasporedi",
    description:
      "Djelatnici, radni rasporedi, pauze, iznimke i mapiranje usluga.",
    minimumPlan: "starter",
    availability: "available",
  },
  appearance_branding: {
    code: "appearance_branding",
    name: "Izgled i osnovni branding",
    description:
      "Tema, logo i tenant postavke koje prilagođavaju SalonFlow pojedinom salonu.",
    minimumPlan: "starter",
    availability: "available",
  },
  online_booking: {
    code: "online_booking",
    name: "Online rezervacije",
    description:
      "Javna booking stranica, provjera raspoloživosti i obrada online zahtjeva.",
    minimumPlan: "starter",
    availability: "available",
  },
  booking_notifications: {
    code: "booking_notifications",
    name: "Email obavijesti",
    description:
      "SalonFlow Managed Email za potvrde i odbijanja online rezervacija te obavijesti pri kreiranju i promjeni termina.",
    minimumPlan: "growth",
    availability: "available",
  },
  basic_reports: {
    code: "basic_reports",
    name: "Osnovni operativni pregled",
    description:
      "Dashboard pokazatelji za današnje i sutrašnje termine, završene termine i no-show pregled.",
    minimumPlan: "starter",
    availability: "available",
  },
  waitlist: {
    code: "waitlist",
    name: "Lista čekanja",
    description:
      "Evidencija klijenata koji čekaju raniji ili trenutno nedostupan termin.",
    minimumPlan: "growth",
    availability: "available",
  },
  smart_waitlist: {
    code: "smart_waitlist",
    name: "Automatska lista čekanja",
    description:
      "Automatsko prepoznavanje oslobođenog kompatibilnog termina i dashboard prilika za rezervaciju.",
    minimumPlan: "growth",
    availability: "available",
  },
  crm_insights: {
    code: "crm_insights",
    name: "CRM uvidi",
    description:
      "Segmentacija klijenata, omiljene usluge/djelatnici, ritam dolazaka i CRM signali.",
    minimumPlan: "growth",
    availability: "available",
  },
  attendance_insights: {
    code: "attendance_insights",
    name: "No-show i cancellation analiza",
    description:
      "Stope dolaznosti, no-show i otkazivanja iz stvarno razriješenih termina.",
    minimumPlan: "growth",
    availability: "available",
  },
  advanced_reports: {
    code: "advanced_reports",
    name: "Napredni izvještaji",
    description:
      "Puni Reports modul: trendovi, statusi, online conversion, zaposlenici, usluge i zauzetost po danima.",
    minimumPlan: "growth",
    availability: "available",
  },
  appointment_reminders: {
    code: "appointment_reminders",
    name: "Automatski podsjetnici za termin",
    description:
      "Tenant-aware 24h email podsjetnici s provjerom plana, lifecyclea, localea i timezonea neposredno prije slanja.",
    minimumPlan: "growth",
    availability: "available",
  },
  audit_log: {
    code: "audit_log",
    name: "Audit log i export",
    description:
      "Tenant-scoped, nepromjenjiva povijest aktivnosti s filtrima i izvozom za napredniju kontrolu tima.",
    minimumPlan: "pro",
    availability: "available",
  },
  advanced_crm: {
    code: "advanced_crm",
    name: "Napredni CRM workflow",
    description:
      "Pro retention akcijska lista iz CRM signala s prioritetima, snoozeom, rebook shortcutom i append-only poviješću odluka.",
    minimumPlan: "pro",
    availability: "available",
  },
  review_requests: {
    code: "review_requests",
    name: "Automatski zahtjevi za recenziju",
    description:
      "Tenant-aware Google review zahtjev emailom nakon completed termina, s tenant review URL-om, odgodom, retry zaštitom i Managed Email kvotom.",
    minimumPlan: "pro",
    availability: "available",
  },
  automations: {
    code: "automations",
    name: "Napredne automatizacije",
    description:
      "Budući automatizirani follow-up i operativni workflowi izvan postojećih booking procesa.",
    minimumPlan: "pro",
    availability: "planned",
  },
  integrations: {
    code: "integrations",
    name: "Napredne integracije",
    description:
      "Buduće integracije s vanjskim servisima i alatima.",
    minimumPlan: "pro",
    availability: "planned",
  },
  priority_support: {
    code: "priority_support",
    name: "Prioritetna podrška",
    description: "Prioritetni kanal podrške za Pro salone.",
    minimumPlan: "pro",
    availability: "planned",
  },
};

export function isSalonCapabilityCode(
  value: unknown,
): value is SalonCapabilityCode {
  return (
    typeof value === "string" &&
    salonCapabilityCodes.includes(value as SalonCapabilityCode)
  );
}

export function buildCapabilityUpgradePath(
  capabilityCode: SalonCapabilityCode,
  returnTo = "/dashboard",
) {
  const params = new URLSearchParams({ capability: capabilityCode });
  if (returnTo.startsWith("/dashboard")) {
    params.set("returnTo", returnTo);
  }
  return `/dashboard/upgrade?${params.toString()}`;
}

export function getEffectiveEntitlementPlan(
  planCode: SalonPlanCode,
  lifecycleStatus: SalonLifecycleStatus,
): SalonPlanCode {
  // Trial intentionally unlocks the complete Pro feature set so a new salon
  // can evaluate SalonFlow before selecting its paid plan.
  return lifecycleStatus === "trial" ? "pro" : planCode;
}

export function planHasCapability(
  planCode: SalonPlanCode,
  capabilityCode: SalonCapabilityCode,
) {
  return isPlanAtLeast(
    planCode,
    salonCapabilities[capabilityCode].minimumPlan,
  );
}

export function organizationHasCapability(
  planCode: SalonPlanCode,
  lifecycleStatus: SalonLifecycleStatus,
  capabilityCode: SalonCapabilityCode,
) {
  return planHasCapability(
    getEffectiveEntitlementPlan(planCode, lifecycleStatus),
    capabilityCode,
  );
}

export function getPlanCapabilities(planCode: SalonPlanCode) {
  return salonCapabilityCodes
    .map((code) => salonCapabilities[code])
    .filter((capability) => planHasCapability(planCode, capability.code));
}

export function getCapabilitiesIntroducedByPlan(planCode: SalonPlanCode) {
  return salonCapabilityCodes
    .map((code) => salonCapabilities[code])
    .filter((capability) => capability.minimumPlan === planCode);
}
