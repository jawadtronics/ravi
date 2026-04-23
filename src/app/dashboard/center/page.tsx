import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { requireRole } from "@/lib/server-auth";

export default async function CenterManagerDashboardPage() {
  const { profile } = await requireRole("center_manager");

  return (
    <DashboardShell title="Center Manager Dashboard" profile={profile}>
      <AnalyticsView centerId={profile.center_id} />
    </DashboardShell>
  );
}
