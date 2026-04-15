"use client";

import { ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  bucket: string;
  folder: string;
  label: string;
  accept?: string;
  value?: string | null;
  allowReplace?: boolean;
  onUploaded: (publicUrl: string) => void;
  onRemoved?: () => void;
}

export function FileUpload({ bucket, folder, label, accept, value, allowReplace = false, onUploaded, onRemoved }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
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

    const payload = (await response.json()) as { error?: string; url?: string; path?: string };

    if (!response.ok || !payload.url) {
      setError(payload.error ?? "Upload failed");
      setUploading(false);
      return;
    }

    setUploadedPath(payload.path ?? null);
    onUploaded(payload.url);
    setUploading(false);
    setInputKey((current) => current + 1);
  }

  async function handleRemove() {
    if (uploadedPath) {
      await fetch("/api/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, path: uploadedPath }),
      });
    }

    setUploadedPath(null);
    onRemoved?.();
    setInputKey((current) => current + 1);
  }

  async function handleReupload() {
    await handleRemove();
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {value && !allowReplace ? (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="secondary" disabled>
              Uploaded
            </Button>
            <a className="text-xs text-amber-700 underline" href={value} target="_blank" rel="noreferrer">
              Preview
            </a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="max-h-40 rounded-md object-cover" />
        </div>
      ) : (
        <input key={inputKey} type="file" accept={accept} onChange={handleChange} className="block w-full text-sm text-slate-700" />
      )}
      {value && allowReplace ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleReupload()}>
            Reupload
          </Button>
          <Button type="button" variant="danger" onClick={handleRemove}>
            Delete Image
          </Button>
          <a className="text-xs text-amber-700 underline" href={value} target="_blank" rel="noreferrer">
            Preview
          </a>
        </div>
      ) : null}
      {uploading ? <p className="text-xs text-slate-600">Uploading...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
