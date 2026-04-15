"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Center, Profile } from "@/types/app";
import { FounderCenterAnalytics } from "@/components/dashboard/founder-center-analytics";
import { ManageEmployeeView } from "@/components/dashboard/manage-employee-view";

type FounderWorkspaceViewProps = {
  profile: Profile;
  centers: Center[];
};

type TabKey = "logs" | "employees";

export function FounderWorkspaceView({ profile, centers }: FounderWorkspaceViewProps) {
  const [tab, setTab] = useState<TabKey>("logs");

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Welcome back</p>
          <h2 className="text-2xl font-black text-slate-900">{profile.name ?? "Founder"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={tab === "logs" ? "primary" : "secondary"} onClick={() => setTab("logs")}>
            Global Realtime Logs
          </Button>
          <Button variant={tab === "employees" ? "primary" : "secondary"} onClick={() => setTab("employees")}>
            Manage Employee
          </Button>
        </div>
      </Card>

      {tab === "logs" ? <FounderCenterAnalytics centers={centers} /> : <ManageEmployeeView centers={centers} />}
    </div>
  );
}