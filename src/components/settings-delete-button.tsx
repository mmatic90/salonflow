"use client";

import { Trash2 } from "lucide-react";
import ConfirmActionButton from "@/components/confirm-action-button";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type DeleteResult = {
  ok: boolean;
  message: string;
};

type Props = {
  locale?: AppLocale;
  label: string;
  onDelete: () => Promise<DeleteResult>;
};

export default function SettingsDeleteButton({ locale = "hr", label, onDelete }: Props) {
  const t = getDictionary(locale).deleteConfirm;
  return (
    <ConfirmActionButton
      title={t.title}
      description={`${t.descriptionPrefix} ${label}? ${t.descriptionSuffix}`}
      confirmLabel={t.confirm}
      cancelLabel={t.cancel}
      action={onDelete}
      destructive
      trigger={
        <span className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white p-2 text-red-700 transition hover:-translate-y-0.5 hover:bg-red-50 hover:shadow-sm">
          <Trash2 className="h-4 w-4" />
        </span>
      }
    />
  );
}
