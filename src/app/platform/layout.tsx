import type { ReactNode } from "react";
import PlatformAdminNav from "@/components/platform-admin-nav";
import { requirePlatformAdmin } from "@/lib/platform-admin";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" data-theme="slate" lang="hr">
      <div className="lg:flex">
        <PlatformAdminNav />
        <main className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 sm:px-6 lg:px-8">
            Platform administrator: <span className="font-semibold text-slate-800">{admin.displayName}</span>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
