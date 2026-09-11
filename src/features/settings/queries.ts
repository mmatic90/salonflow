import { createClient } from "@/lib/supabase/server";
import { getCurrentUserPermissions } from "@/lib/permissions";
import type {
  EmployeeItem,
  EquipmentItem,
  RoomItem,
  ServiceItem,
  SalonWorkingHourItem,
  ServiceGroupLimitItem,
} from "./types";

export async function getServices(): Promise<ServiceItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, duration_minutes, price, currency, category, is_active, is_online_bookable")
    .eq("organization_id", permissions.organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti usluge.");
  }

  return (data ?? []) as ServiceItem[];
}

export async function getRooms(): Promise<RoomItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, is_active")
    .eq("organization_id", permissions.organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti sobe.");
  }

  return (data ?? []) as RoomItem[];
}

export async function getEquipment(): Promise<EquipmentItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const { data, error } = await supabase
    .from("equipment")
    .select("id, name, quantity_total, is_active")
    .eq("organization_id", permissions.organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti opremu.");
  }

  return (data ?? []) as EquipmentItem[];
}

export async function getEmployees(): Promise<EmployeeItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const { data, error } = await supabase
    .from("employees")
    .select("id, user_id, first_name, last_name, email, phone, color, is_active")
    .eq("organization_id", permissions.organizationId)
    .order("first_name", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti djelatnike.");
  }

  return (data ?? []).map((row: any) => ({
    ...row,
    display_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
  })) as EmployeeItem[];
}

export type ServiceRoomMappingRow = {
  service_id: string;
  room_id: string;
};


export async function getServiceRoomMappingData() {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const [
    { data: services, error: servicesError },
    { data: rooms, error: roomsError },
    { data: mappings, error: mappingsError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, is_active")
      .eq("organization_id", permissions.organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("rooms")
      .select("id, name, is_active")
      .eq("organization_id", permissions.organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("service_rooms")
      .select("service_id, room_id")
      .eq("organization_id", permissions.organizationId),
  ]);

  if (servicesError) throw new Error("Nije moguće dohvatiti usluge.");
  if (roomsError) throw new Error("Nije moguće dohvatiti sobe.");
  if (mappingsError) throw new Error("Nije moguće dohvatiti mapiranja usluga i soba.");

  return {
    services: services ?? [],
    rooms: rooms ?? [],
    mappings: (mappings ?? []) as ServiceRoomMappingRow[],
  };
}


export type EmployeeServiceMappingRow = {
  employee_id: string;
  service_id: string;
};

export async function getEmployeeServiceMappingData() {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const [
    { data: employees, error: employeesError },
    { data: services, error: servicesError },
    { data: mappings, error: mappingsError },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, first_name, last_name, is_active")
      .eq("organization_id", permissions.organizationId)
      .order("first_name", { ascending: true }),
    supabase
      .from("services")
      .select("id, name, is_active")
      .eq("organization_id", permissions.organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("employee_services")
      .select("employee_id, service_id")
      .eq("organization_id", permissions.organizationId),
  ]);

  if (employeesError) throw new Error("Nije moguće dohvatiti zaposlenike.");
  if (servicesError) throw new Error("Nije moguće dohvatiti usluge.");
  if (mappingsError) throw new Error("Nije moguće dohvatiti mapiranja zaposlenika i usluga.");

  return {
    employees: (employees ?? []).map((row: any) => ({
      ...row,
      display_name: [row.first_name, row.last_name].filter(Boolean).join(" "),
    })),
    services: services ?? [],
    mappings: (mappings ?? []) as EmployeeServiceMappingRow[],
  };
}


export type ServiceEquipmentMappingRow = {
  service_id: string;
  equipment_id: string;
};

export async function getServiceEquipmentMappingData() {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const [
    { data: services, error: servicesError },
    { data: equipment, error: equipmentError },
    { data: mappings, error: mappingsError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, is_active")
      .eq("organization_id", permissions.organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("equipment")
      .select("id, name, is_active")
      .eq("organization_id", permissions.organizationId)
      .order("name", { ascending: true }),
    supabase
      .from("service_equipment")
      .select("service_id, equipment_id")
      .eq("organization_id", permissions.organizationId),
  ]);

  if (servicesError) throw new Error("Nije moguće dohvatiti usluge.");
  if (equipmentError) throw new Error("Nije moguće dohvatiti opremu.");
  if (mappingsError) throw new Error("Nije moguće dohvatiti mapiranja usluga i opreme.");

  return {
    services: services ?? [],
    equipment: equipment ?? [],
    mappings: (mappings ?? []) as ServiceEquipmentMappingRow[],
  };
}

export async function getSalonWorkingHours(): Promise<SalonWorkingHourItem[]> {
  const supabase = await createClient();
  const permissions = await getCurrentUserPermissions();
  if (!permissions) throw new Error("Nemate pristup aktivnom salonu.");

  const { data, error } = await supabase
    .from("salon_working_hours")
    .select("day_of_week, opens_at, closes_at, is_closed")
    .eq("organization_id", permissions.organizationId)
    .order("day_of_week", { ascending: true });

  if (error) {
    console.error(error);
    throw new Error("Nije moguće dohvatiti radno vrijeme salona.");
  }

  return (data ?? []) as SalonWorkingHourItem[];
}

export async function getServiceGroupLimitsData() {
  const supabase = await createClient();

  const [
    { data: services, error: servicesError },
    { data: limits, error: limitsError },
  ] = await Promise.all([
    supabase
      .from("services")
      .select("service_group")
      .not("service_group", "is", null),

    supabase
      .from("service_group_limits")
      .select("group_name, max_parallel")
      .order("group_name", { ascending: true }),
  ]);

  if (servicesError) {
    console.error(servicesError);
    throw new Error("Nije moguće dohvatiti grupe usluga.");
  }

  if (limitsError) {
    console.error(limitsError);
    throw new Error("Nije moguće dohvatiti limite grupa.");
  }

  const uniqueGroups = Array.from(
    new Set(
      (services ?? [])
        .map((row) => row.service_group)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((a, b) => a.localeCompare(b, "hr"));

  return {
    groups: uniqueGroups,
    limits: (limits ?? []) as ServiceGroupLimitItem[],
  };
}
