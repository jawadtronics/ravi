"use client";

import { useMemo, useState } from "react";
import { AnalyticsView } from "@/components/dashboard/analytics-view";
import { Center } from "@/types/app";

export function FounderCenterAnalytics({ centers }: { centers: Center[] }) {
  const [selectedCenter, setSelectedCenter] = useState<string>("all");

  const centerNameById = useMemo(() => {
    return Object.fromEntries(centers.map((center) => [center.id, center.name]));
  }, [centers]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="mb-1 block text-sm font-medium text-slate-700">Filter by Center</label>
        <select
          value={selectedCenter}
          onChange={(e) => setSelectedCenter(e.target.value)}
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Centers</option>
          {centers.map((center) => (
            <option key={center.id} value={center.id}>
              {center.name}
            </option>
          ))}
        </select>
      </div>
      <AnalyticsView
        showCenterColumn
        centerFilter={selectedCenter === "all" ? null : selectedCenter}
        centerNameById={centerNameById}
      />
    </div>
  );
}
