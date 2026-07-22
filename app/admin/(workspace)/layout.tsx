import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminLayout } from "@/components/admin/AdminLayout";

export default async function AdminWorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/admin/login");
  }

  return (
    <AdminLayout userEmail={session.user.email} userName={session.user.name}>
      {children}
    </AdminLayout>
  );
}
