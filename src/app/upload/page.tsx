"use client";
import { useState } from "react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onUpload() {
    if (!file) return;
    setMsg("Uploading...");

    const response = await fetch(
      `/api/upload?filename=${file.name}`,
      {
        method: 'POST',
        body: file,
      }
    );

    const newBlob = await response.json();

    if (!response.ok) {
        setMsg(`Error: ${newBlob.error || "upload failed"}`);
    } else {
        setBlobUrl(newBlob.url);
        setMsg("Uploaded ✅");
    }
  }

  return (
    <main className="min-h-dvh mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Upload a TXT/MD file</h1>
      <input type="file" accept=".txt,.md,text/plain" onChange={(e)=>setFile(e.target.files?.[0] ?? null)} />
      <button onClick={onUpload} disabled={!file} className="rounded-xl px-4 py-2 border shadow-sm">Upload</button>
      {msg && <div>{msg}</div>}
      {blobUrl && <div className="text-sm break-all">Saved: <code>{blobUrl}</code></div>}
    </main>
  );
}
