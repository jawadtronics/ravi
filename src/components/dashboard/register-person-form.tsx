"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Center } from "@/types/app";

interface RegisterPersonFormProps {
  centers: Center[];
}

const roleOptions = [
  { label: "Gate Person", value: "gate_person" },
  { label: "Weight Manager", value: "weight_manager" },
  { label: "Super Manager", value: "super_manager" },
  { label: "Founder", value: "founder" },
];

export function RegisterPersonForm({ centers }: RegisterPersonFormProps) {
  const [name, setName] = useState("");
  const [cnic, setCnic] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [centerId, setCenterId] = useState(centers[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("gate_person");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/register-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        cnic,
        email,
        password,
        center_id: centerId,
        address,
        phone,
        role,
      }),
    });

    const payload = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to register user");
      setLoading(false);
      return;
    }

    setMessage(payload.message ?? "User created successfully");
    setName("");
    setCnic("");
    setEmail("");
    setPassword("");
    setAddress("");
    setPhone("");
    setRole("gate_person");
    setCenterId(centers[0]?.id ?? "");
    setLoading(false);
  }

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold text-slate-900">Register New Person</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">CNIC</label>
          <Input required value={cnic} onChange={(e) => setCnic(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Center</label>
          <select
            required
            value={centerId}
            onChange={(e) => setCenterId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {centers.map((center) => (
              <option key={center.id} value={center.id}>
                {center.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="md:col-span-2 text-sm text-green-700">{message}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" loading={loading}>Create User</Button>
        </div>
      </form>
    </Card>
  );
}
