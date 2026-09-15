import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import {
  createFeedbackScreenshotSignedUrl,
  getFeedbackById,
} from "@/features/feedback/queries";
import FeedbackAdminForm from "@/features/feedback/components/feedback-admin-form";
import { getDictionary } from "@/lib/i18n";

export default async function PlatformFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const locale = "hr" as const;
  const t = getDictionary(locale).developerFeedback;

  const { id } = await params;
  const feedback = await getFeedbackById(id);
  if (!feedback) notFound();

  const screenshotUrl = feedback.screenshot_path
    ? await createFeedbackScreenshotSignedUrl(feedback.screenshot_path)
    : null;
  const screenshotDownloadUrl = feedback.screenshot_path
    ? await createFeedbackScreenshotSignedUrl(feedback.screenshot_path, true)
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <Link
        href="/platform/feedback"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> {t.backToFeedback}
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>{feedback.organization_name ?? "Nepoznat salon"}</span>
              <span>•</span>
              <span>{t.types[feedback.type as keyof typeof t.types] ?? feedback.type}</span>
              <span>•</span>
              <span>{t.priorities[feedback.priority as keyof typeof t.priorities] ?? feedback.priority}</span>
              <span>•</span>
              <span>{new Intl.DateTimeFormat("hr-HR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(feedback.created_at))}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-slate-950">{feedback.title}</h1>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-800">{feedback.description}</p>
          </section>

          {screenshotUrl ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-950">Screenshot</h2>
                {screenshotDownloadUrl ? (
                  <a href={screenshotDownloadUrl} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    <Download className="h-4 w-4" /> {t.downloadScreenshot}
                  </a>
                ) : null}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotUrl} alt={t.screenshotAlt} className="max-h-[720px] w-full rounded-2xl border border-slate-200 object-contain" />
            </section>
          ) : null}

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-950">{t.technicalData}</h2>
            <p className="mt-1 text-sm text-slate-500">Tehnički kontekst koji je korisnik poslao uz feedback. Platform Admin nema pristup klijentima, terminima ni audit logu salona.</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-slate-500">Salon</dt><dd className="mt-1 font-medium text-slate-900">{feedback.organization_name ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">{t.user}</dt><dd className="mt-1 font-medium text-slate-900">{feedback.created_by_name ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">Email</dt><dd className="mt-1 font-medium text-slate-900">{feedback.created_by_email ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">{t.browser}</dt><dd className="mt-1 font-medium text-slate-900">{feedback.browser ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">{t.operatingSystem}</dt><dd className="mt-1 font-medium text-slate-900">{feedback.operating_system ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">{t.viewport}</dt><dd className="mt-1 font-medium text-slate-900">{feedback.viewport ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">{t.language}</dt><dd className="mt-1 font-medium text-slate-900">{feedback.language ?? t.unavailable}</dd></div>
              <div><dt className="text-slate-500">{t.appVersion}</dt><dd className="mt-1 font-medium text-slate-900">{feedback.app_version ?? t.unavailable}</dd></div>
              <div className="sm:col-span-2"><dt className="text-slate-500">{t.page}</dt><dd className="mt-1 break-all font-medium text-slate-900">{feedback.page_url ? <a href={feedback.page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{feedback.page_url}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a> : t.unavailable}</dd></div>
            </dl>
          </section>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <FeedbackAdminForm locale={locale} feedback={feedback} />
        </div>
      </div>
    </div>
  );
}
