import Skeleton from "@/components/skeleton";
import PageShell from "@/components/page-shell";

export default function ClientsLoading() {
  return (
    <PageShell maxWidth="max-w-7xl">
      <section aria-busy="true" aria-label="Učitavanje klijenata" className="space-y-6">
        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <Skeleton className="h-9 w-40" />
              <Skeleton className="h-5 w-72 max-w-full" />
            </div>
            <Skeleton className="h-10 w-full sm:w-32" />
          </div>
        </div>

        <div className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <Skeleton className="h-12 w-full" />
        </div>

        <div className="grid gap-4 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm"
            >
              <div className="flex justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-48 max-w-full" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
              <div className="mt-5 flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-app-soft bg-app-card shadow-sm md:block">
          <div className="space-y-1 p-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
