'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'

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

type TranslationMode = 'original' | 'ru' | 'es'

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

  const [translationMode, setTranslationMode] = useState<TranslationMode>('original')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')

  const [translatedCards, setTranslatedCards] = useState<Record<string, InsightItem>>({})

  const touchStartXRef = useRef<number | null>(null)
  const touchDeltaXRef = useRef(0)

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
      setTranslationMode('original')
      setTranslationLoading(false)
      setTranslationError('')
      setTranslatedCards({})

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

  const currentCardKey = useMemo(() => {
    if (!currentInsight) return ''
    return `${currentIndex}:${currentInsight.title}:${currentInsight.text}`
  }, [currentIndex, currentInsight])

  async function translateCard(targetLanguage: 'ru' | 'es', card: InsightItem, cardKey: string) {
    const existingTranslation = translatedCards[`${targetLanguage}:${cardKey}`]

    if (existingTranslation) {
      return existingTranslation
    }

    const res = await fetch('/api/translate-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: card.title,
        text: card.text,
        targetLanguage,
      }),
    })

    const data: TranslateCardApiResponse = await res.json()

    if (!res.ok || !data.card) {
      throw new Error(data.error || 'Translation failed.')
    }

    setTranslatedCards((prev) => ({
      ...prev,
      [`${targetLanguage}:${cardKey}`]: data.card as InsightItem,
    }))

    return data.card
  }

  async function ensureCurrentCardTranslated(targetLanguage: 'ru' | 'es') {
    if (!currentInsight || !currentCardKey) return

    setTranslationLoading(true)
    setTranslationError('')

    try {
      await translateCard(targetLanguage, currentInsight, currentCardKey)
      setTranslationMode(targetLanguage)
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
    } finally {
      setTranslationLoading(false)
    }
  }

  async function handleTranslateToRussian() {
    await ensureCurrentCardTranslated('ru')
  }

  async function handleTranslateToSpanish() {
    await ensureCurrentCardTranslated('es')
  }

  function handleShowOriginal() {
    setTranslationMode('original')
    setTranslationError('')
  }

  async function goToIndex(nextIndex: number) {
    if (insights.length === 0) return

    setCurrentIndex(nextIndex)
    setTranslationError('')

    if (translationMode === 'original') {
      return
    }

    const nextInsight = insights[nextIndex]
    if (!nextInsight) return

    const nextCardKey = `${nextIndex}:${nextInsight.title}:${nextInsight.text}`
    const existingTranslation = translatedCards[`${translationMode}:${nextCardKey}`]

    if (existingTranslation) {
      return
    }

    setTranslationLoading(true)

    try {
      await translateCard(translationMode, nextInsight, nextCardKey)
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : 'Translation failed.')
    } finally {
      setTranslationLoading(false)
    }
  }

  async function handleNext() {
    if (insights.length === 0) return
    const nextIndex = (currentIndex + 1) % insights.length
    await goToIndex(nextIndex)
  }

  async function handlePrev() {
    if (insights.length === 0) return
    const prevIndex = (currentIndex - 1 + insights.length) % insights.length
    await goToIndex(prevIndex)
  }

  function handleGenerate() {
    setSubmittedFocusWord(focusWord.trim())
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null
    touchDeltaXRef.current = 0
  }

  function handleTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartXRef.current === null) return
    const currentX = e.touches[0]?.clientX ?? touchStartXRef.current
    touchDeltaXRef.current = currentX - touchStartXRef.current
  }

  async function handleTouchEnd() {
    const threshold = 50
    const deltaX = touchDeltaXRef.current

    touchStartXRef.current = null
    touchDeltaXRef.current = 0

    if (Math.abs(deltaX) < threshold) return

    if (deltaX < 0) {
      await handleNext()
    } else {
      await handlePrev()
    }
  }

  const displayedCard = useMemo(() => {
    if (!currentInsight || !currentCardKey) return null

    if (translationMode === 'original') {
      return currentInsight
    }

    return translatedCards[`${translationMode}:${currentCardKey}`] || currentInsight
  }, [currentInsight, currentCardKey, translatedCards, translationMode])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-neutral-900">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <Link
          href={`/bible/${book}/${chapter}`}
          className="mb-6 text-sm text-neutral-500 transition hover:text-neutral-700"
        >
          ← Back
        </Link>

        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-stone-900">
          {book
            ? `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}`
            : 'Loading...'}
        </h1>

        <div className="mb-4 rounded-[28px] border border-stone-200/80 bg-[#fbf6ea] p-5 shadow-[0_8px_24px_rgba(90,72,41,0.08)] backdrop-blur-sm">
          <label
            htmlFor="focusWord"
            className="mb-2 block text-sm font-medium text-stone-700"
          >
            What word or phrase would you like to focus on?
          </label>

          <input
            id="focusWord"
            type="text"
            value={focusWord}
            onChange={(e) => setFocusWord(e.target.value)}
            placeholder="Optional: e.g. know, truth, eternal life"
            className="w-full rounded-2xl border border-stone-300/80 bg-[#fffdf7] px-4 py-3 text-base text-stone-900 shadow-inner outline-none placeholder:text-stone-400"
          />

          <button
            type="button"
            onClick={handleGenerate}
            className="mt-3 w-full rounded-2xl bg-stone-900 px-4 py-3 text-base font-medium text-stone-50 shadow-[0_10px_20px_rgba(28,25,23,0.18)] transition hover:bg-stone-800"
          >
            Generate insights
          </button>

          {submittedFocusWord && (
            <p className="mt-3 text-sm text-stone-500">
              Focus: “{submittedFocusWord}”
            </p>
          )}
        </div>

        {!loading && insights.length > 0 && (
          <p className="mb-4 text-sm font-medium text-stone-500">
            {currentIndex + 1} / {insights.length}
          </p>
        )}

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="rounded-[30px] border border-stone-200/80 bg-[#f7f0e1] p-5 shadow-[0_14px_36px_rgba(95,74,40,0.10)]"
        >
          {loading ? (
            <div>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-stone-900">
                Loading insight...
              </h2>
              <p className="text-[17px] leading-8 text-stone-700">
                Please wait while the insight cards are generated.
              </p>
            </div>
          ) : error ? (
            <div>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-stone-900">
                Unable to load
              </h2>
              <p className="mb-4 text-[17px] leading-8 text-stone-700">{error}</p>

              {rawOutput && (
                <div className="rounded-2xl border border-stone-200 bg-[#fffaf0] p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                    Raw model output
                  </p>
                  <pre className="whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                    {rawOutput}
                  </pre>
                </div>
              )}
            </div>
          ) : displayedCard ? (
            <div>
              <h2 className="mb-4 text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
                {displayedCard.title}
              </h2>

              <p className="whitespace-pre-line text-[1.12rem] leading-9 text-stone-800">
                {displayedCard.text}
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleTranslateToRussian}
                  disabled={translationLoading}
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc] disabled:opacity-50"
                >
                  {translationLoading && translationMode === 'ru'
                    ? 'Translating...'
                    : 'Russian'}
                </button>

                <button
                  type="button"
                  onClick={handleTranslateToSpanish}
                  disabled={translationLoading}
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc] disabled:opacity-50"
                >
                  {translationLoading && translationMode === 'es'
                    ? 'Translating...'
                    : 'Spanish'}
                </button>

                <button
                  type="button"
                  onClick={handleShowOriginal}
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Original
                </button>
              </div>

              {(translationMode === 'ru' || translationMode === 'es') && (
                <p className="mt-4 text-sm text-stone-500">
                  {translationMode === 'ru'
                    ? 'Showing Russian translation'
                    : 'Showing Spanish translation'}
                </p>
              )}

              {translationError && (
                <p className="mt-3 text-sm text-red-700">{translationError}</p>
              )}
            </div>
          ) : (
            <div>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-stone-900">
                No insight
              </h2>
              <p className="text-[17px] leading-8 text-stone-700">
                No insight is available for this verse yet.
              </p>
            </div>
          )}
        </div>

        {!loading && insights.length > 1 && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handlePrev}
              className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-base font-medium text-stone-800 shadow-[0_8px_18px_rgba(28,25,23,0.08)] transition hover:bg-[#f8efdc]"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="rounded-[24px] bg-stone-900 px-4 py-4 text-base font-medium text-stone-50 shadow-[0_12px_24px_rgba(28,25,23,0.18)] transition hover:bg-stone-800"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
