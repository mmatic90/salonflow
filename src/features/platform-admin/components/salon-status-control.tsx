"use client";

import { useTransition } from "react";
import { Loader2, PauseCircle, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setPlatformSalonActiveAction } from "@/features/platform-admin/actions";

export default function SalonStatusControl({
  organizationId,
  organizationName,
  isActive,
}: {
  organizationId: string;
  organizationName: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleChange() {
    const nextActive = !isActive;
    const confirmed = window.confirm(
      nextActive
        ? `Ponovno aktivirati salon “${organizationName}”? Korisnici će ponovno moći pristupiti salon dashboardu.`
        : `Suspendirati salon “${organizationName}”? Korisnici više neće moći pristupiti salon dashboardu, ali podaci se neće obrisati.`,
    );

    if (!confirmed) return;

    startTransition(async () => {
      const result = await setPlatformSalonActiveAction(
        organizationId,
        nextActive,
      );

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success(
        result.isActive
          ? "Salon je ponovno aktiviran."
          : "Salon je suspendiran. Podaci su sačuvani.",
      );
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleChange}
      disabled={pending}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
        isActive
          ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "bg-emerald-700 text-white hover:bg-emerald-800"
      }`}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isActive ? (
        <PauseCircle className="h-4 w-4" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      {pending
        ? "Spremanje..."
        : isActive
          ? "Suspendiraj salon"
          : "Ponovno aktiviraj salon"}
    </button>
  );
}
