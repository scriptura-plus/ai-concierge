'use client';

import { useState } from 'react';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  // Используем ID нашего тестового клиента
  const tenantId = '9dc365fe-0b37-4873-903a-a646bef78db7';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnswer('');
    setLoading(true);

    try {
      // ИСПРАВЛЕНИЕ: Указываем правильный маршрут /api/ask
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: question,
          tenantId: tenantId 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Network response was not ok');
      }
      setAnswer(data.answer);

    } catch (error: any) {
      console.error('There was a problem with the fetch operation:', error);
      setAnswer('Sorry, something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">AI Concierge</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask me anything about our documents..."
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 text-black focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full p-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            disabled={loading || !question}
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </form>
        {answer && (
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-black">
            <h2 className="font-bold">Answer:</h2>
            <p>{answer}</p>
          </div>
        )}
      </div>
    </main>
  );
}