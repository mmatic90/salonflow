"use client";

import { quickUpdateAppointmentStatusAction } from "@/features/appointments/actions";
import ConfirmActionButton from "@/components/confirm-action-button";
import type { AppointmentStatus } from "@/features/appointments/types";

type Props = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  compact?: boolean;
};

function ActionChip({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-medium text-white ${className}`}
    >
      {label}
    </span>
  );
}

export default function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: Props) {
  if (currentStatus !== "scheduled") {
    return null;
  }

  function updateStatus(status: "completed" | "no_show" | "cancelled") {
    return () => quickUpdateAppointmentStatusAction(appointmentId, status);
  }

  return (
    <div className="flex flex-wrap gap-1">
      <ConfirmActionButton
        title="Označiti termin kao odrađen?"
        description="Potvrdi ako je termin uspješno odrađen."
        confirmLabel="Odrađeno"
        action={updateStatus("completed")}
        trigger={<ActionChip label="Odrađeno" className="bg-[#776B5D]" />}
      />

      <ConfirmActionButton
        title="Označiti termin kao no-show?"
        description="Potvrdi ako klijent nije došao na termin."
        confirmLabel="No-show"
        action={updateStatus("no_show")}
        trigger={<ActionChip label="No-show" className="bg-[#4B4844]" />}
      />

      <ConfirmActionButton
        title="Otkazati termin?"
        description="Potvrdi ako želiš označiti termin kao otkazan."
        confirmLabel="Otkaži"
        destructive
        action={updateStatus("cancelled")}
        trigger={<ActionChip label="Otkaži" className="bg-[#B0A695]" />}
      />
    </div>
  );
}
