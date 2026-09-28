import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getPlatformSalonById } from "@/features/platform-admin/queries";
import SalonPlanLifecycleControl from "@/features/platform-admin/components/salon-plan-lifecycle-control";
import SalonBillingContactControl from "@/features/platform-admin/components/salon-billing-contact-control";
import {
  billingProviderLabel,
  isStripeBillingConnected,
} from "@/lib/billing";
import {
  lifecycleLabel,
  salonPlans,
  type SalonLifecycleStatus,
} from "@/lib/plans";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("hr-HR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function lifecycleClasses(status: SalonLifecycleStatus) {
  switch (status) {
    case "trial":
      return "bg-blue-100 text-blue-800";
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "past_due":
      return "bg-amber-100 text-amber-800";
    case "suspended":
      return "bg-red-100 text-red-800";
  }
}

function roleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Vlasnik";
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "employee":
      return "Djelatnik";
    default:
      return role;
  }
}

function DetailCard({
  label,
  value,
}: {
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-semibold text-slate-900">
        {value === null || value === "" ? "-" : value}
      </p>
    </div>
  );
}

export default async function PlatformSalonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const salon = await getPlatformSalonById(id);
  if (!salon) notFound();

  const address = [
    salon.addressLine1,
    salon.addressLine2,
    [salon.postalCode, salon.city].filter(Boolean).join(" "),
    salon.countryCode,
  ]
    .filter(Boolean)
    .join(", ");
  const stripeConnected = isStripeBillingConnected({
    provider: salon.billingProvider,
    stripeCustomerId: salon.stripeCustomerId,
    stripeSubscriptionId: salon.stripeSubscriptionId,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href="/platform"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Natrag na salone
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Building2 className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-3xl font-extrabold tracking-tight text-slate-950">
                {salon.name}
              </h1>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700">
                {salonPlans[salon.planCode].name}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${lifecycleClasses(
                  salon.lifecycleStatus,
                )}`}
              >
                {lifecycleLabel(salon.lifecycleStatus)}
              </span>
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800">
                Billing: {billingProviderLabel(salon.billingProvider)}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              /{salon.slug} · {salon.locale.toUpperCase()} · {salon.currency}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Platformski pregled tenant računa. Ovdje se ne prikazuju klijenti,
              termini, prihodi ni tretmanski podaci salona.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <UsersRound className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {salon.members.filter((member) => member.isActive).length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Aktivnih članova</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <CreditCard className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-2xl font-extrabold text-slate-950">
            {salonPlans[salon.planCode].name}
          </p>
          <p className="mt-1 text-sm text-slate-500">Trenutni plan</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <MessageSquareText className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {salon.feedback.open}
          </p>
          <p className="mt-1 text-sm text-slate-500">Otvorenih feedbacka</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-2xl font-extrabold text-slate-950">
            {lifecycleLabel(salon.lifecycleStatus)}
          </p>
          <p className="mt-1 text-sm text-slate-500">Lifecycle status</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-950">Tenant podaci</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailCard label="Naziv" value={salon.name} />
              <DetailCard label="Slug" value={salon.slug} />
              <DetailCard label="Jezik" value={salon.locale.toUpperCase()} />
              <DetailCard label="Valuta" value={salon.currency} />
              <DetailCard label="Vremenska zona" value={salon.timezone} />
              <DetailCard label="Država" value={salon.countryCode} />
              <DetailCard label="Kreiran" value={formatDate(salon.createdAt)} />
              <DetailCard label="Zadnja promjena" value={formatDate(salon.updatedAt)} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-950">Plan i lifecycle</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailCard label="Plan" value={salonPlans[salon.planCode].name} />
              <DetailCard label="Status" value={lifecycleLabel(salon.lifecycleStatus)} />
              <DetailCard label="Trial počeo" value={formatDateOnly(salon.trialStartedAt)} />
              <DetailCard label="Trial završava" value={formatDateOnly(salon.trialEndsAt)} />
              <DetailCard label="Plan zadnje promijenjen" value={formatDate(salon.planChangedAt)} />
              <DetailCard label="Dashboard pristup" value={salon.isActive ? "Omogućen" : "Blokiran"} />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-slate-600" />
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Billing readiness</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Provider metadata za buduću Stripe integraciju.
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  stripeConnected
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {stripeConnected ? "Stripe povezan" : "Stripe nije povezan"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailCard label="Billing provider" value={billingProviderLabel(salon.billingProvider)} />
              <DetailCard label="Billing email" value={salon.billingEmail} />
              <DetailCard label="Stripe customer" value={salon.stripeCustomerId} />
              <DetailCard label="Stripe subscription" value={salon.stripeSubscriptionId} />
              <DetailCard label="Stripe price" value={salon.stripePriceId} />
              <DetailCard
                label="Cancel na kraju perioda"
                value={salon.billingCancelAtPeriodEnd ? "Da" : "Ne"}
              />
              <DetailCard label="Period od" value={formatDate(salon.billingPeriodStart)} />
              <DetailCard label="Period do" value={formatDate(salon.billingPeriodEnd)} />
              <DetailCard label="Billing zadnje promijenjen" value={formatDate(salon.billingUpdatedAt)} />
            </div>

            <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              Stripe ID-evi se namjerno ne mogu ručno uređivati. Kasnije ih treba
              postaviti isključivo Stripe checkout/webhook integracija kako bismo
              izbjegli nekonzistentne pretplate.
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <UserRound className="h-5 w-5 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-950">Vlasnik i kontakt</h2>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailCard label="Vlasnik" value={salon.ownerName} />
              <DetailCard label="Email vlasnika" value={salon.ownerEmail} />
              <DetailCard label="Email salona" value={salon.email} />
              <DetailCard label="Telefon salona" value={salon.phone} />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                <MapPin className="h-3.5 w-3.5" /> Adresa
              </p>
              <p className="mt-2 font-semibold text-slate-900">{address || "-"}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <SalonPlanLifecycleControl
            organizationId={salon.id}
            organizationName={salon.name}
            planCode={salon.planCode}
            lifecycleStatus={salon.lifecycleStatus}
            trialEndsAt={salon.trialEndsAt}
          />

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.1em] text-slate-400">
                Billing kontakt
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">
                Administrativni email
              </h2>
            </div>
            <div className="mt-5">
              <SalonBillingContactControl
                organizationId={salon.id}
                billingEmail={salon.billingEmail}
              />
            </div>
          </section>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <UsersRound className="h-5 w-5 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-950">Članovi računa</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {salon.members.length}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {salon.members.map((member) => (
                <div
                  key={member.userId}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">
                        {member.displayName || member.email || "Korisnik"}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {member.email || "Email nije dostupan"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                        member.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {member.isActive ? "Aktivan" : "Neaktivan"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">
                      {roleLabel(member.role)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" /> Od {formatDate(member.joinedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <MessageSquareText className="h-5 w-5 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-950">Feedback</h2>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <DetailCard label="Otvoreno" value={salon.feedback.open} />
              <DetailCard label="Riješeno" value={salon.feedback.resolved} />
            </div>
            <Link
              href="/platform/feedback"
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <MessageSquareText className="h-4 w-4" /> Otvori centralni feedback
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-6 text-slate-600 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Clock3 className="h-4 w-4" /> Lifecycle i billing pravila
            </div>
            <p className="mt-2">
              Trial i Past due trenutno ne blokiraju pristup. Suspended blokira
              salon dashboard svim članovima tenanta, bez brisanja podataka.
              Billing provider je zasad Manualno i Stripe još ne upravlja
              lifecycleom automatski.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              {salon.email ? (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {salon.email}
                </span>
              ) : null}
              {salon.phone ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {salon.phone}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
