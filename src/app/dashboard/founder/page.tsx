import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FounderWorkspaceView } from "@/components/dashboard/founder-workspace-view";
import { requireRole } from "@/lib/server-auth";
import { createClient } from "@/lib/supabase/server";
import { Center } from "@/types/app";

export default async function FounderDashboardPage() {
  const { profile } = await requireRole("founder");
  const supabase = await createClient();

  const { data: centersData } = profile.mill_id
    ? await supabase.from("centers").select("id, mill_id, name, location").eq("mill_id", profile.mill_id).order("name")
    : profile.center_id
      ? await supabase.from("centers").select("id, mill_id, name, location").eq("id", profile.center_id).order("name")
      : { data: [] as Center[] };

  const centers = (centersData ?? []) as Center[];

  return (
    <DashboardShell title="Founder Dashboard" profile={profile}>
      <FounderWorkspaceView profile={profile} centers={centers} />
    </DashboardShell>
  );
}
