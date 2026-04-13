"use client";

import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  bucket: string;
  folder: string;
  label: string;
  accept?: string;
  onUploaded: (publicUrl: string) => void;
}

export function FileUpload({ bucket, folder, label, accept, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", bucket);
    formData.append("folder", folder);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json()) as { error?: string; url?: string };

    if (!response.ok || !payload.url) {
      setError(payload.error ?? "Upload failed");
      setUploading(false);
      return;
    }

    setUploadedUrl(payload.url);
    onUploaded(payload.url);
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type="file" accept={accept} onChange={handleChange} className="block w-full text-sm text-slate-700" />
      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" disabled>
          {uploading ? "Uploading..." : uploadedUrl ? "Uploaded" : "Awaiting file"}
        </Button>
        {uploadedUrl ? <a className="text-xs text-amber-700 underline" href={uploadedUrl} target="_blank">Preview</a> : null}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
