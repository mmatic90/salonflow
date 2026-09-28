import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Uvjeti korištenja",
  description: "Uvjeti korištenja SalonFlow platforme.",
};

export default function TermsPage() {
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
            Uvjeti korištenja SalonFlow platforme
          </h1>
          <p className="mt-3 text-sm text-app-muted">
            Posljednje ažuriranje: 28. rujna 2026.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-app-muted sm:text-base">
          <section>
            <h2 className="text-xl font-semibold text-app-text">1. Pružatelj usluge</h2>
            <p className="mt-3">
              SalonFlow pruža M.i.T., obrt za informatičke usluge, vl. Maurizio Matić,
              Bregovita ulica – Via del Monte 17, 52210 Rovinj, Hrvatska, OIB:
              29852487665, email: mit.informatika@gmail.com (u nastavku: „M.i.T.”).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">2. Područje primjene</h2>
            <p className="mt-3">
              Ovi Uvjeti uređuju korištenje SalonFlow SaaS platforme, uključujući
              korisničke račune salona, upravljanje terminima i klijentima, online
              rezervacije, komunikacijske i CRM funkcionalnosti te druge značajke koje
              SalonFlow povremeno stavlja na raspolaganje.
            </p>
            <p className="mt-3">
              SalonFlow pretplate namijenjene su prvenstveno poslovnim i profesionalnim
              korisnicima koji platformu koriste u okviru svoje gospodarske ili
              profesionalne djelatnosti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">3. Korisnički račun</h2>
            <p className="mt-3">
              Poslovni korisnik odgovoran je za točnost podataka o svom salonu i
              korisnicima, za čuvanje pristupnih podataka te za aktivnosti osoba kojima
              omogući pristup svojoj SalonFlow organizaciji.
            </p>
            <p className="mt-3">
              Korisnik mora bez nepotrebnog odgađanja obavijestiti M.i.T. ako posumnja na
              neovlašten pristup računu ili drugi sigurnosni incident povezan s njegovim
              korisničkim računom.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">4. Trial razdoblje</h2>
            <p className="mt-3">
              Ako nije drukčije navedeno u ponudi, SalonFlow probno razdoblje traje sedam
              (7) dana i može privremeno omogućavati funkcionalnosti višeg plana radi
              evaluacije proizvoda.
            </p>
            <p className="mt-3">
              Trial može sadržavati demonstracijske podatke. Po isteku probnog razdoblja
              pristup funkcionalnostima može biti ograničen dok salon ne aktivira plaćeni
              plan. Demonstracijski podaci ne predstavljaju stvarne osobe i ne smiju se
              tretirati kao stvarni poslovni podaci.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">5. Planovi, cijene i plaćanje</h2>
            <p className="mt-3">
              Dostupne funkcionalnosti ovise o aktivnom SalonFlow planu. Cijena,
              obračunsko razdoblje, način plaćanja i eventualni posebni komercijalni
              uvjeti određuju se važećom ponudom, narudžbom, cjenikom ili računom koji je
              korisniku dostavljen prije odgovarajuće naplate.
            </p>
            <p className="mt-3">
              Ako M.i.T. promijeni cijenu postojeće plaćene usluge, nova cijena neće se
              retroaktivno primjenjivati na već plaćeno razdoblje. O materijalnoj promjeni
              cijene korisnik će biti obaviješten unaprijed prije nego što se ona počne
              primjenjivati na sljedeće obračunsko razdoblje.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">6. Dopušteno korištenje</h2>
            <p className="mt-3">Korisnik ne smije koristiti SalonFlow za:</p>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li>nezakonite aktivnosti ili kršenje prava trećih osoba;</li>
              <li>neovlašten pristup tuđim računima, podacima ili sustavima;</li>
              <li>slanje neželjene ili nezakonite elektroničke komunikacije;</li>
              <li>unošenje zlonamjernog koda ili pokušaje ometanja rada platforme;</li>
              <li>
                obradu osobnih podataka za koju korisnik nema odgovarajuću pravnu osnovu;
              </li>
              <li>
                pokušaje zaobilaženja sigurnosnih, planskih ili pristupnih ograničenja
                platforme.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">7. Podaci salona i klijenata</h2>
            <p className="mt-3">
              Poslovni korisnik zadržava prava na podatke koje unosi u SalonFlow. M.i.T.
              dobiva samo ona prava obrade koja su nužna za pružanje, održavanje,
              sigurnost i podršku SalonFlow usluge.
            </p>
            <p className="mt-3">
              Kada salon putem SalonFlowa obrađuje osobne podatke svojih klijenata, salon
              je u pravilu voditelj obrade, a M.i.T. izvršitelj obrade. Takva obrada
              dodatno se uređuje odgovarajućim ugovorom o obradi osobnih podataka (DPA).
            </p>
            <p className="mt-3">
              Ako salon koristi Care/Safety funkcionalnost za podatke koji mogu sadržavati
              informacije o zdravlju ili druge posebne kategorije osobnih podataka, salon
              je odgovoran osigurati odgovarajuću pravnu osnovu i unositi samo podatke koji
              su potrebni za konkretnu svrhu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">8. Javne online rezervacije</h2>
            <p className="mt-3">
              SalonFlow može salonu omogućiti javnu stranicu za slanje zahtjeva za termin.
              Osim ako je na stranici izričito navedeno drukčije, slanje zahtjeva samo po
              sebi ne znači da je termin potvrđen. Salon odlučuje o prihvatu, izmjeni ili
              odbijanju zahtjeva.
            </p>
            <p className="mt-3">
              M.i.T. pruža tehničku platformu i nije pružatelj salonske usluge. Odnos u
              vezi s cijenom, kvalitetom, izvođenjem, otkazivanjem i drugim uvjetima same
              salonske usluge postoji između salona i njegova klijenta. Salon je odgovoran
              za informacije koje objavljuje o svojim uslugama i za obveze prema svojim
              klijentima.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">9. Dostupnost i promjene usluge</h2>
            <p className="mt-3">
              M.i.T. nastoji održavati SalonFlow sigurnim i dostupnim, ali ne jamči
              neprekidan rad bez prekida ili pogrešaka. Planirano održavanje, sigurnosne
              intervencije, kvarovi infrastrukture trećih strana i okolnosti izvan razumne
              kontrole mogu privremeno utjecati na dostupnost.
            </p>
            <p className="mt-3">
              Ako nije posebno ugovoreno, SalonFlow se ne pruža uz zaseban zajamčeni SLA.
              Funkcionalnosti se mogu mijenjati ili poboljšavati tijekom razvoja proizvoda,
              uz nastojanje da se izbjegne nerazumno narušavanje ključnih plaćenih
              funkcionalnosti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">10. Vanjske usluge</h2>
            <p className="mt-3">
              SalonFlow se oslanja na određene vanjske pružatelje infrastrukture, poput
              Supabasea, Netlifyja i Resenda. Promjene, prekidi ili ograničenja tih usluga
              mogu utjecati na pojedine SalonFlow funkcionalnosti. Obrada osobnih podataka
              kod tih pružatelja uređena je Politikom privatnosti i DPA-om.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">11. Intelektualno vlasništvo</h2>
            <p className="mt-3">
              SalonFlow aplikacija, njezin izvorni kod, dizajn, naziv, dokumentacija i
              druga autorska ili srodna prava pripadaju M.i.T.-u ili odgovarajućim
              nositeljima prava. Pretplata korisniku daje ograničeno, neisključivo i
              neprenosivo pravo korištenja usluge za vrijeme trajanja njegova prava
              pristupa.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">12. Suspenzija i prestanak</h2>
            <p className="mt-3">
              M.i.T. može privremeno ograničiti ili suspendirati pristup ako je to razumno
              potrebno radi sigurnosti, sprječavanja zlouporabe, ozbiljnog kršenja ovih
              Uvjeta, neplaćanja dospjelih obveza ili ispunjavanja zakonskih zahtjeva.
              Kada je razumno moguće, korisnik će prethodno biti obaviješten i dobiti
              priliku otkloniti povredu.
            </p>
            <p className="mt-3">
              Po prestanku usluge aktivni podaci koje M.i.T. obrađuje u ime salona brišu
              se ili vraćaju u skladu s DPA-om. Prema trenutačnom pravilu SalonFlow usluge,
              aktivni podaci salona brišu se najkasnije u roku od 30 dana nakon prestanka,
              osim podataka koje je potrebno zadržati zbog zakonske obveze ili tehničkih
              sigurnosnih kopija koje se brišu u redovitim ciklusima.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">13. Odgovornost</h2>
            <p className="mt-3">
              Korisnik je odgovoran za način na koji koristi SalonFlow, sadržaj i podatke
              koje unosi, svoje poslovne odluke te zakonitost komunikacije sa svojim
              klijentima.
            </p>
            <p className="mt-3">
              U najvećoj mjeri dopuštenoj primjenjivim pravom, M.i.T. ne odgovara za
              neizravnu ili posljedičnu poslovnu štetu, izgubljenu dobit ili štetu koja je
              posljedica radnji salona, njegovih korisnika ili vanjskih pružatelja koje
              M.i.T. ne može razumno kontrolirati. Ova odredba ne isključuje niti
              ograničava odgovornost koja se prema primjenjivom pravu ne može valjano
              isključiti ili ograničiti.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">14. Privatnost</h2>
            <p className="mt-3">
              Na obradu osobnih podataka primjenjuju se SalonFlow Politika privatnosti i,
              kada je primjenjivo, DPA između M.i.T.-a i salona.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <Link href="/privacy" className="font-medium text-app-text underline underline-offset-4">
                Politika privatnosti
              </Link>
              <Link href="/cookies" className="font-medium text-app-text underline underline-offset-4">
                Politika kolačića
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">15. Promjene ovih Uvjeta</h2>
            <p className="mt-3">
              M.i.T. može povremeno ažurirati ove Uvjete zbog promjena proizvoda,
              poslovnog modela ili propisa. O materijalnim promjenama koje nepovoljno
              utječu na postojeće plaćene korisnike M.i.T. će, kada je primjenjivo,
              obavijestiti korisnike najmanje 30 dana prije početka primjene. Hitne
              sigurnosne ili zakonski potrebne promjene mogu se primijeniti ranije.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">16. Mjerodavno pravo i sporovi</h2>
            <p className="mt-3">
              Na ove Uvjete primjenjuje se pravo Republike Hrvatske. Strane će prije
              pokretanja postupka pokušati spor riješiti izravnim dogovorom. Ako dogovor
              nije moguć, za spor je nadležan stvarno i mjesno nadležan sud u Republici
              Hrvatskoj, osim ako obvezni propis određuje drukčije.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-app-text">17. Kontakt</h2>
            <p className="mt-3">
              Za pitanja o ovim Uvjetima obratite se na{" "}
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
