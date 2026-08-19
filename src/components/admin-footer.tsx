type Props = {
  organizationName: string;
};

export default function AdminFooter({ organizationName }: Props) {
  return (
    <footer className="border-t border-app-soft px-4 py-4 text-center text-xs text-app-muted">
      <span>{organizationName} · admin sustav</span>
      <span className="mx-2">·</span>
      <span>
        Izradio{" "}
        <a
          href="https://mit-informatika.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-app-text underline-offset-4 hover:underline"
        >
          M.i.T. informatika
        </a>
      </span>
    </footer>
  );
}
