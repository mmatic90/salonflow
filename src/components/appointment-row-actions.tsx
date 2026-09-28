"use client";

import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import ConfirmActionButton from "@/components/confirm-action-button";
import { deleteAppointmentAction } from "@/features/appointments/actions";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  locale?: AppLocale;
  appointmentId: string;
  appointmentDate: string;
};

export default function AppointmentRowActions({
  locale = "hr",
  appointmentId,
  appointmentDate,
}: Props) {
  const dictionary = getDictionary(locale);
  const t = dictionary.appointments;
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/dashboard/appointments/${appointmentId}/edit`}
        className="inline-flex items-center justify-center rounded-xl border border-app-soft bg-white p-2 text-app-muted transition hover:-translate-y-0.5 hover:bg-app-bg hover:text-app-accent hover:shadow-sm"
        title={t.editAppointment}
      >
        <Pencil className="h-4 w-4" />
      </Link>

      <ConfirmActionButton
        title={t.deleteTitle}
        description={t.deleteDescription}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
        destructive
        action={async () => {
          const result = await deleteAppointmentAction(
            appointmentId,
            appointmentDate,
          );

          if (result.ok) {
            toast.success(result.message);
            router.refresh();
          } else {
            toast.error(result.message);
          }

          return result;
        }}
        trigger={
          <span
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white p-2 text-red-700 transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm"
            title={t.deleteAppointment}
          >
            <Trash2 className="h-4 w-4" />
          </span>
        }
      />
    </div>
  );
}
