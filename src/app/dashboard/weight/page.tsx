import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { WeightManagerView } from "@/components/dashboard/weight-manager-view";
import { requireRole } from "@/lib/server-auth";

export default async function WeightDashboardPage() {
  const { profile } = await requireRole("weight_manager");

  return (
    <DashboardShell title="Weight Manager Dashboard" profile={profile}>
      <WeightManagerView managerId={profile.id} centerId={profile.center_id} />
    </DashboardShell>
  );
}
