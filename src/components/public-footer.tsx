import Link from "next/link";

type Props = {
  salonName?: string;
};

export default function PublicFooter({ salonName = "SalonFlow" }: Props) {
  return (
    <footer className="border-t border-app-soft bg-app-bg px-6 py-8 text-center text-sm text-app-muted">
      <p>© {new Date().getFullYear()} {salonName}. Sva prava pridržana.</p>

      <p className="mt-2">
        Booking sustav pokreće{" "}
        <span className="font-semibold text-app-text">SalonFlow</span>.
      </p>

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Uvjeti korištenja
        </Link>
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Politika privatnosti
        </Link>
        <Link href="/cookies" className="underline-offset-4 hover:underline">
          Politika kolačića
        </Link>
      </p>
    </footer>
  );
}
