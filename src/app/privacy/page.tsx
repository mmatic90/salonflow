import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politika privatnosti",
  description: "Informacije o obradi osobnih podataka u okviru SalonFlow usluge.",
};

export default function PrivacyPolicyPage() {
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
            Politika privatnosti
          </h1>
          <p className="mt-3 text-sm text-app-muted">
            Posljednje ažuriranje: 28. rujna 2026.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-app-muted sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-app-text">1. Tko smo mi</h2>
            <p className="mt-3">
              SalonFlow pruža M.i.T., obrt za informatičke usluge, vl. Maurizio Matić,
              Bregovita ulica – Via del Monte 17, 52210 Rovinj, Hrvatska, OIB
              29852487665.
            </p>
            <p className="mt-3">
              Za pitanja vezana uz privatnost možete se obratiti na{" "}
              <a
                href="mailto:mit.informatika@gmail.com"
                className="font-medium text-app-text underline underline-offset-4"
              >
                mit.informatika@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">2. Na što se ova politika odnosi</h2>
            <p className="mt-3">
              Ova Politika privatnosti opisuje kako obrađujemo osobne podatke vlasnika
              salona, zaposlenika, suradnika, korisnika SalonFlow računa, osoba koje nam
              se obraćaju te tehničke i sigurnosne podatke povezane s korištenjem
              SalonFlowa.
            </p>
            <p className="mt-3">
              Kada salon putem SalonFlowa obrađuje podatke svojih klijenata, salon je u
              pravilu voditelj obrade, a M.i.T. obrađuje te podatke kao izvršitelj obrade
              prema uputama salona i odgovarajućem ugovoru o obradi osobnih podataka.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">3. Koje podatke obrađujemo</h2>
            <p className="mt-3">Ovisno o načinu korištenja SalonFlowa možemo obrađivati:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>ime i prezime korisnika SalonFlow računa;</li>
              <li>email adresu, broj telefona i druge kontakt podatke;</li>
              <li>naziv i kontakt podatke salona;</li>
              <li>ulogu i ovlasti korisnika unutar salona;</li>
              <li>podatke o planu, trial razdoblju, naplati i poslovnom odnosu;</li>
              <li>komunikaciju s nama i zahtjeve za podršku;</li>
              <li>tehničke, audit i sigurnosne podatke povezane s korištenjem aplikacije;</li>
              <li>podatke potrebne za ispunjavanje zakonskih, poreznih i računovodstvenih obveza.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">4. Svrhe i pravne osnove</h2>
            <div className="mt-3 space-y-4">
              <div>
                <p className="font-semibold text-app-text">Pružanje SalonFlow usluge</p>
                <p>
                  Podatke obrađujemo radi otvaranja i održavanja računa, autentikacije,
                  upravljanja korisničkim ovlastima i pružanja ugovorenih funkcionalnosti.
                  Pravna osnova je izvršavanje ugovora ili poduzimanje radnji prije
                  sklapanja ugovora.
                </p>
              </div>
              <div>
                <p className="font-semibold text-app-text">Administracija i naplata</p>
                <p>
                  Podatke obrađujemo radi upravljanja pretplatom, računima, plaćanjima i
                  poslovnom dokumentacijom na temelju ugovora i primjenjivih zakonskih
                  obveza.
                </p>
              </div>
              <div>
                <p className="font-semibold text-app-text">Sigurnost i sprječavanje zlouporabe</p>
                <p>
                  Tehničke i sigurnosne podatke možemo obrađivati radi zaštite sustava,
                  korisničkih računa i podataka, na temelju našeg legitimnog interesa za
                  održavanje sigurnog i pouzdanog servisa.
                </p>
              </div>
              <div>
                <p className="font-semibold text-app-text">Korisnička podrška i komunikacija</p>
                <p>
                  Podatke iz upita i komunikacije obrađujemo radi odgovora, rješavanja
                  tehničkih problema i upravljanja odnosom s korisnikom.
                </p>
              </div>
              <div>
                <p className="font-semibold text-app-text">Marketing naših usluga</p>
                <p>
                  Ako šaljemo marketinške poruke, koristimo odgovarajuću pravnu osnovu i,
                  kada je potrebno, omogućujemo jednostavno povlačenje privole ili odjavu.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">5. Podaci klijenata salona</h2>
            <p className="mt-3">
              SalonFlow omogućuje salonima upravljanje podacima njihovih klijenata, kao
              što su ime i prezime, kontakt podaci, termini, rezervacije, usluge, bilješke,
              komunikacijske i marketinške preference te drugi podaci koje salon odluči
              unositi u sustav.
            </p>
            <p className="mt-3">
              Za takvu obradu salon je u pravilu voditelj obrade i odgovoran je za
              određivanje svrhe, pravne osnove, rokova čuvanja i informiranje svojih
              klijenata. M.i.T. te podatke obrađuje kao izvršitelj obrade radi pružanja
              SalonFlow usluge.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">6. Care/Safety podaci</h2>
            <p className="mt-3">
              Opcionalna Care/Safety funkcionalnost može sadržavati informacije kao što su
              alergije, kontraindikacije, zdravstvena stanja ili druge informacije važne za
              sigurno pružanje salonske usluge. Takvi podaci mogu predstavljati posebne
              kategorije osobnih podataka, uključujući podatke o zdravlju.
            </p>
            <p className="mt-3">
              Salon odlučuje hoće li koristiti ovu funkcionalnost i odgovoran je osigurati
              odgovarajuću pravnu osnovu te unositi samo podatke koji su stvarno potrebni za
              određenu svrhu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">7. Pružatelji usluga i podizvršitelji</h2>
            <p className="mt-3">
              Za pružanje SalonFlow usluge koristimo specijalizirane pružatelje
              infrastrukture. Trenutni glavni pružatelji uključuju:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong className="text-app-text">Supabase</strong> – baza podataka, autentikacija i backend infrastruktura; primarni SalonFlow projekt smješten je u regiji Central EU (Frankfurt);</li>
              <li><strong className="text-app-text">Netlify</strong> – hosting i izvršavanje web aplikacije;</li>
              <li><strong className="text-app-text">Resend</strong> – infrastruktura za slanje email poruka.</li>
            </ul>
            <p className="mt-3">
              M.i.T. ne prodaje osobne podatke. O namjeravanom uvođenju novog bitnog
              podizvršitelja korisnike ćemo obavijestiti najmanje 14 dana unaprijed kada
              se to odnosi na obradu podataka u okviru DPA-a.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">8. Međunarodni prijenosi</h2>
            <p className="mt-3">
              Neki pružatelji mogu obrađivati podatke izvan Europskog gospodarskog
              prostora. Kada je to primjenjivo, koristimo pružatelje koji primjenjuju
              priznate mehanizme za međunarodni prijenos podataka, kao što su odluke o
              primjerenosti, Standardne ugovorne klauzule ili drugi zakoniti mehanizmi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">9. Rokovi čuvanja</h2>
            <p className="mt-3">
              Osobne podatke čuvamo samo koliko je potrebno za svrhe za koje su obrađeni,
              uzimajući u obzir zakonske, ugovorne i sigurnosne obveze.
            </p>
            <p className="mt-3">
              Nakon prestanka SalonFlow usluge aktivni podaci koje obrađujemo u ime salona
              brišu se ili vraćaju prema DPA-u, a brisanje aktivnih podataka provodi se
              najkasnije u roku od 30 dana, osim podataka koje moramo čuvati temeljem
              zakona ili koji se privremeno nalaze u redovitim sigurnosnim kopijama.
            </p>
            <p className="mt-3">
              Računovodstvena, porezna i druga poslovna dokumentacija može se čuvati dulje
              kada to zahtijevaju primjenjivi propisi.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">10. Sigurnost</h2>
            <p className="mt-3">
              Primjenjujemo tehničke i organizacijske mjere usmjerene na zaštitu osobnih
              podataka, uključujući organizacijsku izolaciju podataka, Row Level Security,
              role-based pristup, autentikaciju korisnika, TLS/HTTPS komunikaciju, zaštitu
              servisnih ključeva, audit zapise i ograničavanje pristupa prema načelu
              najmanjih potrebnih ovlasti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">11. Vaša prava</h2>
            <p className="mt-3">
              Ovisno o okolnostima i pravnoj osnovi obrade, možete imati pravo zatražiti
              pristup svojim osobnim podacima, ispravak, brisanje, ograničenje obrade,
              prenosivost podataka ili uložiti prigovor na obradu. Kada se obrada temelji
              na privoli, privolu možete povući u bilo kojem trenutku, bez utjecaja na
              zakonitost prethodne obrade.
            </p>
            <p className="mt-3">
              Zahtjeve možete poslati na{" "}
              <a
                href="mailto:mit.informatika@gmail.com"
                className="font-medium text-app-text underline underline-offset-4"
              >
                mit.informatika@gmail.com
              </a>
              . Također imate pravo podnijeti pritužbu Agenciji za zaštitu osobnih podataka
              (AZOP) ili drugom nadležnom nadzornom tijelu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">12. Automatizirano donošenje odluka</h2>
            <p className="mt-3">
              SalonFlow trenutačno ne koristi osobne podatke za potpuno automatizirano
              donošenje odluka koje proizvodi pravne učinke ili na sličan način značajno
              utječe na pojedinca.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">13. Kolačići i lokalna pohrana</h2>
            <p className="mt-3">
              Informacije o nužnim kolačićima i srodnim tehnologijama dostupne su u{" "}
              <Link
                href="/cookies"
                className="font-medium text-app-text underline underline-offset-4"
              >
                Politici kolačića
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">14. Promjene ove politike</h2>
            <p className="mt-3">
              Ovu Politiku privatnosti možemo povremeno ažurirati zbog promjena u
              SalonFlow usluzi, načinu obrade ili primjenjivim propisima. Datum posljednje
              izmjene bit će naveden na vrhu ove stranice.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
