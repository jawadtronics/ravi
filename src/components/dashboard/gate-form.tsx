"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/dashboard/file-upload";

interface GateFormProps {
  gatePersonId: string;
  centerId: string | null;
}

export function GateForm({ gatePersonId, centerId }: GateFormProps) {
  const supabase = createClient();

  const [driverName, setDriverName] = useState("");
  const [cnic, setCnic] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [carPlate, setCarPlate] = useState("");
  const [expectedBags, setExpectedBags] = useState("");
  const [carImageUrl, setCarImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!carImageUrl) {
      setError("Car image upload is required.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("wheat_logs").insert({
      center_id: centerId,
      gate_person_id: gatePersonId,
      driver_name: driverName,
      cnic,
      phone,
      address,
      car_plate: carPlate,
      car_image_url: carImageUrl,
      expected_bags: Number(expectedBags),
      status: "pending",
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setDriverName("");
    setCnic("");
    setPhone("");
    setAddress("");
    setCarPlate("");
    setExpectedBags("");
    setCarImageUrl(null);
    setMessage("Vehicle log submitted successfully.");
    setSubmitting(false);
  }

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold text-slate-900">Incoming Vehicle Registration</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Driver Name</label>
          <Input required value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">CNIC</label>
          <Input required value={cnic} onChange={(e) => setCnic(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Car Number Plate</label>
          <Input required value={carPlate} onChange={(e) => setCarPlate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Expected Wheat Bags</label>
          <Input
            required
            type="number"
            min={1}
            value={expectedBags}
            onChange={(e) => setExpectedBags(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <FileUpload
            bucket="wheat-images"
            folder="car"
            label="Car Image"
            accept="image/*"
            onUploaded={setCarImageUrl}
          />
        </div>

        {error ? <p className="md:col-span-2 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="md:col-span-2 text-sm text-green-700">{message}</p> : null}

        <div className="md:col-span-2">
          <Button type="submit" loading={submitting}>
            Submit
          </Button>
        </div>
      </form>
    </Card>
  );
}
