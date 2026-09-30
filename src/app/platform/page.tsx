import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock3,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { getPlatformOverview } from "@/features/platform-admin/queries";
import { getShowcaseDemoStatuses } from "@/features/platform-admin/showcase-demo-queries";
import PlatformSalonDirectory from "@/features/platform-admin/components/platform-salon-directory";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          {icon}
        </span>
      </div>
    </div>
  );
}

export default async function PlatformAdminPage() {
  const [{ salons, stats }, demos] = await Promise.all([
    getPlatformOverview(),
    getShowcaseDemoStatuses(),
  ]);

  const demoOrganizationIds = demos
    .map((demo) => demo.organizationId)
    .filter((id): id is string => Boolean(id));
  const demoIds = new Set(demoOrganizationIds);
  const customerSalons = salons.filter((salon) => !demoIds.has(salon.id));

  const activeCustomers = customerSalons.filter(
    (salon) => salon.lifecycleStatus === "active",
  ).length;
  const trialCustomers = customerSalons.filter(
    (salon) => salon.lifecycleStatus === "trial",
  ).length;
  const attentionCustomers = customerSalons.filter(
    (salon) =>
      salon.lifecycleStatus === "past_due" ||
      salon.lifecycleStatus === "suspended",
  ).length;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              MiT Salon
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
              Platform Admin
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Tenant računi, paketi, lifecycle, billing metadata i centralni
              feedback. Showcase demo saloni odvojeni su od stvarnih klijentskih
              računa kako ne bi ulazili u poslovne statistike.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/platform/demos"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4" /> Showcase demo
            </Link>
            <Link
              href="/platform/feedback"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <MessageSquareText className="h-4 w-4" /> Otvori feedback
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Klijentski saloni"
          value={customerSalons.length}
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Aktivni klijenti"
          value={activeCustomers}
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label="Trial"
          value={trialCustomers}
          icon={<Sparkles className="h-5 w-5" />}
        />
        <StatCard
          label="Demo saloni"
          value={demoOrganizationIds.length}
          icon={<UsersRound className="h-5 w-5" />}
        />
        <StatCard
          label="Za provjeru"
          value={attentionCustomers}
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <StatCard
          label="Otvoreni feedback"
          value={stats.openFeedback}
          icon={<Clock3 className="h-5 w-5" />}
        />
      </section>

      <PlatformSalonDirectory
        salons={salons}
        demoOrganizationIds={demoOrganizationIds}
      />
    </div>
  );
}
