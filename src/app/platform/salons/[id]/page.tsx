import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { getPlatformSalonById } from "@/features/platform-admin/queries";
import SalonStatusControl from "@/features/platform-admin/components/salon-status-control";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("hr-HR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href="/platform"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Natrag na salone
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-extrabold tracking-tight text-slate-950">
                  {salon.name}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    salon.isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {salon.isActive ? "Aktivan" : "Suspendiran"}
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

          <SalonStatusControl
            organizationId={salon.id}
            organizationName={salon.name}
            isActive={salon.isActive}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <UsersRound className="h-5 w-5 text-slate-600" />
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {salon.members.filter((member) => member.isActive).length}
          </p>
          <p className="mt-1 text-sm text-slate-500">Aktivnih članova</p>
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
          <p className="mt-4 text-3xl font-extrabold text-slate-950">
            {salon.feedback.total}
          </p>
          <p className="mt-1 text-sm text-slate-500">Ukupno feedbacka</p>
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
              <Clock3 className="h-4 w-4" /> Status tenant računa
            </div>
            <p className="mt-2">
              Suspendiranje blokira pristup salon dashboardu svim članovima ovog
              tenanta. Ne briše nijedan podatak i može se poništiti ponovnom
              aktivacijom.
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
