import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SuperManagerCenterAnalytics } from "@/components/dashboard/super-manager-center-analytics";
import { requireRole } from "@/lib/server-auth";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { Center } from "@/types/app";

export default async function SuperManagerDashboardPage() {
  const { profile } = await requireRole("super_manager");
  const supabase = await createClient();

  const { data: centersData } = await supabase.from("centers").select("id, name, location").order("name");
  const centers = (centersData ?? []) as Center[];

  return (
    <DashboardShell title="Super Manager Dashboard" profile={profile}>
      <div className="space-y-6">
        <Card className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Welcome back</p>
            <h2 className="text-2xl font-black text-slate-900">{profile.name ?? "Super Manager"}</h2>
          </div>
        </Card>

        <SuperManagerCenterAnalytics centers={centers} />
      </div>
    </DashboardShell>
  );
}
