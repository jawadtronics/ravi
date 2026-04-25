"use client";

import { FormEvent, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function OwnerRegisterMillView() {
  const [millName, setMillName] = useState("");
  const [centers, setCenters] = useState<string[]>([""]);
  const [founderEmail, setFounderEmail] = useState("");
  const [founderPassword, setFounderPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateCenter(index: number, value: string) {
    setCenters((current) => current.map((entry, idx) => (idx === index ? value : entry)));
  }

  function addCenter() {
    setCenters((current) => [...current, ""]);
  }

  function removeCenter(index: number) {
    setCenters((current) => current.filter((_, idx) => idx !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    const cleanedCenters = centers.map((entry) => entry.trim()).filter(Boolean);

    if (!cleanedCenters.length) {
      setError("At least one center name is required.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/register-mill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mill_name: millName,
        centers: cleanedCenters,
        founder_email: founderEmail,
        founder_password: founderPassword,
      }),
    });

    const payload = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setError(payload.error ?? "Unable to register mill");
      setLoading(false);
      return;
    }

    setMessage(payload.message ?? "Mill created successfully");
    setMillName("");
    setCenters([""]);
    setFounderEmail("");
    setFounderPassword("");
    setLoading(false);
  }

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold text-slate-900">Register New Mill</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name Of Mill</label>
          <Input required value={millName} onChange={(event) => setMillName(event.target.value)} placeholder="Enter mill name" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700">Add Centers</label>
          {centers.map((center, index) => (
            <div key={`center-${index}`} className="flex items-center gap-2">
              <Input
                required
                value={center}
                onChange={(event) => updateCenter(index, event.target.value)}
                placeholder={`Center ${index + 1} name`}
              />
              {centers.length > 1 ? (
                <Button type="button" variant="danger" onClick={() => removeCenter(index)}>
                  Remove
                </Button>
              ) : null}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addCenter}>
            + Add Center
          </Button>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Founder Email</label>
          <Input type="email" required value={founderEmail} onChange={(event) => setFounderEmail(event.target.value)} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Founder Password</label>
          <Input type="password" required minLength={6} value={founderPassword} onChange={(event) => setFounderPassword(event.target.value)} />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <Button type="submit" loading={loading}>
          Create Mill And Founder
        </Button>
      </form>
    </Card>
  );
}
