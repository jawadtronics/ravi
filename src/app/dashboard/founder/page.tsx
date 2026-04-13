import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { FounderCenterAnalytics } from "@/components/dashboard/founder-center-analytics";
import { RegisterPersonForm } from "@/components/dashboard/register-person-form";
import { Card } from "@/components/ui/card";
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
      <div className="space-y-6">
        <RegisterPersonForm centers={centers} />
        <Card>
          <h2 className="mb-4 text-xl font-bold text-slate-900">Global Realtime Logs</h2>
          <FounderCenterAnalytics centers={centers} />
        </Card>
      </div>
    </DashboardShell>
  );
}
