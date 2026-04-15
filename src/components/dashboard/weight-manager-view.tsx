"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { formatDateTime } from "@/lib/utils";
import { WheatLog } from "@/types/app";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { FileUpload } from "@/components/dashboard/file-upload";

type Tab = "realtime" | "history";

type EditKind = "bags" | "w1" | "w1_image" | "w2" | "w2_image";

export function WeightManagerView({ managerId, centerId }: { managerId: string; centerId: string | null }) {
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<Tab>("realtime");
  const [pendingLogs, setPendingLogs] = useState<WheatLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<WheatLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedLog, setSelectedLog] = useState<WheatLog | null>(null);
  const [editKind, setEditKind] = useState<EditKind | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [employeeNameById, setEmployeeNameById] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    const pendingQuery = supabase
      .from("wheat_logs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const historyQuery = supabase
      .from("wheat_logs")
      .select("*")
      .eq("status", "completed")
      .eq("weight_manager_id", managerId)
      .order("created_at", { ascending: false });

    if (centerId) {
      pendingQuery.eq("center_id", centerId);
      historyQuery.eq("center_id", centerId);
    }

    const [{ data: pendingData }, { data: historyData }] = await Promise.all([pendingQuery, historyQuery]);

    setPendingLogs((pendingData ?? []) as WheatLog[]);
    setHistoryLogs((historyData ?? []) as WheatLog[]);
    setLoading(false);
  }, [centerId, managerId, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLogs();
    const channel = supabase
      .channel("wheat-logs-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "wheat_logs" }, () => {
        void fetchLogs();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLogs, supabase]);

  useEffect(() => {
    const ids = Array.from(
      new Set(
        [...pendingLogs, ...historyLogs].flatMap((log) => [log.gate_person_id, log.weight_manager_id]).filter((value): value is string => Boolean(value)),
      ),
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
  }, [historyLogs, pendingLogs, supabase]);

  function openEdit(log: WheatLog, kind: EditKind) {
    setPageError(null);
    setSelectedLog(log);
    setEditKind(kind);
    setWeightInput(
      kind === "bags"
        ? String(log.expected_bags ?? "")
        : kind === "w1"
          ? String(log.w1 ?? "")
          : kind === "w2"
            ? String(log.w2 ?? "")
            : "",
    );
    setImageUrl(kind === "w1_image" ? log.w1_image_url : kind === "w2_image" ? log.w2_image_url : null);
  }

  function closeEdit() {
    setSelectedLog(null);
    setEditKind(null);
    setWeightInput("");
    setImageUrl(null);
  }

  const visiblePendingLogs = pendingLogs.filter((log) => {
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
      employeeNameById[log.gate_person_id ?? ""],
      employeeNameById[log.weight_manager_id ?? ""],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(searchQuery.toLowerCase().trim());
  });

  const visibleHistoryLogs = historyLogs.filter((log) => {
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
      employeeNameById[log.gate_person_id ?? ""],
      employeeNameById[log.weight_manager_id ?? ""],
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchText.includes(searchQuery.toLowerCase().trim());
  });

  async function completeLog(log: WheatLog) {
    setPageError(null);

    if (!log.w1 || !log.w1_image_url || !log.w2 || !log.w2_image_url) {
      setPageError("Complete W1, W1 image, W2, and W2 image before submitting.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("wheat_logs")
      .update({ status: "completed", weight_manager_id: managerId, updated_at: new Date().toISOString() })
      .eq("id", log.id);

    if (error) {
      setPageError(error.message);
    } else {
      await fetchLogs();
    }

    setSaving(false);
  }

  async function submitEdit() {
    if (!selectedLog || !editKind) return;

    setSaving(true);
    setPageError(null);

    const updates: Partial<WheatLog> = { weight_manager_id: managerId };

    if (editKind === "bags") updates.expected_bags = Number(weightInput);
    if (editKind === "w1") updates.w1 = Number(weightInput);
    if (editKind === "w2") updates.w2 = Number(weightInput);
    if (editKind === "w1_image") updates.w1_image_url = imageUrl;
    if (editKind === "w2_image") updates.w2_image_url = imageUrl;

    const { error } = await supabase.from("wheat_logs").update(updates).eq("id", selectedLog.id);

    if (!error) {
      await fetchLogs();
      closeEdit();
    } else {
      setPageError(error.message);
    }

    setSaving(false);
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

      <Card className="flex flex-wrap items-center gap-3">
        <Button variant={tab === "realtime" ? "primary" : "secondary"} onClick={() => setTab("realtime")}>Realtime Logs</Button>
        <Button variant={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>History</Button>
      </Card>

      {pageError ? <Card className="border-red-200 bg-red-50 text-sm text-red-700">{pageError}</Card> : null}

      <Card className="overflow-auto">
        {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
        {!loading && tab === "realtime" ? (
          <table className="w-full min-w-[1400px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                {[
                  "Gate Entry Time",
                  "Completion Time",
                  "Name",
                  "CNIC",
                  "Phone",
                  "Car Plate",
                  "Gate Person",
                  "Car Image",
                  "Bags",
                  "W1",
                  "W1 Image",
                  "W2",
                  "W2 Image",
                  "Submit",
                ].map((head) => (
                  <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePendingLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.created_at)}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.status === "completed" ? formatDateTime(log.updated_at) : "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.driver_name}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.cnic}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.phone ?? "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.car_plate}</td>
                  <td className="border border-slate-200 px-2 py-2">{employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">
                    {log.car_image_url ? (
                      <a href={log.car_image_url} target="_blank" rel="noreferrer">
                        <Image src={log.car_image_url} alt="Car" width={72} height={54} className="rounded object-cover" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <div className="flex items-center gap-2">
                      <p>{log.expected_bags}</p>
                      <button className="text-amber-700" onClick={() => openEdit(log, "bags")} disabled={log.status === "completed"}>
                        ✏️
                      </button>
                    </div>
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <div className="flex items-center gap-2">
                      <p>{log.w1 ?? "-"}</p>
                      <button className="text-amber-700" onClick={() => openEdit(log, "w1")} disabled={log.status === "completed"}>
                        ✏️
                      </button>
                    </div>
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    {log.w1_image_url ? (
                      <div className="space-y-1">
                        <p className="font-medium text-green-700">Uploaded</p>
                        <a href={log.w1_image_url} target="_blank" rel="noreferrer" className="block text-xs text-amber-700 underline">
                          View image
                        </a>
                      </div>
                    ) : (
                      <button className="text-amber-700" onClick={() => openEdit(log, "w1_image")}>
                        ✏️
                      </button>
                    )}
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <div className="flex items-center gap-2">
                      <p>{log.w2 ?? "-"}</p>
                      <button className="text-amber-700" onClick={() => openEdit(log, "w2")} disabled={log.status === "completed"}>
                        ✏️
                      </button>
                    </div>
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    {log.w2_image_url ? (
                      <div className="space-y-1">
                        <p className="font-medium text-green-700">Uploaded</p>
                        <a href={log.w2_image_url} target="_blank" rel="noreferrer" className="block text-xs text-amber-700 underline">
                          View image
                        </a>
                      </div>
                    ) : (
                      <button className="text-amber-700" onClick={() => openEdit(log, "w2_image")}>
                        ✏️
                      </button>
                    )}
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <Button
                      type="button"
                      variant={log.status === "completed" ? "secondary" : "primary"}
                      onClick={() => void completeLog(log)}
                      loading={saving && selectedLog?.id === log.id}
                      disabled={log.status === "completed"}
                    >
                      {log.status === "completed" ? "Completed" : "Submit"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && tab === "history" ? (
          <table className="w-full min-w-[1300px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                {[
                  "Gate Entry Time",
                  "Completion Time",
                  "Name",
                  "Gate Person",
                  "Car",
                  "Bags",
                  "W1",
                  "W2",
                  "W3",
                ].map((head) => (
                  <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleHistoryLogs.map((log) => (
                <tr key={log.id}>
                  <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.created_at)}</td>
                  <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.updated_at)}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.driver_name}</td>
                  <td className="border border-slate-200 px-2 py-2">{employeeNameById[log.gate_person_id ?? ""] ?? log.gate_person_id ?? "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.car_plate}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.expected_bags}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.w1 ?? "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.w2 ?? "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.w3 ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Card>

      <Modal
        open={Boolean(selectedLog && editKind)}
        title={
          editKind === "bags"
            ? "Update expected bags"
            : editKind === "w1"
            ? "Enter W1 weight"
            : editKind === "w2"
              ? "Enter W2 weight"
              : editKind === "w1_image"
                ? "Take/Upload Picture of W1"
                : "Take/Upload Picture of W2"
        }
        onClose={closeEdit}
          showCloseButton={false}
      >
        <div className="space-y-4">
          {editKind === "bags" || editKind === "w1" || editKind === "w2" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{editKind === "bags" ? "Bag count" : "Weight value"}</label>
              <Input
                type="number"
                step={editKind === "bags" ? "1" : "0.01"}
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
              />
            </div>
          ) : (
            <FileUpload
              bucket="wheat-images"
              folder={editKind === "w1_image" ? "w1" : "w2"}
              label="Weight slip image"
              accept="image/*"
                value={imageUrl}
                allowReplace={false}
              onUploaded={setImageUrl}
                onRemoved={() => setImageUrl(null)}
            />
          )}
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button
              onClick={submitEdit}
              loading={saving}
              disabled={editKind === "bags" || editKind === "w1" || editKind === "w2" ? !weightInput : !imageUrl}
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
