'use client';

import { useState } from 'react';

export default function LearnPage() {
  const [url, setUrl] = useState('https://ru.wikipedia.org/wiki/Солнечная_система');
  const [ingestResponse, setIngestResponse] = useState('');
  const [workerResponse, setWorkerResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(false);

  const tenantId = '9dc365fe-0b37-4873-903a-a646bef78db7';

  const handleIngest = async () => {
    setIngestResponse('');
    setWorkerResponse('');
    setLoading(true);
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url, tenantId: tenantId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');
      setIngestResponse(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setIngestResponse(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRunWorker = async () => {
    setWorkerResponse('');
    setWorkerLoading(true);
    try {
      // Мы используем GET, так как наш воркер настроен на GET
      const response = await fetch('/api/worker'); 
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Something went wrong');
      setWorkerResponse(JSON.stringify(data, null, 2));
    } catch (error: any) {
      setWorkerResponse(`Error: ${error.message}`);
    } finally {
      setWorkerLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex-col items-center justify-center p-24 bg-gray-100">
      <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md space-y-4">
        <h1 className="text-2xl font-bold">Learn from URL (Queued)</h1>
        <div className="space-y-2">
          <label>URL to Learn:</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full p-2 border rounded text-black"
          />
          <button
            onClick={handleIngest}
            className="w-full p-2 bg-blue-600 text-white rounded"
            disabled={loading || !url}
          >
            {loading ? 'Queuing...' : '1. Queue Ingest Job'}
          </button>
        </div>
        {ingestResponse && (
          <div>
            <h3 className="font-bold">Ingest Response:</h3>
            <pre className="text-sm bg-gray-50 text-black p-2 rounded whitespace-pre-wrap">{ingestResponse}</pre>
          </div>
        )}
        <div className="space-y-2">
          <button
            onClick={handleRunWorker}
            className="w-full p-2 bg-green-600 text-white rounded"
            disabled={workerLoading}
          >
            {workerLoading ? 'Running...' : '2. Run Worker Now'}
          </button>
        </div>
        {workerResponse && (
           <div>
            <h3 className="font-bold">Worker Response:</h3>
            <pre className="text-sm bg-gray-50 text-black p-2 rounded whitespace-pre-wrap">{workerResponse}</pre>
          </div>
        )}
      </div>
    </main>
  );
}
