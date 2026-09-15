"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  Store,
  UserPlus,
} from "lucide-react";

const items = [
  { href: "/platform", label: "Pregled", icon: LayoutDashboard, exact: true },
  { href: "/platform/trials/new", label: "Novi trial", icon: UserPlus },
  { href: "/platform/email", label: "Managed email", icon: Mail },
  { href: "/platform/feedback", label: "Feedback", icon: MessageSquareText },
];

export default function PlatformAdminNav() {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-800 bg-slate-950 text-white lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-4 px-5 py-5 lg:block lg:px-6 lg:py-7">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <p className="font-bold">SalonFlow</p>
            <p className="text-xs text-slate-400">Platform Admin</p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 lg:hidden"
        >
          Salon
        </Link>
      </div>

      <nav className="flex gap-2 overflow-x-auto px-4 pb-4 lg:block lg:space-y-2 lg:overflow-visible lg:px-4 lg:pb-0">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition lg:flex ${
                active
                  ? "bg-white text-slate-950"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden px-4 lg:absolute lg:bottom-6 lg:left-0 lg:right-0 lg:block">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <Store className="h-4 w-4" />
          Natrag u salon
        </Link>
      </div>
    </aside>
  );
}
