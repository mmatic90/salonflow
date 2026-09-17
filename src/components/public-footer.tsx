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
    </footer>
  );
}
