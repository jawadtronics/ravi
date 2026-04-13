import { ReactNode } from "react";
import { requireAnyDashboardAccess } from "@/lib/server-auth";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireAnyDashboardAccess();
  return children;
}
