import { redirect } from "next/navigation";
import { getDashboardRoute } from "@/lib/auth";
import { requireAnyDashboardAccess } from "@/lib/server-auth";

export default async function DashboardIndexPage() {
  const { profile } = await requireAnyDashboardAccess();
  redirect(getDashboardRoute(profile.role));
}
