'use client';

import { useState } from 'react';

export default function LearnPage() {
  const [url, setUrl] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Используем ID нашего тестового клиента
  const tenantId = '9dc365fe-0b37-4873-903a-a646bef78db7';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // ИСПРАВЛЕНИЕ: Вызываем правильный маршрут /api/learn-url
      const response = await fetch('/api/learn-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url, tenantId: tenantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage(`Success!\nDocument ID: ${data.documentId}\nChunks Stored: ${data.chunksStored}`);

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
      <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Learn from URL</h1>
        <p className="text-sm text-gray-500 mb-4">Using Tenant ID: {tenantId}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://wol.jw.org/ru/wol/d/r1/lp-e/1101989218"
            className="w-full p-2 border border-gray-300 rounded mb-4 text-black"
          />
          <button
            type="submit"
            className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={loading || !url}
          >
            {loading ? 'Learning...' : 'Learn'}
          </button>
        </form>
        {message && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <h3 className="font-bold">Result:</h3>
            <pre className="text-sm text-black whitespace-pre-wrap">{message}</pre>
          </div>
        )}
      </div>
    </main>
  );
}