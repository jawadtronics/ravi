"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface GateFormProps {
  gatePersonId: string;
  centerId: string | null;
}

export function GateForm({ gatePersonId, centerId }: GateFormProps) {
  const supabase = createClient();

  const [farmerName, setFarmerName] = useState("");
  const [farmerCnic, setFarmerCnic] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehiclePhone, setVehiclePhone] = useState("");
  const [expectedBags, setExpectedBags] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    setSubmitting(true);

    const { error: insertError } = await supabase.from("wheat_logs").insert({
      center_id: centerId,
      gate_person_id: gatePersonId,
      farmer_name: farmerName,
      farmer_cnic: farmerCnic,
      driver_name: driverName,
      driver_phone: driverPhone,
      vehicle_phone: vehiclePhone,
      cnic: farmerCnic,
      phone: driverPhone,
      car_plate: vehiclePhone,
      remarks: remarks,
      expected_bags: Number(expectedBags),
      status: "pending",
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setFarmerName("");
    setFarmerCnic("");
    setDriverName("");
    setDriverPhone("");
    setVehiclePhone("");
    setExpectedBags("");
    setRemarks("");
    setMessage("Vehicle log submitted successfully.");
    setSubmitting(false);
  }

  return (
    <Card>
      <h2 className="mb-4 text-xl font-bold text-slate-900">Incoming Vehicle Registration</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Farmer Name</label>
          <Input required value={farmerName} onChange={(e) => setFarmerName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Farmer CNIC</label>
          <Input required value={farmerCnic} onChange={(e) => setFarmerCnic(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Driver Name</label>
          <Input required value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Driver Phone</label>
          <Input required value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Vehicle Number</label>
          <Input required value={vehiclePhone} onChange={(e) => setVehiclePhone(e.target.value)} />
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter any remarks or notes"
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
