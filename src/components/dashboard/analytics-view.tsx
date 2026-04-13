"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { WheatLog } from "@/types/app";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AnalyticsViewProps {
  centerId?: string | null;
  showCenterColumn?: boolean;
  centerFilter?: string | null;
  centerNameById?: Record<string, string>;
}

export function AnalyticsView({
  centerId,
  showCenterColumn,
  centerFilter,
  centerNameById,
}: AnalyticsViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [logs, setLogs] = useState<WheatLog[]>([]);

  const fetchLogs = useCallback(async () => {
    let query = supabase
      .from("wheat_logs")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (centerId) query = query.eq("center_id", centerId);
    if (centerFilter) query = query.eq("center_id", centerFilter);
    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

    const { data } = await query;
    setLogs((data ?? []) as WheatLog[]);
  }, [centerFilter, centerId, endDate, startDate, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs();
  }, [fetchLogs]);

  const totalBags = logs.reduce((sum, log) => sum + (log.expected_bags ?? 0), 0);
  const totalWeight = logs.reduce((sum, log) => sum + Number(log.w3 ?? 0), 0);

  function exportData(type: "csv" | "xlsx") {
    const rows = logs.map((log) => ({
      Date: formatDateTime(log.created_at),
      Center: centerNameById?.[log.center_id ?? ""] ?? "-",
      Name: log.driver_name,
      CNIC: log.cnic,
      Phone: log.phone ?? "",
      CarPlate: log.car_plate,
      Bags: log.expected_bags,
      W1: log.w1,
      W2: log.w2,
      W3: log.w3,
    }));

    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Logs");

    if (type === "xlsx") {
      XLSX.writeFile(workbook, "wheat_logs.xlsx");
    } else {
      XLSX.writeFile(workbook, "wheat_logs.csv", { bookType: "csv" });
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-600">Total Number of Bags</p>
          <p className="text-3xl font-black text-slate-900">{totalBags}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Total Weight (Sum of W3)</p>
          <p className="text-3xl font-black text-slate-900">{formatNumber(totalWeight, 2)}</p>
        </Card>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Start Date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">End Date</label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <Button type="button" variant="secondary" onClick={() => exportData("xlsx")}>Export XLSX</Button>
        <Button type="button" variant="secondary" onClick={() => exportData("csv")}>Export CSV</Button>
      </Card>

      <Card className="overflow-auto">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              {[
                "Date",
                ...(showCenterColumn ? ["Center"] : []),
                "Name",
                "CNIC",
                "Phone",
                "Car Plate",
                "Car Image",
                "Bags",
                "W1",
                "W1 Image",
                "W2",
                "W2 Image",
                "W3",
              ].map((head) => (
                <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.created_at)}</td>
                {showCenterColumn ? (
                  <td className="border border-slate-200 px-2 py-2">{centerNameById?.[log.center_id ?? ""] ?? "-"}</td>
                ) : null}
                <td className="border border-slate-200 px-2 py-2">{log.driver_name}</td>
                <td className="border border-slate-200 px-2 py-2">{log.cnic}</td>
                <td className="border border-slate-200 px-2 py-2">{log.phone ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.car_plate}</td>
                <td className="border border-slate-200 px-2 py-2">{log.car_image_url ? <a href={log.car_image_url} target="_blank" className="text-amber-700 underline">View</a> : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.expected_bags}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w1 ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w1_image_url ? <a href={log.w1_image_url} target="_blank" className="text-amber-700 underline">View</a> : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w2 ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w2_image_url ? <a href={log.w2_image_url} target="_blank" className="text-amber-700 underline">View</a> : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w3 ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
