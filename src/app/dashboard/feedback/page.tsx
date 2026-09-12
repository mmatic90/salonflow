import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Database, ImageIcon, MessageSquareText, Trash2 } from "lucide-react";
import { getCurrentUserPermissions } from "@/lib/permissions";
import { getFeedbackList, getFeedbackStats } from "@/features/feedback/queries";
import FeedbackCleanupControls from "@/features/feedback/components/feedback-cleanup-controls";
import { getDictionary } from "@/lib/i18n";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default async function FeedbackPage() {
  const permissions = await getCurrentUserPermissions();
  if (!permissions?.isSystemDeveloper) notFound();
  const dictionary = getDictionary(permissions.organizationLocale);
  const t = dictionary.developerFeedback;

  const items = await getFeedbackList();
  const stats = await getFeedbackStats(items);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-accent">{t.tools}</p>
          <h1 className="mt-2 text-3xl font-bold text-app-text">Feedback</h1>
          <p className="mt-2 text-sm text-app-muted">
            {t.intro}
          </p>
        </div>
        <FeedbackCleanupControls locale={permissions.organizationLocale} candidateCount={stats.cleanupCandidates} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-app-soft bg-app-card p-5 shadow-sm">
          <MessageSquareText className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-2xl font-bold text-app-text">{stats.total}</p>
          <p className="mt-1 text-sm text-app-muted">{t.total}</p>
        </div>
        <div className="rounded-3xl border border-app-soft bg-app-card p-5 shadow-sm">
          <ImageIcon className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-2xl font-bold text-app-text">{stats.screenshots}</p>
          <p className="mt-1 text-sm text-app-muted">{t.screenshots}</p>
        </div>
        <div className="rounded-3xl border border-app-soft bg-app-card p-5 shadow-sm">
          <Database className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-2xl font-bold text-app-text">{formatBytes(stats.screenshotBytes)}</p>
          <p className="mt-1 text-sm text-app-muted">{t.screenshotStorage}</p>
        </div>
        <div className="rounded-3xl border border-app-soft bg-app-card p-5 shadow-sm">
          <Trash2 className="h-5 w-5 text-app-accent" />
          <p className="mt-4 text-2xl font-bold text-app-text">{stats.cleanupCandidates}</p>
          <p className="mt-1 text-sm text-app-muted">{t.cleanupReady}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-app-soft bg-app-card-alt px-5 py-4 text-sm text-app-muted">
        {t.retention}
      </div>

      <div className="overflow-hidden rounded-3xl border border-app-soft bg-app-card shadow-sm">
        {items.length === 0 ? (
          <div className="px-6 py-14 text-center text-sm text-app-muted">{t.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-app-soft text-sm">
              <thead className="bg-app-card-alt text-left text-xs uppercase tracking-wide text-app-muted">
                <tr>
                  <th className="px-5 py-4">{t.status}</th>
                  <th className="px-5 py-4">{t.type}</th>
                  <th className="px-5 py-4">{t.priority}</th>
                  <th className="px-5 py-4">{t.user}</th>
                  <th className="px-5 py-4">{t.title}</th>
                  <th className="px-5 py-4">{t.date}</th>
                  <th className="px-5 py-4 text-right">{t.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-soft">
                {items.map((item) => {
                  const href = `/dashboard/feedback/${item.id}`;
                  return (
                    <tr key={item.id} className="group transition hover:bg-app-card-alt">
                      <td className="p-0"><Link href={href} className="block px-5 py-4 font-medium text-app-text">{t.statuses[item.status as keyof typeof t.statuses] ?? item.status}</Link></td>
                      <td className="p-0"><Link href={href} className="block px-5 py-4 text-app-muted">{t.types[item.type as keyof typeof t.types] ?? item.type}</Link></td>
                      <td className="p-0"><Link href={href} className="block px-5 py-4 text-app-muted">{t.priorities[item.priority as keyof typeof t.priorities] ?? item.priority}</Link></td>
                      <td className="p-0"><Link href={href} className="block px-5 py-4 text-app-muted">{item.created_by_name ?? item.created_by_email ?? t.unknownUser}</Link></td>
                      <td className="p-0"><Link href={href} className="block px-5 py-4 font-semibold text-app-text group-hover:text-app-accent">{item.title}</Link></td>
                      <td className="whitespace-nowrap p-0"><Link href={href} className="block px-5 py-4 text-app-muted">{new Intl.DateTimeFormat(permissions.organizationLocale === "en" ? "en-GB" : permissions.organizationLocale === "it" ? "it-IT" : "hr-HR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.created_at))}</Link></td>
                      <td className="p-0 text-right">
                        <Link href={href} className="inline-flex items-center gap-2 px-5 py-4 font-semibold text-app-accent transition hover:underline">
                          {t.open} <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
