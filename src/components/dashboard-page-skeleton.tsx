type Props = {
  showTable?: boolean;
};

function PulseBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-app-card-alt ${className}`} />;
}

export default function DashboardPageSkeleton({ showTable = true }: Props) {
  return (
    <main className="min-h-screen bg-app-bg p-4 md:p-6 lg:p-8" aria-busy="true" aria-label="Učitavanje sadržaja">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-app-soft bg-app-card p-6 shadow-sm">
          <PulseBlock className="h-9 w-48" />
          <PulseBlock className="mt-3 h-5 w-full max-w-xl" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <PulseBlock className="h-4 w-28" />
                  <PulseBlock className="mt-4 h-10 w-16" />
                </div>
                <PulseBlock className="h-12 w-12" />
              </div>
              <PulseBlock className="mt-5 h-4 w-full" />
            </div>
          ))}
        </section>

        {showTable ? (
          <section className="overflow-hidden rounded-2xl border border-app-soft bg-app-card shadow-sm">
            <div className="border-b border-app-soft p-6">
              <PulseBlock className="h-6 w-44" />
              <PulseBlock className="mt-2 h-4 w-72 max-w-full" />
            </div>
            <div className="space-y-3 p-4 md:p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-app-soft p-4 md:grid-cols-[100px_1.3fr_1fr_1fr]">
                  <PulseBlock className="h-5 w-20" />
                  <PulseBlock className="h-5 w-full" />
                  <PulseBlock className="h-5 w-full" />
                  <PulseBlock className="h-5 w-24" />
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
