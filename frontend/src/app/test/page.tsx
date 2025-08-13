"use client";

import { useState } from "react";

export default function TestPage() {
  const [prompt, setPrompt] = useState("Say hello from Gemini");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    try {
      setLoading(true);
      setErr(null);
      setAnswer(null);

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, provider: "google" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Request failed");
      }
      setAnswer(data.answer);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Gemini API test</h1>

      <textarea
        className="w-full border rounded-lg p-3"
        rows={5}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your prompt..."
      />

      <button
        onClick={send}
        disabled={loading}
        className="rounded-xl px-4 py-2 border shadow-sm"
      >
        {loading ? "Asking..." : "Ask Gemini"}
      </button>

      {err && (
        <div className="text-red-600 whitespace-pre-wrap">
          Error: {err}
        </div>
      )}

      {answer && (
        <pre className="whitespace-pre-wrap bg-black/5 rounded-xl p-4">
          {answer}
        </pre>
      )}
    </main>
  );
}
