"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { quickUpdateAppointmentStatusAction } from "@/features/appointments/actions";
import type { AppointmentStatus } from "@/features/appointments/types";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
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
  locale = "hr",
  appointmentId,
  currentStatus,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.appointments;
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
        label={pending ? t.saving : t.completed}
        className="bg-[#776B5D]"
        disabled={pending}
        onClick={() => updateStatus("completed")}
      />
      <ActionChip
        label={t.noShow}
        className="bg-[#4B4844]"
        disabled={pending}
        onClick={() => updateStatus("no_show")}
      />
      <ActionChip
        label={t.cancelAppointment}
        className="bg-[#B0A695]"
        disabled={pending}
        onClick={() => updateStatus("cancelled")}
      />
    </div>
  );
}
