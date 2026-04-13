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

type EditKind = "w1" | "w1_image" | "w2" | "w2_image";

export function WeightManagerView({ managerId, centerId }: { managerId: string; centerId: string | null }) {
  const supabase = useMemo(() => createClient(), []);

  const [tab, setTab] = useState<Tab>("realtime");
  const [pendingLogs, setPendingLogs] = useState<WheatLog[]>([]);
  const [historyLogs, setHistoryLogs] = useState<WheatLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLog, setSelectedLog] = useState<WheatLog | null>(null);
  const [editKind, setEditKind] = useState<EditKind | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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

  function openEdit(log: WheatLog, kind: EditKind) {
    setSelectedLog(log);
    setEditKind(kind);
    setWeightInput(kind === "w1" ? String(log.w1 ?? "") : kind === "w2" ? String(log.w2 ?? "") : "");
    setImageUrl(kind === "w1_image" ? log.w1_image_url : kind === "w2_image" ? log.w2_image_url : null);
  }

  function closeEdit() {
    setSelectedLog(null);
    setEditKind(null);
    setWeightInput("");
    setImageUrl(null);
  }

  async function completeIfReady(logId: string) {
    const { data: fresh } = await supabase.from("wheat_logs").select("*").eq("id", logId).single<WheatLog>();
    if (!fresh) return;

    const allComplete = Boolean(fresh.w1) && Boolean(fresh.w1_image_url) && Boolean(fresh.w2) && Boolean(fresh.w2_image_url);

    if (allComplete && fresh.status !== "completed") {
      await supabase
        .from("wheat_logs")
        .update({ status: "completed", weight_manager_id: managerId })
        .eq("id", logId);
    }
  }

  async function submitEdit() {
    if (!selectedLog || !editKind) return;

    setSaving(true);

    const updates: Partial<WheatLog> = { weight_manager_id: managerId };

    if (editKind === "w1") updates.w1 = Number(weightInput);
    if (editKind === "w2") updates.w2 = Number(weightInput);
    if (editKind === "w1_image") updates.w1_image_url = imageUrl;
    if (editKind === "w2_image") updates.w2_image_url = imageUrl;

    const { error } = await supabase.from("wheat_logs").update(updates).eq("id", selectedLog.id);

    if (!error) {
      await completeIfReady(selectedLog.id);
      await fetchLogs();
      closeEdit();
    }

    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <Button variant={tab === "realtime" ? "primary" : "secondary"} onClick={() => setTab("realtime")}>Realtime Logs</Button>
        <Button variant={tab === "history" ? "primary" : "secondary"} onClick={() => setTab("history")}>History</Button>
      </Card>

      <Card className="overflow-auto">
        {loading ? <p className="text-sm text-slate-600">Loading...</p> : null}
        {!loading && tab === "realtime" ? (
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                {[
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
                ].map((head) => (
                  <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pendingLogs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="border border-slate-200 px-2 py-2">{log.driver_name}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.cnic}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.phone ?? "-"}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.car_plate}</td>
                  <td className="border border-slate-200 px-2 py-2">
                    {log.car_image_url ? (
                      <Image src={log.car_image_url} alt="Car" width={72} height={54} className="rounded object-cover" />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-slate-200 px-2 py-2">{log.expected_bags}</td>
                  <td className="border border-slate-200 px-2 py-2">
                    <p>{log.w1 ?? "-"}</p>
                    <button className="text-amber-700" onClick={() => openEdit(log, "w1")}>✏️</button>
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <p>{log.w1_image_url ? "Uploaded" : "-"}</p>
                    <button className="text-amber-700" onClick={() => openEdit(log, "w1_image")}>✏️</button>
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <p>{log.w2 ?? "-"}</p>
                    <button className="text-amber-700" onClick={() => openEdit(log, "w2")}>✏️</button>
                  </td>
                  <td className="border border-slate-200 px-2 py-2">
                    <p>{log.w2_image_url ? "Uploaded" : "-"}</p>
                    <button className="text-amber-700" onClick={() => openEdit(log, "w2_image")}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {!loading && tab === "history" ? (
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                {["Date", "Name", "Car", "Bags", "W1", "W2", "W3"].map((head) => (
                  <th key={head} className="border border-slate-200 px-2 py-2">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historyLogs.map((log) => (
                <tr key={log.id}>
                  <td className="border border-slate-200 px-2 py-2">{formatDateTime(log.created_at)}</td>
                  <td className="border border-slate-200 px-2 py-2">{log.driver_name}</td>
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
          editKind === "w1"
            ? "Enter W1 weight"
            : editKind === "w2"
              ? "Enter W2 weight"
              : editKind === "w1_image"
                ? "Take/Upload Picture of W1"
                : "Take/Upload Picture of W2"
        }
        onClose={closeEdit}
      >
        <div className="space-y-4">
          {editKind === "w1" || editKind === "w2" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Weight value</label>
              <Input type="number" step="0.01" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
            </div>
          ) : (
            <FileUpload
              bucket="wheat-images"
              folder={editKind === "w1_image" ? "w1" : "w2"}
              label="Weight slip image"
              accept="image/*"
              onUploaded={setImageUrl}
            />
          )}
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={closeEdit}>Cancel</Button>
            <Button
              onClick={submitEdit}
              loading={saving}
              disabled={
                (editKind === "w1" || editKind === "w2") ? !weightInput : !imageUrl
              }
            >
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
