import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireRole } from "@/lib/server-auth";

export default async function SuperDashboardPage() {
  const { profile } = await requireRole("super_manager");

  return (
    <DashboardShell title="Super Manager Dashboard" profile={profile}>
      <AnalyticsView centerId={profile.center_id} />
    </DashboardShell>
  );
}
