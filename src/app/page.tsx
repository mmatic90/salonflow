import Link from "next/link";
import {
  CalendarCheck,
  Languages,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-app-bg text-app-text">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8">
        <header className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-app-muted">
              Salon management platform
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">SalonFlow</h1>
          </div>

          <Link
            href="/login"
            className="rounded-full bg-app-accent px-5 py-2.5 text-sm font-bold text-white"
          >
            Prijava
          </Link>
        </header>

        <div className="grid flex-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-app-soft bg-white/70 px-4 py-2 text-sm font-semibold text-app-muted">
              <CalendarCheck className="h-4 w-4" />
              Termini, klijenti i online rezervacije
            </div>

            <h2 className="mt-6 max-w-3xl text-5xl font-extrabold leading-tight md:text-7xl">
              SalonFlow za moderne salone.
            </h2>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-app-muted">
              Upravljanje terminima, zaposlenicima, rasporedima, prostorijama,
              klijentima, izvještajima i online rezervacijama u jednom sustavu.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-app-accent px-6 py-3.5 font-bold text-white shadow-sm"
              >
                Otvori SalonFlow
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
              <CalendarCheck className="h-7 w-7 text-app-accent" />
              <h3 className="mt-4 text-lg font-extrabold">Pametni termini</h3>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Dostupnost zaposlenika, soba i radnog vremena salona na jednom mjestu.
              </p>
            </div>

            <div className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
              <Users className="h-7 w-7 text-app-accent" />
              <h3 className="mt-4 text-lg font-extrabold">Više zaposlenika</h3>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Rasporedi, usluge i dostupnost za svaki tim i salon.
              </p>
            </div>

            <div className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
              <Palette className="h-7 w-7 text-app-accent" />
              <h3 className="mt-4 text-lg font-extrabold">Personalizacija</h3>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Više tema, branding salona i vlastita javna booking stranica.
              </p>
            </div>

            <div className="rounded-3xl border border-app-soft bg-white p-6 shadow-sm">
              <Languages className="h-7 w-7 text-app-accent" />
              <h3 className="mt-4 text-lg font-extrabold">HR / EN / IT</h3>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Višejezično iskustvo za salon i njegove klijente.
              </p>
            </div>

            <div className="rounded-3xl border border-app-soft bg-app-card p-6 shadow-sm sm:col-span-2">
              <ShieldCheck className="h-7 w-7 text-app-accent" />
              <h3 className="mt-4 text-lg font-extrabold">Multi-tenant arhitektura</h3>
              <p className="mt-2 text-sm leading-6 text-app-muted">
                Svaki salon ima vlastite podatke, postavke, booking URL i organizacijski prostor.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
