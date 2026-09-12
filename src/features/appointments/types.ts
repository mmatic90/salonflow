export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentListItem = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: AppointmentStatus;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  client_note: string | null;
  internal_note: string | null;
  service: {
    id: string;
    name: string;
    service_group: string | null;
    priority_room: string | null;
  } | null;
  appointment_services?: {
    id: string;
    service_id: string;
    duration_minutes: number;
    sort_order: number;
    service: {
      id: string;
      name: string;
      service_group: string | null;
    } | null;
  }[];
  room: {
    id: string;
    name: string;
  } | null;
  employee: {
    id: string;
    display_name: string;
    color_hex: string | null;
  } | null;
};

export type AppointmentServiceInput = {
  service_id: string;
  duration_minutes: number;
};

export type AppointmentServiceRow = {
  id: string;
  appointment_id: string;
  service_id: string;
  duration_minutes: number;
  sort_order: number;
  service: {
    id: string;
    name: string;
    service_group: string | null;
  } | null;
};