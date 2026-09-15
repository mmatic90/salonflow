"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  HeartHandshake,
  LayoutDashboard,
  ListPlus,
  LockKeyhole,
  PanelLeft,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Users,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import LogoutButton from "@/components/logout-button";
import OnlineBookingBadge from "@/components/online-booking-badge";
import { getDictionary, type AppLocale } from "@/lib/i18n";
import {
  buildCapabilityUpgradePath,
  type SalonCapabilityCode,
} from "@/lib/entitlements";

type AppRole = "admin" | "employee";

type Props = {
  role: AppRole;
  displayName: string;
  organizationName: string;
  locale: AppLocale;
  canUseWaitlist?: boolean;
  canUseReports?: boolean;
  canUseAdvancedCrm?: boolean;
  isSystemDeveloper?: boolean;
};

type NavDefinition = {
  href: string;
  key:
    | "dashboard"
    | "onlineBookings"
    | "calendar"
    | "clients"
    | "waitlist"
    | "retention"
    | "reports"
    | "settings";
  icon: typeof LayoutDashboard;
  roles: AppRole[];
  capability?: SalonCapabilityCode;
};

const SIDEBAR_STORAGE_KEY = "dashboard-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "salonflow-sidebar-change";

const navDefinitions: NavDefinition[] = [
  {
    href: "/dashboard",
    key: "dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "employee"],
  },
  {
    href: "/dashboard/calendar",
    key: "calendar",
    icon: CalendarDays,
    roles: ["admin", "employee"],
  },
  {
    href: "/dashboard/online-bookings",
    key: "onlineBookings",
    icon: BellRing,
    roles: ["admin", "employee"],
  },
  {
    href: "/dashboard/clients",
    key: "clients",
    icon: Users,
    roles: ["admin", "employee"],
  },
  {
    href: "/dashboard/waitlist",
    key: "waitlist",
    icon: ListPlus,
    roles: ["admin", "employee"],
    capability: "waitlist",
  },
  {
    href: "/dashboard/retention",
    key: "retention",
    icon: HeartHandshake,
    roles: ["admin"],
    capability: "advanced_crm",
  },
  {
    href: "/dashboard/reports",
    key: "reports",
    icon: BarChart3,
    roles: ["admin"],
    capability: "advanced_reports",
  },
  {
    href: "/dashboard/settings",
    key: "settings",
    icon: Settings,
    roles: ["admin"],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "SF"
  );
}

function waitlistLabel(locale: AppLocale) {
  if (locale === "en") return "Waitlist";
  if (locale === "it") return "Lista d'attesa";
  return "Lista čekanja";
}

function retentionLabel(locale: AppLocale) {
  if (locale === "en") return "CRM actions";
  if (locale === "it") return "Azioni CRM";
  return "CRM akcije";
}

function subscribeToSidebarPreference(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, listener);
  };
}

function getSidebarPreferenceSnapshot() {
  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

function getSidebarPreferenceServerSnapshot() {
  return false;
}

export default function DashboardSidebar({
  role,
  displayName,
  organizationName,
  locale,
  canUseWaitlist = true,
  canUseReports = true,
  canUseAdvancedCrm = true,
  isSystemDeveloper = false,
}: Props) {
  const pathname = usePathname();
  const dictionary = getDictionary(locale);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktopCollapsed = useSyncExternalStore(
    subscribeToSidebarPreference,
    getSidebarPreferenceSnapshot,
    getSidebarPreferenceServerSnapshot,
  );

  const navItems = useMemo(
    () =>
      navDefinitions
        .filter((item) => item.roles.includes(role))
        .map((item) => {
          const unlocked =
            item.capability === "waitlist"
              ? canUseWaitlist
              : item.capability === "advanced_reports"
                ? canUseReports
                : item.capability === "advanced_crm"
                  ? canUseAdvancedCrm
                  : true;
          const locked = Boolean(item.capability && !unlocked);
          const label =
            item.key === "waitlist"
              ? waitlistLabel(locale)
              : item.key === "retention"
                ? retentionLabel(locale)
                : dictionary.nav[item.key];

          return {
            ...item,
            label,
            locked,
            targetHref:
              locked && item.capability
                ? buildCapabilityUpgradePath(item.capability, item.href)
                : item.href,
          };
        }),
    [
      canUseAdvancedCrm,
      canUseReports,
      canUseWaitlist,
      dictionary,
      locale,
      role,
    ],
  );

  function toggleDesktop() {
    const next = !desktopCollapsed;
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-app-soft bg-app-card px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-app-text">
              {organizationName}
            </div>
            <div className="text-xs text-app-muted">
              {dictionary.salonAdminPanel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-expanded={mobileOpen}
            className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg"
          >
            {mobileOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileOpen ? (
          <div className="mt-4 space-y-3">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = !item.locked && isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.targetHref}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-app-accent text-white shadow-sm"
                        : "bg-app-card-alt text-app-text hover:bg-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.locked ? (
                      <LockKeyhole className="ml-auto h-4 w-4 text-app-muted" />
                    ) : item.href === "/dashboard/online-bookings" ? (
                      <OnlineBookingBadge />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="rounded-2xl border border-app-soft bg-app-card-alt px-4 py-3">
              <div className="text-sm text-app-muted">
                {dictionary.loggedInAs}:{" "}
                <span className="font-medium text-app-text">{displayName}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/account"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
                >
                  {dictionary.myAccount}
                </Link>
                {isSystemDeveloper ? (
                  <Link
                    href="/platform"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
                  >
                    <ShieldCheck className="h-4 w-4" /> Platform Admin
                  </Link>
                ) : null}
                <LogoutButton locale={locale} />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <aside
        className={`hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-app-soft lg:bg-app-card lg:py-6 lg:shadow-sm transition-all duration-200 ${
          desktopCollapsed ? "lg:w-24" : "lg:w-72"
        }`}
      >
        <div
          className={`flex items-start gap-2 pb-6 ${
            desktopCollapsed ? "justify-center px-3" : "justify-between px-4"
          }`}
        >
          {!desktopCollapsed ? (
            <div className="min-w-0">
              <div className="truncate text-xl font-bold text-app-text">
                {organizationName}
              </div>
              <div className="mt-1 text-sm text-app-muted">
                {dictionary.salonAdminPanel}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={toggleDesktop}
            title={organizationName}
            className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg"
          >
            {desktopCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {desktopCollapsed ? (
          <div
            className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-app-card-alt text-xs font-bold text-app-text"
            title={organizationName}
          >
            {getInitials(organizationName)}
          </div>
        ) : null}

        <nav className="flex-1 space-y-2 overflow-y-auto px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !item.locked && isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.targetHref}
                className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  desktopCollapsed ? "justify-center" : "gap-3"
                } ${
                  active
                    ? "bg-app-accent text-white shadow-sm"
                    : "text-app-text hover:bg-app-card-alt"
                }`}
                title={desktopCollapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!desktopCollapsed ? (
                  <>
                    <span>{item.label}</span>
                    {item.locked ? (
                      <LockKeyhole className="ml-auto h-4 w-4 text-app-muted" />
                    ) : item.href === "/dashboard/online-bookings" ? (
                      <OnlineBookingBadge />
                    ) : null}
                  </>
                ) : item.locked ? (
                  <LockKeyhole className="ml-1 h-3 w-3 shrink-0 text-app-muted" />
                ) : item.href === "/dashboard/online-bookings" ? (
                  <OnlineBookingBadge />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-6">
          {!desktopCollapsed ? (
            <div className="rounded-2xl border border-app-soft bg-app-card-alt p-4">
              <div className="text-sm text-app-muted">
                {dictionary.loggedInAs}:{" "}
                <span className="font-medium text-app-text">{displayName}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/dashboard/account"
                  className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
                >
                  {dictionary.myAccount}
                </Link>
                {isSystemDeveloper ? (
                  <Link
                    href="/platform"
                    className="inline-flex items-center gap-2 rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg"
                  >
                    <ShieldCheck className="h-4 w-4" /> Platform Admin
                  </Link>
                ) : null}
                <LogoutButton locale={locale} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 border-t border-app-soft pt-4">
              <Link
                href="/dashboard/account"
                title={`${dictionary.myAccount} · ${displayName}`}
                aria-label={dictionary.myAccount}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-soft bg-white text-app-text transition hover:bg-app-bg"
              >
                <UserCircle2 className="h-4 w-4" />
              </Link>
              {isSystemDeveloper ? (
                <Link
                  href="/platform"
                  title="Platform Admin"
                  aria-label="Platform Admin"
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-soft bg-white text-app-text transition hover:bg-app-bg"
                >
                  <ShieldCheck className="h-4 w-4" />
                </Link>
              ) : null}
              <LogoutButton locale={locale} iconOnly />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
