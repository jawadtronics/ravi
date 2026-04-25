import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { OwnerRegisterMillView } from "@/components/dashboard/owner-register-mill-view";
import { requireRole } from "@/lib/server-auth";

export default async function OwnerDashboardPage() {
  const { profile } = await requireRole("owner");

  return (
    <DashboardShell title="Owner Dashboard" profile={profile}>
      <OwnerRegisterMillView />
    </DashboardShell>
  );
}
