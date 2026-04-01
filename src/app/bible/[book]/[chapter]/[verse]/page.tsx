'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type PageProps = {
  params: Promise<{
    book: string
    chapter: string
    verse: string
  }>
}

type InsightItem = {
  title: string
  text: string
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      setInsights([])
      setCurrentIndex(0)

      const resolved = await params
      setBook(resolved.book)
      setChapter(resolved.chapter)
      setVerse(resolved.verse)

      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book: resolved.book,
            chapter: resolved.chapter,
            verse: resolved.verse,
            count: 12,
          }),
        })

        const data = await res.json()
        const receivedInsights = Array.isArray(data?.insights) ? data.insights : []

        if (receivedInsights.length > 0) {
          setInsights(receivedInsights)
        } else {
          setError('No insights returned.')
        }
      } catch {
        setError('Error loading insights.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params])

  const currentInsight = useMemo(() => {
    return insights[currentIndex]
  }, [insights, currentIndex])

  function handleNext() {
    if (insights.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % insights.length)
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/bible/${book}/${chapter}`}
          className="mb-6 text-sm text-neutral-500"
        >
          ← Back
        </Link>

        <h1 className="mb-2 text-3xl font-semibold text-neutral-900">
          {book
            ? `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}`
            : 'Loading...'}
        </h1>

        {!loading && insights.length > 0 && (
          <p className="mb-4 text-sm text-neutral-500">
            {currentIndex + 1} / {insights.length}
          </p>
        )}

        <div className="rounded-2xl border border-neutral-200 p-4">
          {loading ? (
            <div>
              <h2 className="mb-3 text-xl font-semibold text-neutral-900">
                Loading insight...
              </h2>
              <p className="text-base leading-7 text-neutral-800">
                Please wait while the insight cards are generated.
              </p>
            </div>
          ) : error ? (
            <div>
              <h2 className="mb-3 text-xl font-semibold text-neutral-900">
                Unable to load
              </h2>
              <p className="text-base leading-7 text-neutral-800">{error}</p>
            </div>
          ) : currentInsight ? (
            <div>
              <h2 className="mb-3 text-xl font-semibold text-neutral-900">
                {currentInsight.title}
              </h2>

              <p className="whitespace-pre-line text-base leading-7 text-neutral-800">
                {currentInsight.text}
              </p>
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-xl font-semibold text-neutral-900">
                No insight
              </h2>
              <p className="text-base leading-7 text-neutral-800">
                No insight is available for this verse yet.
              </p>
            </div>
          )}
        </div>

        {!loading && insights.length > 1 && (
          <button
            type="button"
            onClick={handleNext}
            className="mt-4 rounded-2xl bg-neutral-900 px-4 py-3 text-base font-medium text-white"
          >
            Next
          </button>
        )}
      </div>
    </main>
  )
}
