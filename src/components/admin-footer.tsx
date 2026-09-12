import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  organizationName: string;
  locale: AppLocale;
};

export default function AdminFooter({ organizationName, locale }: Props) {
  const dictionary = getDictionary(locale);

  return (
    <footer className="border-t border-app-soft px-4 py-4 text-center text-xs text-app-muted">
      <span>{organizationName} · {dictionary.adminSystem}</span>
      <span className="mx-2">·</span>
      <span>
        {dictionary.createdBy}{" "}
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
