"use client";
import { useState } from "react";
export default function QA() {
  const [blobUrl, setBlobUrl] = useState("");
  const [q, setQ] = useState("Коротко перескажи документ");
  const [a, setA] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  async function ask() {
    setLoading(true); setErr(null); setA(null);
    const res = await fetch("/api/ask-file", { method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ question: q, blobUrl }) });
    const data = await res.json();
    if (!res.ok) setErr(data.error || "failed"); else setA(data.answer);
    setLoading(false);
  }
  return (
    <main className="min-h-dvh mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">QA over uploaded file</h1>
      <div className="space-y-2">
        <label className="text-sm">Blob URL (из /upload):</label>
        <input className="w-full border rounded-lg p-2" value={blobUrl}
               onChange={e=>setBlobUrl(e.target.value)} placeholder="https://blob.vercel-storage.com/..." />
      </div>
      <textarea className="w-full border rounded-lg p-3" rows={4} value={q} onChange={e=>setQ(e.target.value)} />
      <button onClick={ask} disabled={loading || !blobUrl} className="rounded-xl px-4 py-2 border shadow-sm">
        {loading ? "Asking..." : "Ask"}
      </button>
      {err && <div className="text-red-600 whitespace-pre-wrap">Error: {err}</div>}
      {a && <pre className="whitespace-pre-wrap bg-black/5 rounded-xl p-4">{a}</pre>}
    </main>
  );
}
