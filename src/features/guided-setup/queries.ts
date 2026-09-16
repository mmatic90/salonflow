import { createClient } from "@/lib/supabase/server";

export const guidedSetupStepCodes = [
  "profile",
  "working_hours",
  "employees",
  "services",
  "schedules",
  "employee_services",
  "resources",
  "online_booking",
] as const;

export type GuidedSetupStepCode = (typeof guidedSetupStepCodes)[number];

export type GuidedSetupProgress = {
  source: string;
  confirmedSteps: GuidedSetupStepCode[];
  startedAt: string;
  dismissedAt: string | null;
  completedAt: string | null;
};

export type GuidedSetupStepState = {
  code: GuidedSetupStepCode;
  confirmed: boolean;
  technicalReady: boolean;
};

export type GuidedSetupState = {
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  progress: GuidedSetupProgress | null;
  steps: GuidedSetupStepState[];
  confirmedCount: number;
  totalSteps: number;
  percentage: number;
  canComplete: boolean;
  counts: {
    activeEmployees: number;
    activeServices: number;
    scheduledEmployees: number;
    openDays: number;
    rooms: number;
    equipment: number;
    employeeServiceMappings: number;
    serviceRoomMappings: number;
    serviceEquipmentMappings: number;
    onlineBookableServices: number;
  };
};

function isGuidedSetupStepCode(value: string): value is GuidedSetupStepCode {
  return guidedSetupStepCodes.includes(value as GuidedSetupStepCode);
}

export async function getGuidedSetupProgress(
  organizationId: string,
): Promise<GuidedSetupProgress | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_setup_progress")
    .select("source, confirmed_steps, started_at, dismissed_at, completed_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    source: data.source,
    confirmedSteps: (data.confirmed_steps ?? []).filter(isGuidedSetupStepCode),
    startedAt: data.started_at,
    dismissedAt: data.dismissed_at ?? null,
    completedAt: data.completed_at ?? null,
  };
}

export async function getGuidedSetupState(
  organizationId: string,
): Promise<GuidedSetupState> {
  const supabase = await createClient();

  const [
    organizationResult,
    progressResult,
    employeesResult,
    servicesResult,
    workingHoursResult,
    schedulesResult,
    employeeServicesResult,
    roomsResult,
    equipmentResult,
    serviceRoomsResult,
    serviceEquipmentResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, email, timezone, currency")
      .eq("id", organizationId)
      .maybeSingle(),
    supabase
      .from("organization_setup_progress")
      .select("source, confirmed_steps, started_at, dismissed_at, completed_at")
      .eq("organization_id", organizationId)
      .maybeSingle(),
    supabase
      .from("employees")
      .select("id, is_active")
      .eq("organization_id", organizationId),
    supabase
      .from("services")
      .select("id, is_active, is_online_bookable")
      .eq("organization_id", organizationId),
    supabase
      .from("salon_working_hours")
      .select("day_of_week, is_closed")
      .eq("organization_id", organizationId),
    supabase
      .from("employee_default_schedule")
      .select("employee_id, is_working")
      .eq("organization_id", organizationId),
    supabase
      .from("employee_services")
      .select("employee_id, service_id")
      .eq("organization_id", organizationId),
    supabase
      .from("rooms")
      .select("id, is_active")
      .eq("organization_id", organizationId),
    supabase
      .from("equipment")
      .select("id, is_active")
      .eq("organization_id", organizationId),
    supabase
      .from("service_rooms")
      .select("service_id, room_id")
      .eq("organization_id", organizationId),
    supabase
      .from("service_equipment")
      .select("service_id, equipment_id")
      .eq("organization_id", organizationId),
  ]);

  const results = [
    organizationResult,
    progressResult,
    employeesResult,
    servicesResult,
    workingHoursResult,
    schedulesResult,
    employeeServicesResult,
    roomsResult,
    equipmentResult,
    serviceRoomsResult,
    serviceEquipmentResult,
  ];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);
  if (!organizationResult.data) throw new Error("Salon nije pronađen.");

  const activeEmployees = (employeesResult.data ?? []).filter((row) => row.is_active);
  const activeServices = (servicesResult.data ?? []).filter((row) => row.is_active);
  const activeRooms = (roomsResult.data ?? []).filter((row) => row.is_active);
  const activeEquipment = (equipmentResult.data ?? []).filter((row) => row.is_active);
  const activeEmployeeIds = new Set(activeEmployees.map((row) => row.id));
  const activeServiceIds = new Set(activeServices.map((row) => row.id));

  const scheduledEmployeeIds = new Set(
    (schedulesResult.data ?? [])
      .filter((row) => row.is_working && activeEmployeeIds.has(row.employee_id))
      .map((row) => row.employee_id),
  );
  const mappedServiceIds = new Set(
    (employeeServicesResult.data ?? [])
      .filter(
        (row) =>
          activeEmployeeIds.has(row.employee_id) && activeServiceIds.has(row.service_id),
      )
      .map((row) => row.service_id),
  );
  const openDays = (workingHoursResult.data ?? []).filter((row) => !row.is_closed).length;
  const onlineBookableServices = activeServices.filter(
    (row) => row.is_online_bookable,
  ).length;

  const rawProgress = progressResult.data;
  const confirmedSteps = (rawProgress?.confirmed_steps ?? []).filter(
    isGuidedSetupStepCode,
  );
  const confirmedSet = new Set<GuidedSetupStepCode>(confirmedSteps);

  const technicalReadiness: Record<GuidedSetupStepCode, boolean> = {
    profile: Boolean(
      organizationResult.data.name &&
        organizationResult.data.email &&
        organizationResult.data.timezone &&
        organizationResult.data.currency,
    ),
    working_hours: openDays > 0,
    employees: activeEmployees.length > 0,
    services: activeServices.length > 0,
    schedules:
      activeEmployees.length > 0 &&
      scheduledEmployeeIds.size === activeEmployees.length,
    employee_services:
      activeServices.length > 0 && mappedServiceIds.size === activeServices.length,
    resources: true,
    online_booking: true,
  };

  const steps = guidedSetupStepCodes.map((code) => ({
    code,
    confirmed: confirmedSet.has(code),
    technicalReady: technicalReadiness[code],
  }));
  const confirmedCount = steps.filter((step) => step.confirmed).length;
  const totalSteps = steps.length;
  const percentage = Math.round((confirmedCount / totalSteps) * 100);
  const canComplete = steps.every(
    (step) => step.confirmed && step.technicalReady,
  );

  return {
    organization: {
      id: organizationResult.data.id,
      name: organizationResult.data.name,
      slug: organizationResult.data.slug,
    },
    progress: rawProgress
      ? {
          source: rawProgress.source,
          confirmedSteps,
          startedAt: rawProgress.started_at,
          dismissedAt: rawProgress.dismissed_at ?? null,
          completedAt: rawProgress.completed_at ?? null,
        }
      : null,
    steps,
    confirmedCount,
    totalSteps,
    percentage,
    canComplete,
    counts: {
      activeEmployees: activeEmployees.length,
      activeServices: activeServices.length,
      scheduledEmployees: scheduledEmployeeIds.size,
      openDays,
      rooms: activeRooms.length,
      equipment: activeEquipment.length,
      employeeServiceMappings: (employeeServicesResult.data ?? []).length,
      serviceRoomMappings: (serviceRoomsResult.data ?? []).length,
      serviceEquipmentMappings: (serviceEquipmentResult.data ?? []).length,
      onlineBookableServices,
    },
  };
}
