export const salonPlanCodes = ["starter", "pro"] as const;
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

export const salonPlans: Record<SalonPlanCode, SalonPlanDefinition> = {
  starter: {
    code: "starter",
    name: "Starter",
    description: "Osnovni plan za manje salone i početak rada u SalonFlowu.",
    limits: {
      maxEmployees: null,
      maxServices: null,
      maxLocations: 1,
    },
  },
  pro: {
    code: "pro",
    name: "Pro",
    description: "Napredni plan za salone kojima treba puni SalonFlow workflow.",
    limits: {
      maxEmployees: null,
      maxServices: null,
      maxLocations: null,
    },
  },
};

export const DEFAULT_TRIAL_DAYS = 14;

export function isSalonPlanCode(value: unknown): value is SalonPlanCode {
  return typeof value === "string" && salonPlanCodes.includes(value as SalonPlanCode);
}

export function isSalonLifecycleStatus(
  value: unknown,
): value is SalonLifecycleStatus {
  return (
    typeof value === "string" &&
    salonLifecycleStatuses.includes(value as SalonLifecycleStatus)
  );
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
