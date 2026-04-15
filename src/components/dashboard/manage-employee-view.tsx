"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegisterPersonForm } from "@/components/dashboard/register-person-form";
import { Center, EmployeeRecord } from "@/types/app";
import { formatDateTime } from "@/lib/utils";

type ManageEmployeeViewProps = {
  centers: Center[];
};

export function ManageEmployeeView({ centers }: ManageEmployeeViewProps) {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailToBlock, setEmailToBlock] = useState("");
  const [blocking, setBlocking] = useState(false);

  const centerNameById = useMemo(() => Object.fromEntries(centers.map((center) => [center.id, center.name])), [centers]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/employees", { cache: "no-store" });
    const payload = (await response.json()) as { employees?: EmployeeRecord[]; error?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to load employees");
      setEmployees([]);
      setLoading(false);
      return;
    }

    setEmployees(payload.employees ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void (async () => {
      await fetchEmployees();
    })();
  }, [fetchEmployees]);

  async function handleBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBlocking(true);
    setError(null);

    const response = await fetch("/api/block-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailToBlock }),
    });

    const payload = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to block employee");
      setBlocking(false);
      return;
    }

    setEmailToBlock("");
    setBlocking(false);
    await fetchEmployees();
  }

  return (
    <div className="space-y-6">
      <RegisterPersonForm centers={centers} onSuccess={fetchEmployees} />

      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Employee Directory</h2>
            <p className="text-sm text-slate-600">All registered employees and their current status.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void fetchEmployees()} loading={loading}>
            Refresh
          </Button>
        </div>

        <div className="overflow-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-left">
                {[
                  "Name",
                  "Email",
                  "Role",
                  "CNIC",
                  "Phone",
                  "Center",
                  "Joined At",
                  "Blocked",
                  "Last Sign In",
                  "Blocked At",
                ].map((head) => (
                  <th key={head} className="border border-slate-200 px-2 py-2">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="border border-slate-200 px-2 py-4 text-slate-600" colSpan={10}>
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length ? (
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <td className="border border-slate-200 px-2 py-2">{employee.name ?? "-"}</td>
                    <td className="border border-slate-200 px-2 py-2">{employee.email}</td>
                    <td className="border border-slate-200 px-2 py-2">{employee.role}</td>
                    <td className="border border-slate-200 px-2 py-2">{employee.cnic ?? "-"}</td>
                    <td className="border border-slate-200 px-2 py-2">{employee.phone ?? "-"}</td>
                    <td className="border border-slate-200 px-2 py-2">{centerNameById[employee.center_id ?? ""] ?? "-"}</td>
                    <td className="border border-slate-200 px-2 py-2">{employee.created_at ? formatDateTime(employee.created_at) : "-"}</td>
                    <td className="border border-slate-200 px-2 py-2">
                      <span className={employee.blocked ? "font-semibold text-red-600" : "font-semibold text-green-700"}>
                        {employee.blocked ? "Blocked" : "Active"}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-2 py-2">{employee.last_sign_in_at ? formatDateTime(employee.last_sign_in_at) : "-"}</td>
                    <td className="border border-slate-200 px-2 py-2">{employee.blocked_at ? formatDateTime(employee.blocked_at) : "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border border-slate-200 px-2 py-4 text-slate-600" colSpan={10}>
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-xl font-bold text-slate-900">Block A Employee</h2>
        <form onSubmit={handleBlock} className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-slate-700">Employee Email</label>
            <Input type="email" required value={emailToBlock} onChange={(event) => setEmailToBlock(event.target.value)} placeholder="employee@example.com" />
          </div>
          <Button type="submit" variant="danger" loading={blocking}>
            Block Employee
          </Button>
        </form>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Card>
    </div>
  );
}