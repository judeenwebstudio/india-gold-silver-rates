import type { ReactNode } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminLayoutProps = {
  children: ReactNode;
  userEmail: string;
  userName?: string | null;
};

export function AdminLayout({ children, userEmail, userName }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#f4f1ea]">
      <a
        href="#admin-content"
        className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-lg bg-stone-950 px-4 py-2 text-sm font-bold text-white transition-transform focus:translate-y-0"
      >
        Skip to dashboard content
      </a>
      <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)]">
        <AdminSidebar />
        <div className="min-w-0">
          <AdminHeader userEmail={userEmail} userName={userName} />
          <main id="admin-content" className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
