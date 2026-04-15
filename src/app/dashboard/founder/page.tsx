import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FounderWorkspaceView } from "@/components/dashboard/founder-workspace-view";
import { requireRole } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { Center } from "@/types/app";

export default async function FounderDashboardPage() {
  const { profile } = await requireRole("founder");
  const supabase = await createClient();

  const { data: centersData } = await supabase.from("centers").select("id, name, location").order("name");

  const centers = (centersData ?? []) as Center[];

  return (
    <DashboardShell title="Founder Dashboard" profile={profile}>
      <FounderWorkspaceView profile={profile} centers={centers} />
    </DashboardShell>
  );
}
