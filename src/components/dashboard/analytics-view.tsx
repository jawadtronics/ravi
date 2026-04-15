"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { WheatLog } from "@/types/app";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { downloadWheatLogPdf } from "@/lib/log-pdf";

interface AnalyticsViewProps {
  centerId?: string | null;
  showCenterColumn?: boolean;
  centerFilter?: string | null;
  centerNameById?: Record<string, string>;
  allowFounderEdits?: boolean;
}

type FounderEditForm = {
  center_id: string;
  gate_person_id: string;
  weight_manager_id: string;
  driver_name: string;
  cnic: string;
  phone: string;
  address: string;
  car_plate: string;
  expected_bags: string;
  w1: string;
  w2: string;
  w3: string;
  status: "pending" | "completed";
};

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : null;
}

function toNumberOrFallback(value: string, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function AnalyticsView({
  centerId,
  showCenterColumn,
  centerFilter,
  centerNameById,
  allowFounderEdits = false,
}: AnalyticsViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<WheatLog[]>([]);
  const [employeeNameById, setEmployeeNameById] = useState<Record<string, string>>({});
  const [editingLog, setEditingLog] = useState<WheatLog | null>(null);
  const [editForm, setEditForm] = useState<FounderEditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  useEffect(() => {
    const ids = Array.from(
      new Set(logs.flatMap((log) => [log.gate_person_id, log.weight_manager_id]).filter((value): value is string => Boolean(value))),
    );

    if (!ids.length) {
      return;
    }

    let active = true;

    void (async () => {
      const { data } = await supabase.from("profiles").select("id, name").in("id", ids);

      if (!active) {
        return;
      }

      setEmployeeNameById(Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.name ?? profile.id])));
    })();

    return () => {
      active = false;
    };
  }, [logs, supabase]);

  const totalBags = logs.reduce((sum, log) => sum + (log.expected_bags ?? 0), 0);
  const totalWeight = logs.reduce((sum, log) => sum + Number(log.w3 ?? 0), 0);

  const visibleLogs = logs.filter((log) => {
    const searchText = [
      log.driver_name,
      log.cnic,
      log.phone,
      log.address,
      log.car_plate,
      String(log.expected_bags),
      String(log.w1 ?? ""),
      String(log.w2 ?? ""),
      String(log.w3 ?? ""),
      formatDateTime(log.created_at),
      formatDateTime(log.updated_at),
      centerNameById?.[log.center_id ?? ""],
      employeeNameById[log.gate_person_id ?? ""],
      employeeNameById[log.weight_manager_id ?? ""],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(searchQuery.toLowerCase().trim());
  });

  async function handlePrint(log: WheatLog) {
    await downloadWheatLogPdf({
      log,
      centerName: centerNameById?.[log.center_id ?? ""],
      gatePersonName: employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? null,
      weightManagerName: employeeNameById[log.weight_manager_id ?? ""] ?? log.weight_manager_id ?? null,
      fileName: `wheat-log-${log.driver_name.replaceAll(" ", "-").toLowerCase()}.pdf`,
    });
  }

  function openFounderEdit(log: WheatLog) {
    setEditError(null);
    setEditingLog(log);
    setEditForm({
      center_id: log.center_id ?? "",
      gate_person_id: log.gate_person_id ?? "",
      weight_manager_id: log.weight_manager_id ?? "",
      driver_name: log.driver_name,
      cnic: log.cnic,
      phone: log.phone ?? "",
      address: log.address ?? "",
      car_plate: log.car_plate,
      expected_bags: String(log.expected_bags ?? ""),
      w1: log.w1 === null || log.w1 === undefined ? "" : String(log.w1),
      w2: log.w2 === null || log.w2 === undefined ? "" : String(log.w2),
      w3: log.w3 === null || log.w3 === undefined ? "" : String(log.w3),
      status: log.status,
    });
  }

  function closeFounderEdit() {
    setEditingLog(null);
    setEditForm(null);
    setEditError(null);
  }

  async function submitFounderEdit() {
    if (!editingLog || !editForm) {
      return;
    }

    setSavingEdit(true);
    setEditError(null);

    const updates: Partial<WheatLog> = {
      center_id: editForm.center_id.trim() || null,
      gate_person_id: editForm.gate_person_id.trim() || null,
      weight_manager_id: editForm.weight_manager_id.trim() || null,
      driver_name: editForm.driver_name.trim() || editingLog.driver_name,
      cnic: editForm.cnic.trim() || editingLog.cnic,
      phone: editForm.phone.trim() || null,
      address: editForm.address.trim() || null,
      car_plate: editForm.car_plate.trim() || editingLog.car_plate,
      expected_bags: toNumberOrFallback(editForm.expected_bags, editingLog.expected_bags),
      w1: toNumberOrNull(editForm.w1),
      w2: toNumberOrNull(editForm.w2),
      w3: toNumberOrNull(editForm.w3),
      status: editForm.status,
    };

    const { error } = await supabase.from("wheat_logs").update(updates).eq("id", editingLog.id);

    if (error) {
      setEditError(error.message);
      setSavingEdit(false);
      return;
    }

    await fetchLogs();
    setSavingEdit(false);
    closeFounderEdit();
  }

  function exportData(type: "csv" | "xlsx") {
    const rows = visibleLogs.map((log) => ({
      "Gate Entry Time": formatDateTime(log.created_at),
      "Completion Time": log.status === "completed" ? formatDateTime(log.updated_at) : "",
      Center: centerNameById?.[log.center_id ?? ""] ?? "-",
      "Gate Person": employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? "-",
      "Weight Manager": employeeNameById[log.weight_manager_id ?? ""] ?? log.weight_manager_id ?? "-",
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
      <Card>
        <label className="mb-1 block text-sm font-medium text-slate-700">Search logs</label>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by name, CNIC, phone, car plate, weight, or time"
        />
      </Card>

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
                "Gate Entry Time",
                "Completion Time",
                ...(showCenterColumn ? ["Center"] : []),
                "Gate Person",
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
                "Print",
                ...(allowFounderEdits ? ["Edit"] : []),
              ].map((head) => (
                <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleLogs.map((log) => (
              <tr key={log.id}>
                <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.created_at)}</td>
                <td className="border border-slate-200 px-2 py-2">{log.status === "completed" ? formatDateTime(log.updated_at) : "-"}</td>
                {showCenterColumn ? (
                  <td className="border border-slate-200 px-2 py-2">{centerNameById?.[log.center_id ?? ""] ?? "-"}</td>
                ) : null}
                <td className="border border-slate-200 px-2 py-2">{employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? "-"}</td>
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
                <td className="border border-slate-200 px-2 py-2">
                  <Button type="button" variant="secondary" onClick={() => void handlePrint(log)}>
                    Print
                  </Button>
                </td>
                {allowFounderEdits ? (
                  <td className="border border-slate-200 px-2 py-2">
                    <Button type="button" variant="secondary" onClick={() => openFounderEdit(log)}>
                      Edit
                    </Button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={Boolean(allowFounderEdits && editingLog && editForm)} onClose={closeFounderEdit} title="Edit Log">
        {editForm ? (
          <div className="space-y-4">
            {editError ? <p className="text-sm text-red-700">{editError}</p> : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Driver Name</label>
                <Input
                  value={editForm.driver_name}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, driver_name: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">CNIC</label>
                <Input
                  value={editForm.cnic}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, cnic: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
                <Input
                  value={editForm.phone}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Car Plate</label>
                <Input
                  value={editForm.car_plate}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, car_plate: event.target.value } : prev))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
                <Input
                  value={editForm.address}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Center Id</label>
                <Input
                  value={editForm.center_id}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, center_id: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gate Person Id</label>
                <Input
                  value={editForm.gate_person_id}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, gate_person_id: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight Manager Id</label>
                <Input
                  value={editForm.weight_manager_id}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, weight_manager_id: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((prev) =>
                      prev ? { ...prev, status: event.target.value as "pending" | "completed" } : prev,
                    )
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="pending">pending</option>
                  <option value="completed">completed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Bags</label>
                <Input
                  type="number"
                  value={editForm.expected_bags}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, expected_bags: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">W1</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.w1}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, w1: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">W2</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.w2}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, w2: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">W3</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.w3}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, w3: event.target.value } : prev))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={closeFounderEdit}>
                Cancel
              </Button>
              <Button onClick={() => void submitFounderEdit()} loading={savingEdit}>
                Save changes
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
