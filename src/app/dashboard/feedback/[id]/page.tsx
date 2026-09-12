import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, Search } from "lucide-react";
import { getCurrentUserPermissions } from "@/lib/permissions";
import {
  createFeedbackScreenshotSignedUrl,
  getFeedbackById,
} from "@/features/feedback/queries";
import FeedbackAdminForm from "@/features/feedback/components/feedback-admin-form";
import { getDictionary } from "@/lib/i18n";

export default async function FeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const permissions = await getCurrentUserPermissions();
  if (!permissions?.isSystemDeveloper) notFound();
  const t = getDictionary(permissions.organizationLocale).developerFeedback;

  const { id } = await params;
  const feedback = await getFeedbackById(id);
  if (!feedback) notFound();

  const screenshotUrl = feedback.screenshot_path
    ? await createFeedbackScreenshotSignedUrl(feedback.screenshot_path)
    : null;
  const screenshotDownloadUrl = feedback.screenshot_path
    ? await createFeedbackScreenshotSignedUrl(feedback.screenshot_path, true)
    : null;

  const feedbackTime = new Date(feedback.created_at).getTime();
  const auditParams = new URLSearchParams({
    timestampFrom: new Date(feedbackTime - 10 * 60 * 1000).toISOString(),
    timestampTo: new Date(feedbackTime + 10 * 60 * 1000).toISOString(),
    pageSize: "100",
  });
  if (feedback.created_by) auditParams.set("actor", feedback.created_by);
  const nearbyAuditHref = `/dashboard/settings/audit-log?${auditParams.toString()}`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/feedback"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-app-muted transition hover:text-app-text"
      >
        <ArrowLeft className="h-4 w-4" /> {t.backToFeedback}
      </Link>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-app-soft bg-app-card p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-app-muted">
              <span>{t.types[feedback.type as keyof typeof t.types] ?? feedback.type}</span>
              <span>•</span><span>{feedback.priority}</span><span>•</span>
              <span>{new Intl.DateTimeFormat(permissions.organizationLocale === "en" ? "en-GB" : permissions.organizationLocale === "it" ? "it-IT" : "hr-HR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(feedback.created_at))}</span>
            </div>
            <h1 className="mt-4 text-3xl font-bold text-app-text">{feedback.title}</h1>
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-app-text">{feedback.description}</p>
            <Link
              href={nearbyAuditHref}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-app-text px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Search className="h-4 w-4" /> {t.showNearbyActivity}
            </Link>
            <p className="mt-2 text-xs text-app-muted">{t.nearbyActivityHelp}</p>
          </section>

          {screenshotUrl && (
            <section className="rounded-3xl border border-app-soft bg-app-card p-6 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-app-text">Screenshot</h2>
                {screenshotDownloadUrl && <a href={screenshotDownloadUrl} className="inline-flex items-center gap-2 rounded-xl border border-app-soft px-3 py-2 text-sm font-semibold text-app-text transition hover:bg-app-card-alt"><Download className="h-4 w-4" /> {t.downloadScreenshot}</a>}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={screenshotUrl} alt={t.screenshotAlt} className="max-h-[720px] w-full rounded-2xl border border-app-soft object-contain" />
            </section>
          )}

          <section className="rounded-3xl border border-app-soft bg-app-card p-6 shadow-sm">
            <h2 className="text-lg font-bold text-app-text">{t.technicalData}</h2>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-app-muted">{t.user}</dt><dd className="mt-1 font-medium text-app-text">{feedback.created_by_name ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">Email</dt><dd className="mt-1 font-medium text-app-text">{feedback.created_by_email ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">{t.browser}</dt><dd className="mt-1 font-medium text-app-text">{feedback.browser ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">{t.operatingSystem}</dt><dd className="mt-1 font-medium text-app-text">{feedback.operating_system ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">{t.viewport}</dt><dd className="mt-1 font-medium text-app-text">{feedback.viewport ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">{t.language}</dt><dd className="mt-1 font-medium text-app-text">{feedback.language ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">{t.appVersion}</dt><dd className="mt-1 font-medium text-app-text">{feedback.app_version ?? t.unavailable}</dd></div>
              <div><dt className="text-app-muted">{t.page}</dt><dd className="mt-1 break-all font-medium text-app-text">{feedback.page_url ? <a href={feedback.page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">{feedback.page_url}<ExternalLink className="h-3.5 w-3.5 shrink-0" /></a> : t.unavailable}</dd></div>
            </dl>
          </section>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <FeedbackAdminForm locale={permissions.organizationLocale} feedback={feedback} />
        </div>
      </div>
    </div>
  );
}
