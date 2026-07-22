import type { ReactNode } from "react";

import { AdminLayout } from "@/components/admin/AdminLayout";

export default function AdminWorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AdminLayout>{children}</AdminLayout>;
}
