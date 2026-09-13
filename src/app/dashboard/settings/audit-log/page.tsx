import Link from "next/link";
import { requireAdminForAuditLog } from "@/lib/page-guards";
import PageShell from "@/components/page-shell";
import PageHeader from "@/components/page-header";
import PageSection from "@/components/page-section";
import EmptyStateCard from "@/components/empty-state-card";
import { getAuditLogFilterOptions, getAuditLogs } from "@/features/audit/queries";
import {
  AuditLogNavigationLink,
  AuditLogScrollRestorer,
} from "@/features/audit/components/audit-log-navigation";
import { getDictionary, type AppLocale } from "@/lib/i18n";

function formatDateTime(value: string, locale: AppLocale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale === "it" ? "it-IT" : "hr-HR", {
    timeZone: "Europe/Zagreb",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(value));
}

function formatDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function actionLabel(
  action: string,
  labels: Record<string, string>,
) {
  return labels[action] ?? action;
}

function entityLabel(
  type: string,
  labels: Record<string, string>,
) {
  return labels[type] ?? type;
}

function actionBadgeClass(action: string) {
  if (/deleted|cancelled|deactivated/.test(action)) return "bg-red-50 text-red-700 ring-red-200";
  if (action.includes("created")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (/updated|changed/.test(action)) return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-blue-50 text-blue-700 ring-blue-200";
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const readParam = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";

function buildHref(current: Record<string, string>, updates: Record<string, string | number | undefined>) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") params.delete(key); else params.set(key, String(value));
  }
  return `?${params.toString()}`;
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const permissions = await requireAdminForAuditLog();
  const t = getDictionary(permissions.organizationLocale).settings.audit;
  const raw = await searchParams;
  const params = {
    dateFrom: readParam(raw.dateFrom), dateTo: readParam(raw.dateTo),
    timestampFrom: readParam(raw.timestampFrom), timestampTo: readParam(raw.timestampTo),
    actor: readParam(raw.actor), action: readParam(raw.action), entityType: readParam(raw.entityType),
    search: readParam(raw.search), selected: readParam(raw.selected),
    page: Math.max(1, Number(readParam(raw.page)) || 1),
    pageSize: [25, 50, 100, 200].includes(Number(readParam(raw.pageSize))) ? Number(readParam(raw.pageSize)) : 50,
  };

  const today = new Date();
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 6);
  const [result, options, todayResult, weekResult] = await Promise.all([
    getAuditLogs(params), getAuditLogFilterOptions(),
    getAuditLogs({ dateFrom: formatDateInput(today), dateTo: formatDateInput(today), pageSize: 1 }),
    getAuditLogs({ dateFrom: formatDateInput(sevenDaysAgo), dateTo: formatDateInput(today), pageSize: 1 }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / params.pageSize));
  const safePage = Math.min(params.page, totalPages);
  const current = {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    timestampFrom: params.timestampFrom,
    timestampTo: params.timestampTo,
    actor: params.actor,
    action: params.action,
    entityType: params.entityType,
    search: params.search,
    selected: params.selected,
    page: String(safePage),
    pageSize: String(params.pageSize),
  };

  const selectedLog = params.selected
    ? result.items.find((item) => item.id === params.selected) ?? null
    : null;
  const exportParams = new URLSearchParams();
  if (params.dateFrom) exportParams.set("dateFrom", params.dateFrom);
  if (params.dateTo) exportParams.set("dateTo", params.dateTo);
  if (params.actor) exportParams.set("actor", params.actor);
  if (params.action) exportParams.set("action", params.action);
  if (params.entityType) exportParams.set("entityType", params.entityType);
  if (params.search) exportParams.set("search", params.search);

  return (
    <PageShell maxWidth="max-w-7xl">
      <AuditLogScrollRestorer />
      <PageHeader title={t.title} description={t.description} />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm">
          <p className="text-sm font-medium text-app-muted">{t.total}</p>
          <p className="mt-2 text-3xl font-bold text-app-text">{result.total}</p>
        </div>
        <div className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm">
          <p className="text-sm font-medium text-app-muted">{t.today}</p>
          <p className="mt-2 text-3xl font-bold text-app-text">{todayResult.total}</p>
        </div>
        <div className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm">
          <p className="text-sm font-medium text-app-muted">{t.last7Days}</p>
          <p className="mt-2 text-3xl font-bold text-app-text">{weekResult.total}</p>
        </div>
      </section>

      <PageSection title={t.filtersTitle} description={t.filtersDescription}>
        <form className="grid gap-4 lg:grid-cols-4">
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.dateFrom}</span>
            <input
              type="date"
              name="dateFrom"
              defaultValue={params.dateFrom}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.dateTo}</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={params.dateTo}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.actor}</span>
            <select
              name="actor"
              defaultValue={params.actor}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            >
              <option value="">{t.allActors}</option>
              {options.actors.map((actor) => (
                <option key={actor.value} value={actor.value}>{actor.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.action}</span>
            <select
              name="action"
              defaultValue={params.action}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            >
              <option value="">{t.allActions}</option>
              {options.actions.map((action) => (
                <option key={action} value={action}>{actionLabel(action, t.actionLabels)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text lg:col-span-2">
            <span>{t.search}</span>
            <input
              name="search"
              defaultValue={params.search}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.entityType}</span>
            <select
              name="entityType"
              defaultValue={params.entityType}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            >
              <option value="">{t.allEntityTypes}</option>
              {options.entityTypes.map((entityType) => (
                <option key={entityType} value={entityType}>{entityLabel(entityType, t.entityLabels)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-medium text-app-text">
            <span>{t.pageSize}</span>
            <select
              name="pageSize"
              defaultValue={params.pageSize}
              className="w-full rounded-xl border border-app-soft bg-white px-3 py-2.5 outline-none focus:border-app-accent"
            >
              {[25, 50, 100, 200].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-2 lg:col-span-4">
            <button
              className="rounded-xl bg-app-accent px-4 py-2.5 text-sm font-semibold text-white"
              type="submit"
            >
              {t.applyFilters}
            </button>
            <Link
              href="/dashboard/settings/audit-log"
              className="rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text"
            >
              {t.clearFilters}
            </Link>
            <a
              href={`/dashboard/settings/audit-log/export?${exportParams.toString()}`}
              className="rounded-xl border border-app-soft bg-white px-4 py-2.5 text-sm font-semibold text-app-text"
            >
              {t.exportCsv}
            </a>
          </div>
        </form>
      </PageSection>

      <PageSection title={t.activityTitle} description={t.activityDescription}>
        {result.items.length === 0 ? (
          <EmptyStateCard title={t.emptyTitle} description={t.emptyDescription} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-app-soft bg-app-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-app-soft text-sm">
                <thead className="bg-app-table-head text-left text-xs font-semibold uppercase tracking-wide text-app-muted">
                  <tr>
                    <th className="px-4 py-3">{t.dateTime}</th>
                    <th className="px-4 py-3">{t.actor}</th>
                    <th className="px-4 py-3">{t.action}</th>
                    <th className="px-4 py-3">{t.entity}</th>
                    <th className="px-4 py-3">{t.entityName}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-soft">
                  {result.items.map((item) => (
                    <tr key={item.id} className="hover:bg-app-card-alt">
                      <td className="whitespace-nowrap px-4 py-3 text-app-muted">
                        {formatDateTime(item.created_at, permissions.organizationLocale)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-app-text">
                          {item.actor_display_name || item.actor_email || t.unknownActor}
                        </div>
                        {item.actor_email && item.actor_display_name ? (
                          <div className="mt-0.5 text-xs text-app-muted">{item.actor_email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${actionBadgeClass(item.action)}`}>
                          {actionLabel(item.action, t.actionLabels)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-app-muted">
                        {entityLabel(item.entity_type, t.entityLabels)}
                      </td>
                      <td className="px-4 py-3">
                        {item.entity_id ? (
                          <AuditLogNavigationLink
                            href={buildHref(current, { selected: item.id })}
                            className="font-medium text-app-accent hover:underline"
                          >
                            {item.entity_label || item.entity_id}
                          </AuditLogNavigationLink>
                        ) : (
                          <span className="text-app-muted">{item.entity_label || "-"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-app-muted">
            {t.page} {safePage} / {totalPages} · {result.total} {t.records}
          </div>
          <div className="flex gap-2">
            {safePage > 1 ? (
              <Link
                href={buildHref(current, { page: safePage - 1, selected: undefined })}
                className="rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-semibold text-app-text"
              >
                {t.previous}
              </Link>
            ) : null}
            {safePage < totalPages ? (
              <Link
                href={buildHref(current, { page: safePage + 1, selected: undefined })}
                className="rounded-xl border border-app-soft bg-white px-4 py-2 text-sm font-semibold text-app-text"
              >
                {t.next}
              </Link>
            ) : null}
          </div>
        </div>
      </PageSection>

      {selectedLog ? (
        <PageSection title={t.selectedTitle} description={t.selectedDescription}>
          <div className="rounded-2xl border border-app-soft bg-app-card p-5 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{t.dateTime}</p>
                <p className="mt-1 font-medium text-app-text">{formatDateTime(selectedLog.created_at, permissions.organizationLocale)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{t.actor}</p>
                <p className="mt-1 font-medium text-app-text">{selectedLog.actor_display_name || selectedLog.actor_email || t.unknownActor}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{t.action}</p>
                <p className="mt-1 font-medium text-app-text">{actionLabel(selectedLog.action, t.actionLabels)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">{t.entity}</p>
                <p className="mt-1 font-medium text-app-text">{entityLabel(selectedLog.entity_type, t.entityLabels)}</p>
              </div>
            </div>
          </div>
        </PageSection>
      ) : null}
    </PageShell>
  );
}
