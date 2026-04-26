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
import { downloadWheatLogPdf, downloadWheatLogsPdf } from "@/lib/log-pdf";

interface AnalyticsViewProps {
  centerId?: string | null;
  showCenterColumn?: boolean;
  centerFilter?: string | null;
  allowedCenterIds?: string[];
  centerNameById?: Record<string, string>;
  allowFounderEdits?: boolean;
  currentUserId?: string | null;
}

type FounderEditForm = {
  center_id: string;
  gate_person_id: string;
  weight_manager_id: string;
  farmer_name: string;
  farmer_cnic: string;
  driver_name: string;
  driver_phone: string;
  vehicle_phone: string;
  expected_bags: string;
  second_godown: string;
  w1: string;
  w1_time: string;
  w2: string;
  w2_time: string;
  status: "pending" | "completed";
};

type EmployeeOption = {
  id: string;
  name: string;
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

function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export function AnalyticsView({
  centerId,
  showCenterColumn,
  centerFilter,
  allowedCenterIds,
  centerNameById,
  allowFounderEdits = false,
  currentUserId,
}: AnalyticsViewProps) {
  const supabase = useMemo(() => createClient(), []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [logs, setLogs] = useState<WheatLog[]>([]);
  const [employeeNameById, setEmployeeNameById] = useState<Record<string, string>>({});
  const [founderNameById, setFounderNameById] = useState<Record<string, string>>({});
  const [millNameByCenterId, setMillNameByCenterId] = useState<Record<string, string>>({});
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [editingLog, setEditingLog] = useState<WheatLog | null>(null);
  const [editForm, setEditForm] = useState<FounderEditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [gatePersonOptions, setGatePersonOptions] = useState<EmployeeOption[]>([]);
  const [weightManagerOptions, setWeightManagerOptions] = useState<EmployeeOption[]>([]);

  const centerOptions = useMemo(
    () =>
      Object.entries(centerNameById ?? {})
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [centerNameById],
  );

  const fetchLogs = useCallback(async () => {
    if (allowedCenterIds && allowedCenterIds.length === 0) {
      setLogs([]);
      return;
    }

    let query = supabase
      .from("wheat_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (centerId) query = query.eq("center_id", centerId);
    if (centerFilter) query = query.eq("center_id", centerFilter);
    if (allowedCenterIds?.length) query = query.in("center_id", allowedCenterIds);
    if (startDate) query = query.gte("created_at", `${startDate}T00:00:00`);
    if (endDate) query = query.lte("created_at", `${endDate}T23:59:59`);

    const { data } = await query;
    setLogs((data ?? []) as WheatLog[]);
  }, [allowedCenterIds, centerFilter, centerId, endDate, startDate, supabase]);

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

  useEffect(() => {
    const centerIds = Array.from(new Set(logs.map((log) => log.center_id).filter((value): value is string => Boolean(value))));

    if (!centerIds.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMillNameByCenterId({});
      return;
    }

    let active = true;

    void (async () => {
      const { data: centersDataRaw } = await supabase.from("centers").select("id, mill_id").in("id", centerIds);

      if (!active) {
        return;
      }

      const centersData = (centersDataRaw ?? []) as Array<{ id: string; mill_id: string | null }>;
      const millIds = Array.from(new Set(centersData.map((center) => center.mill_id).filter((value): value is string => Boolean(value))));

      if (!millIds.length) {
        setMillNameByCenterId({});
        return;
      }

      const { data: millsDataRaw } = await supabase.from("mills").select("id, name").in("id", millIds);

      if (!active) {
        return;
      }

      const millNameById = Object.fromEntries(((millsDataRaw ?? []) as Array<{ id: string; name: string | null }>).map((mill) => [mill.id, mill.name ?? mill.id]));
      setMillNameByCenterId(
        Object.fromEntries(
          centersData.map((center) => [center.id, center.mill_id ? (millNameById[center.mill_id] ?? "-") : "-"]),
        ),
      );
    })();

    return () => {
      active = false;
    };
  }, [logs, supabase]);

  useEffect(() => {
    if (!allowFounderEdits) {
      return;
    }

    let active = true;

    void (async () => {
      const { data } = await supabase.from("profiles").select("id, name, role").in("role", ["gate_person", "weight_manager"]).order("name", { ascending: true });

      if (!active) {
        return;
      }

      const options = (data ?? []) as Array<{ id: string; name: string | null; role: string }>;
      setGatePersonOptions(
        options
          .map((entry) => ({ id: entry.id, name: entry.name ?? entry.id })),
      );
      setWeightManagerOptions(
        options
          .filter((entry) => entry.role === "weight_manager")
          .map((entry) => ({ id: entry.id, name: entry.name ?? entry.id })),
      );
    })();

    return () => {
      active = false;
    };
  }, [allowFounderEdits, supabase]);

  useEffect(() => {
    const founderIds = Array.from(
      new Set(logs.map((log) => log.last_edited_by_founder_id).filter((value): value is string => Boolean(value))),
    );

    if (!founderIds.length) {
      return;
    }

    let active = true;

    void (async () => {
      const { data } = await supabase.from("profiles").select("id, name").in("id", founderIds);

      if (!active) {
        return;
      }

      setFounderNameById(Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.name ?? profile.id])));
    })();

    return () => {
      active = false;
    };
  }, [logs, supabase]);

  const totalBags = logs.reduce((sum, log) => sum + (log.expected_bags ?? 0), 0);
  const totalWeight = logs.reduce((sum, log) => sum + Number(log.w3 ?? 0), 0);

  const visibleLogs = logs.filter((log) => {
    const searchText = [
      log.entry_id,
      log.farmer_name,
      log.farmer_cnic,
      log.driver_name,
      log.driver_phone,
      log.vehicle_phone,
      log.cnic,
      log.phone,
      log.address,
      log.car_plate,
      String(log.expected_bags),
      String(log.second_godown ?? ""),
      String(log.w1 ?? ""),
      formatDateTime(log.w1_time ?? ""),
      String(log.w2 ?? ""),
      formatDateTime(log.w2_time ?? ""),
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

  const allVisibleReceiptsSelected = visibleLogs.length > 0 && visibleLogs.every((log) => selectedReceiptIds.includes(log.id));

  const selectedVisibleLogs = visibleLogs.filter((log) => selectedReceiptIds.includes(log.id));

  function toggleReceiptSelection(logId: string) {
    setSelectedReceiptIds((current) =>
      current.includes(logId) ? current.filter((entryId) => entryId !== logId) : [...current, logId],
    );
  }

  function toggleSelectAllReceipts() {
    const visibleIds = visibleLogs.map((log) => log.id);
    setSelectedReceiptIds(
      allVisibleReceiptsSelected
        ? selectedReceiptIds.filter((logId) => !visibleIds.includes(logId))
        : Array.from(new Set([...selectedReceiptIds, ...visibleIds])),
    );
  }

  async function handlePrintSelectedReceipts() {
    if (!selectedVisibleLogs.length) {
      return;
    }

    if (selectedVisibleLogs.length === 1) {
      await handlePrint(selectedVisibleLogs[0]);
      return;
    }

    await downloadWheatLogsPdf({
      items: selectedVisibleLogs.map((log) => ({
        log,
        millName: millNameByCenterId[log.center_id ?? ""] ?? null,
        centerName: centerNameById?.[log.center_id ?? ""],
        gatePersonName: employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? null,
        weightManagerName: employeeNameById[log.weight_manager_id ?? ""] ?? log.weight_manager_id ?? null,
      })),
      fileName: "wheat-receipts.pdf",
    });
  }

  async function handlePrint(log: WheatLog) {
    await downloadWheatLogPdf({
      log,
      millName: millNameByCenterId[log.center_id ?? ""] ?? null,
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
      farmer_name: log.farmer_name ?? "",
      farmer_cnic: log.farmer_cnic ?? log.cnic ?? "",
      driver_name: log.driver_name,
      driver_phone: log.driver_phone ?? log.phone ?? "",
      vehicle_phone: log.vehicle_phone ?? log.car_plate ?? "",
      expected_bags: String(log.expected_bags ?? ""),
      second_godown: log.second_godown === null || log.second_godown === undefined ? "" : String(log.second_godown),
      w1: log.w1 === null || log.w1 === undefined ? "" : String(log.w1),
      w1_time: toDateTimeLocalValue(log.w1_time),
      w2: log.w2 === null || log.w2 === undefined ? "" : String(log.w2),
      w2_time: toDateTimeLocalValue(log.w2_time),
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

    const parsedW1: number | null = toNumberOrNull(editForm.w1) ?? editingLog.w1 ?? null;
    const parsedW2: number | null = toNumberOrNull(editForm.w2) ?? editingLog.w2 ?? null;

    const updates: Partial<WheatLog> = {
      center_id: editForm.center_id.trim() || null,
      gate_person_id: editForm.gate_person_id.trim() || null,
      weight_manager_id: editForm.weight_manager_id.trim() || null,
      farmer_name: editForm.farmer_name.trim() || null,
      farmer_cnic: editForm.farmer_cnic.trim() || null,
      driver_name: editForm.driver_name.trim() || editingLog.driver_name,
      driver_phone: editForm.driver_phone.trim() || null,
      vehicle_phone: editForm.vehicle_phone.trim() || null,
      cnic: editForm.farmer_cnic.trim() || editingLog.cnic,
      phone: editForm.driver_phone.trim() || null,
      car_plate: editForm.vehicle_phone.trim() || editingLog.car_plate,
      expected_bags: toNumberOrFallback(editForm.expected_bags, editingLog.expected_bags),
      second_godown: toNumberOrNull(editForm.second_godown),
      w1: parsedW1,
      w1_time: fromDateTimeLocalValue(editForm.w1_time),
      w2: parsedW2,
      w2_time: fromDateTimeLocalValue(editForm.w2_time),
      status: editForm.status,
      last_edited_by_founder_id: currentUserId || null,
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
      "Entry ID": log.entry_id ?? "",
      "Gate Entry Time": formatDateTime(log.created_at),
      "Completion Time": log.status === "completed" ? formatDateTime(log.updated_at) : "",
      Center: centerNameById?.[log.center_id ?? ""] ?? "-",
      "Gate Person": employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? "-",
      "Weight Manager": employeeNameById[log.weight_manager_id ?? ""] ?? log.weight_manager_id ?? "-",
      "Farmer Name": log.farmer_name ?? "",
      "Farmer CNIC": log.farmer_cnic ?? log.cnic ?? "",
      "Driver Name": log.driver_name,
      "Driver Phone": log.driver_phone ?? log.phone ?? "",
      "Vehicle Number": log.vehicle_phone ?? log.car_plate ?? "",
      Bags: log.expected_bags,
      "Godown Number": log.second_godown,
      W1: log.w1,
      "Weight 1 Time": log.w1_time ? formatDateTime(log.w1_time) : "",
      W2: log.w2,
      "Weight 2 Time": log.w2_time ? formatDateTime(log.w2_time) : "",
      "Net Weight": log.w3,
      "Last Edited By": log.last_edited_by_founder_id ? founderNameById[log.last_edited_by_founder_id] ?? log.last_edited_by_founder_id : "-",
      Status: log.status,
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

  const computedNetWeight = (() => {
    if (!editForm) {
      return "-";
    }

    const w1: number | null = toNumberOrNull(editForm.w1) ?? editingLog?.w1 ?? null;
    const w2: number | null = toNumberOrNull(editForm.w2) ?? editingLog?.w2 ?? null;

    if (w1 !== null && w2 !== null) {
      return String(w1 - w2);
    }

    if (editingLog?.w3 === null || editingLog?.w3 === undefined) {
      return "-";
    }

    return String(editingLog.w3);
  })();

  const filteredTotalBags = visibleLogs.reduce((sum, log) => sum + Number(log.expected_bags ?? 0), 0);
  const filteredTotalNetWeight = visibleLogs.reduce((sum, log) => sum + Number(log.w3 ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <label className="mb-1 block text-sm font-medium text-slate-700">Search logs</label>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by farmer, farmer cnic, driver, vehicle number, net weight, or time"
        />
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-slate-600">Total Number of Bags</p>
          <p className="text-3xl font-black text-slate-900">{totalBags}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-600">Total Net Weight (Sum)</p>
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
        <Button type="button" variant="primary" onClick={() => void handlePrintSelectedReceipts()} disabled={!selectedVisibleLogs.length}>
          Print Receipts{selectedVisibleLogs.length ? ` (${selectedVisibleLogs.length})` : ""}
        </Button>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={allVisibleReceiptsSelected} onChange={toggleSelectAllReceipts} />
          Select all visible
        </label>
      </Card>

      <Card className="flex flex-wrap items-center gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Filtered Summary</p>
          <p className="text-sm text-slate-600">Totals from currently filtered rows</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Filtered Bags</p>
          <p className="text-2xl font-black text-slate-900">{filteredTotalBags}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Filtered Net Weight</p>
          <p className="text-2xl font-black text-slate-900">{formatNumber(filteredTotalNetWeight, 2)}</p>
        </div>
      </Card>

      <Card className="overflow-auto">
        <table className="w-full min-w-[1200px] border-collapse text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              {[
                "Entry ID",
                "Gate Entry Time",
                "Completion Time",
                ...(showCenterColumn ? ["Center"] : []),
                "Gate Person",
                "Farmer Name",
                "Farmer CNIC",
                "Driver Name",
                "Driver Phone",
                "Vehicle Number",
                "Car Image",
                "Bags",
                "W1",
                "Weight 1 Time",
                "W1 Image",
                "W2",
                "Weight 2 Time",
                "W2 Image",
                "Godown Number",
                "Net Weight",
                "Last Edited By",
                ...(allowFounderEdits ? ["Edit"] : []),
                "Select",
              ].map((head) => (
                <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleLogs.map((log) => (
              <tr key={log.id}>
                <td className="border border-slate-200 px-2 py-2">{log.entry_id ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.created_at)}</td>
                <td className="border border-slate-200 px-2 py-2">{log.status === "completed" ? formatDateTime(log.updated_at) : "-"}</td>
                {showCenterColumn ? (
                  <td className="border border-slate-200 px-2 py-2">{centerNameById?.[log.center_id ?? ""] ?? "-"}</td>
                ) : null}
                <td className="border border-slate-200 px-2 py-2">{employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.farmer_name ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.farmer_cnic ?? log.cnic ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.driver_name}</td>
                <td className="border border-slate-200 px-2 py-2">{log.driver_phone ?? log.phone ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.vehicle_phone ?? log.car_plate ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.car_image_url ? <a href={log.car_image_url} target="_blank" className="text-amber-700 underline">View</a> : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.expected_bags}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w1 ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w1_time ? formatDateTime(log.w1_time) : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w1_image_url ? <a href={log.w1_image_url} target="_blank" className="text-amber-700 underline">View</a> : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w2 ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w2_time ? formatDateTime(log.w2_time) : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w2_image_url ? <a href={log.w2_image_url} target="_blank" className="text-amber-700 underline">View</a> : "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.second_godown ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.w3 ?? "-"}</td>
                <td className="border border-slate-200 px-2 py-2">{log.last_edited_by_founder_id ? founderNameById[log.last_edited_by_founder_id] ?? log.last_edited_by_founder_id : "-"}</td>
                {allowFounderEdits ? (
                  <td className="border border-slate-200 px-2 py-2">
                    <Button type="button" variant="secondary" onClick={() => openFounderEdit(log)}>
                      Edit
                    </Button>
                  </td>
                ) : null}
                <td className="border border-slate-200 px-2 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={selectedReceiptIds.includes(log.id)}
                    onChange={() => toggleReceiptSelection(log.id)}
                    aria-label={`Select receipt for ${log.driver_name}`}
                  />
                </td>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Entry ID</label>
                <Input value={editingLog?.entry_id ?? "-"} disabled />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Farmer Name</label>
                <Input
                  value={editForm.farmer_name}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, farmer_name: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Farmer CNIC</label>
                <Input
                  value={editForm.farmer_cnic}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, farmer_cnic: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Driver Name</label>
                <Input
                  value={editForm.driver_name}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, driver_name: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Driver Phone</label>
                <Input
                  value={editForm.driver_phone}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, driver_phone: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle Number</label>
                <Input
                  value={editForm.vehicle_phone}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, vehicle_phone: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Center</label>
                <select
                  value={editForm.center_id}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, center_id: event.target.value } : prev))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {centerOptions.map((center) => (
                    <option key={center.id} value={center.id}>
                      {center.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Gate Person</label>
                <select
                  value={editForm.gate_person_id}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, gate_person_id: event.target.value } : prev))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {gatePersonOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight Manager</label>
                <select
                  value={editForm.weight_manager_id}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, weight_manager_id: event.target.value } : prev))}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {weightManagerOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Godown Number</label>
                <Input
                  type="number"
                  step="0.01"
                  value={editForm.second_godown}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, second_godown: event.target.value } : prev))}
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight 1 Time</label>
                <Input
                  type="datetime-local"
                  value={editForm.w1_time}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, w1_time: event.target.value } : prev))}
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
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight 2 Time</label>
                <Input
                  type="datetime-local"
                  value={editForm.w2_time}
                  onChange={(event) => setEditForm((prev) => (prev ? { ...prev, w2_time: event.target.value } : prev))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Net Weight (Auto = W1 - W2)</label>
                <Input value={computedNetWeight} disabled />
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
