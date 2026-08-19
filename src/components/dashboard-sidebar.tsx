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
import { useEffect, useMemo, useState } from "react";
import LogoutButton from "@/components/logout-button";
import OnlineBookingBadge from "@/components/online-booking-badge";

type AppRole = "admin" | "employee";

type Props = {
  role: AppRole;
  displayName: string;
  organizationName: string;
};

const allNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "employee"] },
  { href: "/dashboard/online-bookings", label: "Online rezervacije", icon: BellRing, roles: ["admin", "employee"] },
  { href: "/dashboard/appointments", label: "Termini", icon: ListChecks, roles: ["admin", "employee"] },
  { href: "/dashboard/calendar", label: "Kalendar", icon: CalendarDays, roles: ["admin", "employee"] },
  { href: "/dashboard/calendar/week", label: "Tjedni kalendar", icon: CalendarDays, roles: ["admin", "employee"] },
  { href: "/dashboard/calendar/time-grid", label: "Time Grid", icon: Clock3, roles: ["admin", "employee"] },
  { href: "/dashboard/clients", label: "Klijenti", icon: Users, roles: ["admin", "employee"] },
  { href: "/dashboard/account", label: "Moj račun", icon: UserCircle2, roles: ["admin", "employee"] },
  { href: "/dashboard/schedule", label: "Rasporedi", icon: Users, roles: ["admin"] },
  { href: "/dashboard/reports", label: "Reports", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/dashboard/settings", label: "Postavke", icon: Settings, roles: ["admin"] },
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

export default function DashboardSidebar({ role, displayName, organizationName }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  const navItems = useMemo(
    () => allNavItems.filter((item) => item.roles.includes(role)),
    [role],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("dashboard-sidebar-collapsed");
    if (saved === "true") setDesktopCollapsed(true);
  }, []);

  function toggleDesktop() {
    setDesktopCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem("dashboard-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <>
      <div className="sticky top-0 z-50 border-b border-app-soft bg-app-card px-4 py-3 shadow-sm lg:hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-app-text">{organizationName}</div>
            <div className="text-xs text-app-muted">Salon admin panel</div>
          </div>
          <button type="button" onClick={() => setMobileOpen((prev) => !prev)} className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg">
            {mobileOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-app-soft bg-app-card-alt px-4 py-3">
          <div className="text-sm text-app-muted">Logiran kao: <span className="font-medium text-app-text">{displayName}</span></div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/account" className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg">Moj račun</Link>
            <LogoutButton />
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
              <div className="mt-1 text-sm text-app-muted">Salon admin panel</div>
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
                <div className="text-sm text-app-muted">Logiran kao: <span className="font-medium text-app-text">{displayName}</span></div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/dashboard/account" className="rounded-xl border border-app-soft bg-white px-3 py-2 text-sm font-medium text-app-text transition hover:bg-app-bg">Moj račun</Link>
                  <LogoutButton />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Link href="/dashboard/account" title="Moj račun" className="rounded-xl border border-app-soft bg-white p-2 text-app-text transition hover:bg-app-bg"><UserCircle2 className="h-4 w-4" /></Link>
                <LogoutButton />
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
