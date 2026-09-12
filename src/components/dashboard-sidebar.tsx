"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  CalendarDays,
  Clock3,
  LayoutDashboard,
  ListChecks,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Users,
  UserCircle2,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import LogoutButton from "@/components/logout-button";
import OnlineBookingBadge from "@/components/online-booking-badge";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type AppRole = "admin" | "employee";

type Props = {
  role: AppRole;
  displayName: string;
  organizationName: string;
  locale: AppLocale;
};

type NavDefinition = {
  href: string;
  key:
    | "dashboard"
    | "onlineBookings"
    | "appointments"
    | "calendar"
    | "weekCalendar"
    | "timeGrid"
    | "clients"
    | "myAccount"
    | "schedule"
    | "reports"
    | "settings";
  icon: typeof LayoutDashboard;
  roles: AppRole[];
};

const SIDEBAR_STORAGE_KEY = "dashboard-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "salonflow-sidebar-change";

const navDefinitions: NavDefinition[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard, roles: ["admin", "employee"] },
  { href: "/dashboard/online-bookings", key: "onlineBookings", icon: BellRing, roles: ["admin", "employee"] },
  { href: "/dashboard/appointments", key: "appointments", icon: ListChecks, roles: ["admin", "employee"] },
  { href: "/dashboard/calendar", key: "calendar", icon: CalendarDays, roles: ["admin", "employee"] },
  { href: "/dashboard/calendar/week", key: "weekCalendar", icon: CalendarDays, roles: ["admin", "employee"] },
  { href: "/dashboard/calendar/time-grid", key: "timeGrid", icon: Clock3, roles: ["admin", "employee"] },
  { href: "/dashboard/clients", key: "clients", icon: Users, roles: ["admin", "employee"] },
  { href: "/dashboard/account", key: "myAccount", icon: UserCircle2, roles: ["admin", "employee"] },
  { href: "/dashboard/schedule", key: "schedule", icon: Users, roles: ["admin"] },
  { href: "/dashboard/reports", key: "reports", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/dashboard/settings", key: "settings", icon: Settings, roles: ["admin"] },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SF";
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

export default function DashboardSidebar({ role, displayName, organizationName, locale }: Props) {
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
        .map((item) => ({
          ...item,
          label:
            item.key === "myAccount"
              ? dictionary.myAccount
              : dictionary.nav[item.key],
        })),
    [dictionary, role],
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
            <div className="truncate text-lg font-semibold text-app-text">{organizationName}</div>
            <div className="text-xs text-app-muted">{dictionary.salonAdminPanel}</div>
          </div>
          <button type="button" onClick={() => setMobileOpen((prev) => !prev)} className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg">
            {mobileOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-app-soft bg-app-card-alt px-4 py-3">
          <div className="text-sm text-app-muted">{dictionary.loggedInAs}: <span className="font-medium text-app-text">{displayName}</span></div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/account" className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg">{dictionary.myAccount}</Link>
            <LogoutButton locale={locale} />
          </div>
        </div>

        {mobileOpen && (
          <div className="mt-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? "bg-app-accent text-white shadow-sm" : "bg-app-card-alt text-app-text hover:bg-white"}`}>
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.href === "/dashboard/online-bookings" && <OnlineBookingBadge />}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <aside className={`hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-app-soft lg:bg-app-card lg:py-6 lg:shadow-sm transition-all duration-200 ${desktopCollapsed ? "lg:w-24" : "lg:w-72"}`}>
        <div className="flex items-start justify-between gap-2 px-4 pb-6">
          {!desktopCollapsed ? (
            <div className="min-w-0">
              <div className="truncate text-xl font-bold text-app-text">{organizationName}</div>
              <div className="mt-1 text-sm text-app-muted">{dictionary.salonAdminPanel}</div>
            </div>
          ) : (
            <div className="text-sm font-bold text-app-text" title={organizationName}>{getInitials(organizationName)}</div>
          )}
          <button type="button" onClick={toggleDesktop} className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg">
            {desktopCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link key={item.href} href={item.href} className={`flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${desktopCollapsed ? "justify-center" : "gap-3"} ${active ? "bg-app-accent text-white shadow-sm" : "text-app-text hover:bg-app-card-alt"}`} title={desktopCollapsed ? item.label : undefined}>
                <Icon className="h-4 w-4 shrink-0" />
                {!desktopCollapsed ? (
                  <><span>{item.label}</span>{item.href === "/dashboard/online-bookings" && <OnlineBookingBadge />}</>
                ) : item.href === "/dashboard/online-bookings" ? <OnlineBookingBadge /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-3 pt-6">
          <div className="rounded-2xl border border-app-soft bg-app-card-alt p-4">
            {!desktopCollapsed ? (
              <>
                <div className="text-sm text-app-muted">{dictionary.loggedInAs}: <span className="font-medium text-app-text">{displayName}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/dashboard/account" className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg">{dictionary.myAccount}</Link>
                  <LogoutButton locale={locale} />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Link href="/dashboard/account" title={dictionary.myAccount} className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg"><UserCircle2 className="h-4 w-4" /></Link>
                <LogoutButton locale={locale} />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
