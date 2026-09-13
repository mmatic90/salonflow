import {
  isPlanAtLeast,
  type SalonLifecycleStatus,
  type SalonPlanCode,
} from "@/lib/plans";

export const salonCapabilityCodes = [
  "calendar",
  "appointments",
  "clients",
  "services_resources",
  "employee_schedules",
  "online_booking",
  "notifications",
  "basic_reports",
  "waitlist",
  "smart_waitlist",
  "crm_insights",
  "attendance_insights",
  "advanced_reports",
  "advanced_crm",
  "automations",
  "integrations",
  "priority_support",
] as const;

export type SalonCapabilityCode = (typeof salonCapabilityCodes)[number];
export type SalonCapabilityAvailability = "available" | "planned";

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
    description: "Pregled i organizacija radnog kalendara salona.",
    minimumPlan: "starter",
    availability: "available",
  },
  appointments: {
    code: "appointments",
    name: "Upravljanje terminima",
    description: "Kreiranje, uređivanje i statusi termina.",
    minimumPlan: "starter",
    availability: "available",
  },
  clients: {
    code: "clients",
    name: "Klijenti",
    description: "Baza klijenata i osnovni profil klijenta.",
    minimumPlan: "starter",
    availability: "available",
  },
  services_resources: {
    code: "services_resources",
    name: "Usluge, sobe i oprema",
    description: "Upravljanje uslugama i resursima potrebnima za rezervaciju.",
    minimumPlan: "starter",
    availability: "available",
  },
  employee_schedules: {
    code: "employee_schedules",
    name: "Djelatnici i rasporedi",
    description: "Rasporedi, pauze i iznimke radnog vremena djelatnika.",
    minimumPlan: "starter",
    availability: "available",
  },
  online_booking: {
    code: "online_booking",
    name: "Online rezervacije",
    description: "Zaprimanje i obrada online booking zahtjeva.",
    minimumPlan: "starter",
    availability: "available",
  },
  notifications: {
    code: "notifications",
    name: "Osnovne obavijesti",
    description: "Email/SMS i reminder infrastruktura za termine.",
    minimumPlan: "starter",
    availability: "available",
  },
  basic_reports: {
    code: "basic_reports",
    name: "Osnovni izvještaji",
    description: "Osnovni operativni pregled rada salona.",
    minimumPlan: "starter",
    availability: "available",
  },
  waitlist: {
    code: "waitlist",
    name: "Lista čekanja",
    description: "Evidencija klijenata koji čekaju odgovarajući termin.",
    minimumPlan: "growth",
    availability: "available",
  },
  smart_waitlist: {
    code: "smart_waitlist",
    name: "Automatska lista čekanja",
    description: "Automatsko prepoznavanje oslobođenog kompatibilnog termina.",
    minimumPlan: "growth",
    availability: "available",
  },
  crm_insights: {
    code: "crm_insights",
    name: "CRM uvidi",
    description: "Segmentacija klijenata i korisni CRM signali.",
    minimumPlan: "growth",
    availability: "available",
  },
  attendance_insights: {
    code: "attendance_insights",
    name: "No-show i cancellation analiza",
    description: "Praćenje dolaznosti, no-show i otkazivanja klijenata.",
    minimumPlan: "growth",
    availability: "available",
  },
  advanced_reports: {
    code: "advanced_reports",
    name: "Napredni izvještaji",
    description: "Dublji pregled rezultata i ponašanja klijenata.",
    minimumPlan: "growth",
    availability: "available",
  },
  advanced_crm: {
    code: "advanced_crm",
    name: "Napredni CRM",
    description: "Napredniji CRM signali i workflow za zadržavanje klijenata.",
    minimumPlan: "pro",
    availability: "available",
  },
  automations: {
    code: "automations",
    name: "Napredne automatizacije",
    description: "Budući automatizirani follow-up i operativni workflowi.",
    minimumPlan: "pro",
    availability: "planned",
  },
  integrations: {
    code: "integrations",
    name: "Napredne integracije",
    description: "Buduće integracije s vanjskim servisima i alatima.",
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

export function getEffectiveEntitlementPlan(
  planCode: SalonPlanCode,
  lifecycleStatus: SalonLifecycleStatus,
): SalonPlanCode {
  // Trial intentionally unlocks the complete Pro feature set so a new salon can
  // evaluate SalonFlow before selecting its paid plan.
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
