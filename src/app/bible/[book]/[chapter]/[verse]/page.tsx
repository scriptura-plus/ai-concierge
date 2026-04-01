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

type InsightsApiResponse = {
  reference?: string
  focusWord?: string
  count?: number
  insights?: InsightItem[]
  error?: string
  raw?: string
}

type TranslateCardApiResponse = {
  targetLanguage?: 'ru' | 'es'
  card?: InsightItem
  error?: string
  raw?: string
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [focusWord, setFocusWord] = useState('')
  const [submittedFocusWord, setSubmittedFocusWord] = useState('')

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

  const [translatedCard, setTranslatedCard] = useState<InsightItem | null>(null)
  const [translationMode, setTranslationMode] = useState<'original' | 'ru'>('original')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')

  useEffect(() => {
    async function loadInitial() {
      const resolved = await params
      setBook(resolved.book)
      setChapter(resolved.chapter)
      setVerse(resolved.verse)
    }

    loadInitial()
  }, [params])

  useEffect(() => {
    if (!book || !chapter || !verse) return

    async function loadInsights() {
      setLoading(true)
      setError('')
      setRawOutput('')
      setInsights([])
      setCurrentIndex(0)
      setTranslatedCard(null)
      setTranslationMode('original')
      setTranslationError('')

      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            book,
            chapter,
            verse,
            focusWord: submittedFocusWord,
            count: 12,
          }),
        })

        const data: InsightsApiResponse = await res.json()

        if (!res.ok) {
          setError(data.error || 'API request failed.')
          setRawOutput(data.raw || '')
          return
        }

        const receivedInsights = Array.isArray(data?.insights) ? data.insights : []

        if (receivedInsights.length > 0) {
          setInsights(receivedInsights)
        } else {
          setError(data.error || 'No insights returned.')
          setRawOutput(data.raw || '')
        }
      } catch {
        setError('Error loading insights.')
      } finally {
        setLoading(false)
      }
    }

    loadInsights()
  }, [book, chapter, verse, submittedFocusWord])

  const currentInsight = useMemo(() => {
    return insights[currentIndex]
  }, [insights, currentIndex])

  async function translateCurrentCardToRussian() {
    if (!currentInsight) return

    setTranslationLoading(true)
    setTranslationError('')

    try {
      const res = await fetch('/api/translate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentInsight.title,
          text: currentInsight.text,
          targetLanguage: 'ru',
        }),
      })

      const data: TranslateCardApiResponse = await res.json()

      if (!res.ok || !data.card) {
        setTranslationError(data.error || 'Translation failed.')
        return
      }

      setTranslatedCard(data.card)
      setTranslationMode('ru')
    } catch {
      setTranslationError('Translation failed.')
    } finally {
      setTranslationLoading(false)
    }
  }

  function handleShowOriginal() {
    setTranslationMode('original')
    setTranslationError('')
  }

  function handleNext() {
    if (insights.length === 0) return
    setCurrentIndex((prev) => (prev + 1) % insights.length)
    setTranslatedCard(null)
    setTranslationMode('original')
    setTranslationError('')
  }

  function handleGenerate() {
    setSubmittedFocusWord(focusWord.trim())
  }

  const displayedCard =
    translationMode === 'ru' && translatedCard ? translatedCard : currentInsight

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

        <div className="mb-4 rounded-2xl border border-neutral-200 p-4">
          <label
            htmlFor="focusWord"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            What word or phrase would you like to focus on?
          </label>

          <input
            id="focusWord"
            type="text"
            value={focusWord}
            onChange={(e) => setFocusWord(e.target.value)}
            placeholder="Optional: e.g. know, truth, eternal life"
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 text-base text-neutral-900 outline-none"
          />

          <button
            type="button"
            onClick={handleGenerate}
            className="mt-3 w-full rounded-xl bg-neutral-900 px-4 py-3 text-base font-medium text-white"
          >
            Generate insights
          </button>

          {submittedFocusWord && (
            <p className="mt-3 text-sm text-neutral-500">
              Focus: “{submittedFocusWord}”
            </p>
          )}
        </div>

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
              <p className="mb-4 text-base leading-7 text-neutral-800">{error}</p>

              {rawOutput && (
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Raw model output
                  </p>
                  <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-neutral-700">
                    {rawOutput}
                  </pre>
                </div>
              )}
            </div>
          ) : displayedCard ? (
            <div>
              <h2 className="mb-3 text-xl font-semibold text-neutral-900">
                {displayedCard.title}
              </h2>

              <p className="whitespace-pre-line text-base leading-7 text-neutral-800">
                {displayedCard.text}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={translateCurrentCardToRussian}
                  disabled={translationLoading}
                  className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 disabled:opacity-50"
                >
                  {translationLoading ? 'Translating...' : 'Translate to Russian'}
                </button>

                <button
                  type="button"
                  className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-400"
                >
                  Translate to Spanish
                </button>

                <button
                  type="button"
                  onClick={handleShowOriginal}
                  className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
                >
                  Show original
                </button>
              </div>

              {translationMode === 'ru' && (
                <p className="mt-3 text-sm text-neutral-500">
                  Showing Russian translation
                </p>
              )}

              {translationError && (
                <p className="mt-3 text-sm text-red-600">{translationError}</p>
              )}
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
