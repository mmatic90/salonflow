export type EmployeeListItem = {
  id: string;
  display_name: string;
  color_hex: string | null;
};

export type EmployeeDefaultScheduleItem = {
  id: string;
  employee_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
};

export type EmployeeScheduleOverrideItem = {
  id: string;
  employee_id: string;
  override_date: string;
  override_type: "custom_hours" | "day_off" | "vacation" | "sick_leave";
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

export type EmployeeUpcomingScheduleItem = {
  date: string;
  day_label: string;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
  status_label: string;
  reason_label: string | null;
  is_override: boolean;
};

export type SalonScheduleHourItem = {
  day_of_week: number;
  opens_at: string;
  closes_at: string;
  is_closed: boolean;
};

export type EmployeeSchedulePageData = {
  employee: EmployeeListItem;
  defaultSchedule: EmployeeDefaultScheduleItem[];
  overrides: EmployeeScheduleOverrideItem[];
  upcomingSchedule: EmployeeUpcomingScheduleItem[];
  salonHours: SalonScheduleHourItem[];
};
