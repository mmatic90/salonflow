export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  currency: string;
  category: string | null;
  is_active: boolean;
  is_online_bookable: boolean;
};

export type RoomItem = {
  id: string;
  name: string;
  is_active: boolean;
};

export type EquipmentItem = {
  id: string;
  name: string;
  quantity_total: number;
  is_active: boolean;
};

export type EmployeeItem = {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  color: string;
  is_active: boolean;
};

export type SalonWorkingHourItem = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

export type ServiceGroupLimitItem = {
  group_name: string;
  max_parallel: number;
};
