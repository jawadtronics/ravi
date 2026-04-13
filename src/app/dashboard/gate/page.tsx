import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GateForm } from "@/components/dashboard/gate-form";
import { requireRole } from "@/lib/server-auth";

export default async function GateDashboardPage() {
  const { profile } = await requireRole("gate_person");

  return (
    <DashboardShell title="Gate Person Dashboard" profile={profile}>
      <GateForm gatePersonId={profile.id} centerId={profile.center_id} />
    </DashboardShell>
  );
}
