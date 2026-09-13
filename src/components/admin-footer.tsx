"use client";

import { MessageCircle } from "lucide-react";
import { FEEDBACK_OPEN_EVENT } from "@/features/feedback/constants";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type Props = {
  organizationName: string;
  locale: AppLocale;
  showFeedback?: boolean;
};

export default function AdminFooter({
  organizationName,
  locale,
  showFeedback = true,
}: Props) {
  const dictionary = getDictionary(locale);
  const feedbackLabel =
    locale === "en"
      ? "Send feedback"
      : locale === "it"
        ? "Invia feedback"
        : "Pošalji feedback";

  function openFeedback() {
    window.dispatchEvent(new Event(FEEDBACK_OPEN_EVENT));
  }

  return (
    <footer className="border-t border-app-soft px-4 py-4 text-center text-xs text-app-muted">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span>
          {organizationName} · {dictionary.adminSystem}
        </span>
        <span aria-hidden="true">·</span>
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
        {showFeedback ? (
          <>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={openFeedback}
              className="inline-flex items-center gap-1 font-semibold text-app-text underline-offset-4 transition hover:underline"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {feedbackLabel}
            </button>
          </>
        ) : null}
      </div>
    </footer>
  );
}
