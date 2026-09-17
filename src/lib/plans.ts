export const salonPlanCodes = ["starter", "growth", "pro"] as const;
export type SalonPlanCode = (typeof salonPlanCodes)[number];

export const salonLifecycleStatuses = [
  "trial",
  "active",
  "past_due",
  "suspended",
] as const;
export type SalonLifecycleStatus = (typeof salonLifecycleStatuses)[number];

export type SalonPlanDefinition = {
  code: SalonPlanCode;
  name: string;
  description: string;
  // Hard limits are intentionally not enforced yet. Keeping them nullable gives
  // us one central place to activate limits later without changing tenant data.
  limits: {
    maxEmployees: number | null;
    maxServices: number | null;
    maxLocations: number | null;
  };
};

const unlimitedFoundationLimits = {
  maxEmployees: null,
  maxServices: null,
  maxLocations: null,
} as const;

export const salonPlans: Record<SalonPlanCode, SalonPlanDefinition> = {
  starter: {
    code: "starter",
    name: "Starter",
    description:
      "Osnovni plan za manje salone kojima trebaju kalendar, klijenti, rasporedi i online rezervacije.",
    limits: { ...unlimitedFoundationLimits },
  },
  growth: {
    code: "growth",
    name: "Growth",
    description:
      "Plan za salone koji žele automatiziranu listu čekanja, CRM uvide i naprednije izvještaje.",
    limits: { ...unlimitedFoundationLimits },
  },
  pro: {
    code: "pro",
    name: "Pro",
    description:
      "Najviši plan za napredni CRM, automatizacije, integracije i premium workflow.",
    limits: { ...unlimitedFoundationLimits },
  },
};

export const salonPlanRank: Record<SalonPlanCode, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
};

export const DEFAULT_TRIAL_DAYS = 7;

export function isSalonPlanCode(value: unknown): value is SalonPlanCode {
  return (
    typeof value === "string" &&
    salonPlanCodes.includes(value as SalonPlanCode)
  );
}

export function normalizeSalonPlanCode(value: unknown): SalonPlanCode {
  return isSalonPlanCode(value) ? value : "starter";
}

export function isSalonLifecycleStatus(
  value: unknown,
): value is SalonLifecycleStatus {
  return (
    typeof value === "string" &&
    salonLifecycleStatuses.includes(value as SalonLifecycleStatus)
  );
}

export function normalizeSalonLifecycleStatus(
  value: unknown,
): SalonLifecycleStatus {
  return isSalonLifecycleStatus(value) ? value : "active";
}

export function isPlanAtLeast(
  planCode: SalonPlanCode,
  minimumPlan: SalonPlanCode,
) {
  return salonPlanRank[planCode] >= salonPlanRank[minimumPlan];
}

export function lifecycleLabel(status: SalonLifecycleStatus) {
  switch (status) {
    case "trial":
      return "Trial";
    case "active":
      return "Aktivan";
    case "past_due":
      return "Past due";
    case "suspended":
      return "Suspendiran";
  }
}
