import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politika kolačića",
  description: "Informacije o nužnim kolačićima i srodnim tehnologijama koje koristi SalonFlow.",
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-app-bg px-6 py-12 text-app-text">
      <article className="mx-auto max-w-3xl rounded-3xl border border-app-soft bg-white p-6 shadow-sm sm:p-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-app-muted underline-offset-4 hover:underline"
          >
            ← SalonFlow
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Politika kolačića
          </h1>
          <p className="mt-3 text-sm text-app-muted">
            Posljednje ažuriranje: 28. rujna 2026.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-app-muted sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-app-text">1. Što SalonFlow koristi</h2>
            <p className="mt-3">
              SalonFlow koristi samo kolačiće i srodne tehnologije koji su potrebni za
              ispravan i siguran rad aplikacije. Oni mogu biti potrebni za prijavu,
              održavanje korisničke sesije, sigurnost računa i osnovno funkcioniranje
              aplikacije.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">
              2. Analitički i marketinški kolačići
            </h2>
            <p className="mt-3">
              Trenutna verzija SalonFlowa ne koristi analitičke ili marketinške kolačiće,
              oglasne piksele niti tehnologije za praćenje korisnika u marketinške svrhe.
              Zbog toga se za trenutačno korištene nužne tehnologije ne prikazuje banner
              za prihvaćanje ili odbijanje kolačića.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">3. Nužni kolačići</h2>
            <p className="mt-3">
              Nužni kolačići koriste se samo u svrhe bez kojih aplikacija ne bi mogla
              pouzdano pružiti traženu uslugu, primjerice za autentikaciju korisnika,
              održavanje prijavljene sesije i zaštitu od neovlaštenog pristupa.
            </p>
            <p className="mt-3">
              Blokiranje takvih kolačića u postavkama preglednika može uzrokovati da se
              pojedini dijelovi SalonFlowa, uključujući prijavu u korisnički račun, ne
              mogu pravilno koristiti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">4. Lokalne postavke</h2>
            <p className="mt-3">
              Aplikacija može koristiti lokalnu pohranu preglednika za spremanje
              nekritičnih korisničkih ili sučeljnih postavki. Takva lokalna pohrana nije
              namijenjena oglašavanju niti praćenju korisnika na drugim web-stranicama.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">5. Buduće promjene</h2>
            <p className="mt-3">
              Ako SalonFlow u budućnosti uvede analitiku, marketinške kolačiće ili druge
              tehnologije za koje je potrebna prethodna privola, ova će politika biti
              ažurirana i, kada je potrebno, prije njihove aktivacije bit će uveden
              odgovarajući mehanizam za upravljanje privolom.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">6. Kontakt</h2>
            <p className="mt-3">
              Za pitanja o privatnosti i korištenju kolačića možete se obratiti na{" "}
              <a
                href="mailto:mit.informatika@gmail.com"
                className="font-medium text-app-text underline underline-offset-4"
              >
                mit.informatika@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
