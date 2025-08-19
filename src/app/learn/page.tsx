"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";

const DEFAULT_TENANT = "9dc365fe-0b37-4873-903a-a646bef78db7";

export default function LearnPage() {
  const [url, setUrl] = useState("");
  const [tenantId, setTenantId] = useState(DEFAULT_TENANT);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [workerRes, setWorkerRes] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onChangeUrl = (e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value);
  const onChangeTenant = (e: ChangeEvent<HTMLInputElement>) => setTenantId(e.target.value);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setWorkerRes(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tenantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Request failed");
      setResult(data); // ok, jobId, status, deduped...
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runWorker = async () => {
    setError(null);
    setWorkerRes(null);
    try {
      const res = await fetch("/api/worker", { method: "GET" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Worker failed");
      setWorkerRes(data); // processed true/false ...
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-start p-6 bg-gray-50">
      <div className="w-full max-w-2xl bg-white p-6 rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4 text-gray-900">Learn from URL (Queued)</h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="url"
            placeholder="https://example.com/article"
            value={url}
            onChange={onChangeUrl}
            className="w-full p-3 border rounded-lg text-black"
            required
          />
          <input
            type="text"
            placeholder="Tenant ID"
            value={tenantId}
            onChange={onChangeTenant}
            className="w-full p-3 border rounded-lg text-black"
            required
          />
          <button
            type="submit"
            disabled={loading || !url || !tenantId}
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold disabled:bg-gray-400"
          >
            {loading ? "Queuing..." : "Queue ingest job"}
          </button>
        </form>

        <div className="mt-4 flex gap-2">
          <button
            onClick={runWorker}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium"
          >
            Run worker now
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg">
            <div className="font-semibold">Error</div>
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </div>
        )}

        {result && (
          <div className="mt-4 p-3 bg-gray-100 text-black rounded-lg">
            <div className="font-semibold">Ingest response</div>
            <pre className="text-sm overflow-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}

        {workerRes && (
          <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-lg">
            <div className="font-semibold">Worker response</div>
            <pre className="text-sm overflow-auto">{JSON.stringify(workerRes, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
