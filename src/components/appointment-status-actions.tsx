"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { quickUpdateAppointmentStatusAction } from "@/features/appointments/actions";
import type { AppointmentStatus } from "@/features/appointments/types";

type Props = {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  compact?: boolean;
};

type QuickStatus = "completed" | "no_show" | "cancelled";

function ActionChip({
  label,
  className,
  disabled,
  onClick,
}: {
  label: string;
  className: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex rounded-lg px-2 py-1 text-[11px] font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {label}
    </button>
  );
}

export default function AppointmentStatusActions({
  appointmentId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (currentStatus !== "scheduled") {
    return null;
  }

  function updateStatus(status: QuickStatus) {
    startTransition(async () => {
      const result = await quickUpdateAppointmentStatusAction(
        appointmentId,
        status,
      );

      if (result.ok) {
        toast.success(result.message);
        router.refresh();
        return;
      }

      toast.error(result.message);
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      <ActionChip
        label={pending ? "Spremanje..." : "Odrađeno"}
        className="bg-[#776B5D]"
        disabled={pending}
        onClick={() => updateStatus("completed")}
      />
      <ActionChip
        label="No-show"
        className="bg-[#4B4844]"
        disabled={pending}
        onClick={() => updateStatus("no_show")}
      />
      <ActionChip
        label="Otkaži"
        className="bg-[#B0A695]"
        disabled={pending}
        onClick={() => updateStatus("cancelled")}
      />
    </div>
  );
}
