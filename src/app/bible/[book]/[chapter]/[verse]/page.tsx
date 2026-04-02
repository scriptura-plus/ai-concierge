'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'

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
  verseText?: string
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

type AppLanguage = 'en' | 'ru' | 'es'

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [focusWord, setFocusWord] = useState('')
  const [submittedFocusWord, setSubmittedFocusWord] = useState('')

  const [verseText, setVerseText] = useState('')
  const [translatedVerseTexts, setTranslatedVerseTexts] = useState<Record<string, string>>({})

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

  const [appLanguage, setAppLanguage] = useState<AppLanguage>('en')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')

  const [translatedCards, setTranslatedCards] = useState<Record<string, InsightItem>>({})

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [shareStatus, setShareStatus] = useState('')

  const copyTimerRef = useRef<number | null>(null)
  const exportCardRef = useRef<HTMLDivElement | null>(null)

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
    return () => {
      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!book || !chapter || !verse) return

    async function loadInsights() {
      setLoading(true)
      setError('')
      setRawOutput('')
      setVerseText('')
      setInsights([])
      setCurrentIndex(0)
      
      setTranslationLoading(false)
      setTranslationError('')
      setTranslatedCards({})
      setTranslatedVerseTexts({})
      setCopyStatus('idle')
      setShareStatus('')

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

        setVerseText(data.verseText || '')

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

  const verseTranslationKey = useMemo(() => {
    if (!verseText) return ''
    return `${book}:${chapter}:${verse}:${verseText}`
  }, [book, chapter, verse, verseText])

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

  async function translateVerseText(targetLanguage: 'ru' | 'es', text: string, key: string) {
    const existing = translatedVerseTexts[`${targetLanguage}:${key}`]
    if (existing) return existing

    const res = await fetch('/api/translate-card', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Verse text',
        text,
        targetLanguage,
      }),
    })

    const data: TranslateCardApiResponse = await res.json()
    const translatedText = data?.card?.text?.trim()

    if (!res.ok || !translatedText) {
      throw new Error(data.error || 'Verse translation failed.')
    }

    setTranslatedVerseTexts((prev) => ({
      ...prev,
      [`${targetLanguage}:${key}`]: translatedText,
    }))

    return translatedText
  }

  async function ensureCurrentCardTranslated(targetLanguage: 'ru' | 'es') {
    if (!currentInsight || !currentCardKey) return

    setTranslationLoading(true)
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')

    try {
      await Promise.all([
        translateCard(targetLanguage, currentInsight, currentCardKey),
        verseText && verseTranslationKey
          ? translateVerseText(targetLanguage, verseText, verseTranslationKey)
          : Promise.resolve(),
      ])

      setAppLanguage(targetLanguage)
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
    setAppLanguage('en')
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
  }

  async function goToIndex(nextIndex: number) {
  if (insights.length === 0) return

  setCurrentIndex(nextIndex)
  setTranslationError('')
  setCopyStatus('idle')
  setShareStatus('')

  if (appLanguage === 'en') {
    return
  }

  const nextInsight = insights[nextIndex]
  if (!nextInsight) return

  const nextCardKey = `${nextIndex}:${nextInsight.title}:${nextInsight.text}`
  const tasks: Promise<unknown>[] = []

  if (!translatedCards[`${appLanguage}:${nextCardKey}`]) {
    tasks.push(translateCard(appLanguage, nextInsight, nextCardKey))
  }

  if (
    verseText &&
    verseTranslationKey &&
    !translatedVerseTexts[`${appLanguage}:${verseTranslationKey}`]
  ) {
    tasks.push(translateVerseText(appLanguage, verseText, verseTranslationKey))
  }

  if (tasks.length === 0) return

  setTranslationLoading(true)

  try {
    await Promise.all(tasks)
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

  if (appLanguage === 'en') {
    return currentInsight
  }

  return translatedCards[`${appLanguage}:${currentCardKey}`] || currentInsight
}, [currentInsight, currentCardKey, translatedCards, appLanguage])

const displayedVerseText = useMemo(() => {
  if (appLanguage === 'en') return verseText
  if (!verseTranslationKey) return verseText
  return translatedVerseTexts[`${appLanguage}:${verseTranslationKey}`] || verseText
}, [appLanguage, verseText, verseTranslationKey, translatedVerseTexts])

const formattedReference = useMemo(() => {
  if (!book || !chapter || !verse) return ''
  return `${book.charAt(0).toUpperCase() + book.slice(1)} ${chapter}:${verse}`
}, [book, chapter, verse])

const shareText = useMemo(() => {
  if (!displayedCard || !formattedReference) return ''

  const verseBlock = displayedVerseText ? `${displayedVerseText}\n\n` : ''
  return `${formattedReference}\n\n${verseBlock}${displayedCard.title}\n\n${displayedCard.text}`
}, [displayedCard, formattedReference, displayedVerseText])

async function handleCopy() {
  if (!shareText) return

  try {
    await navigator.clipboard.writeText(shareText)
    setCopyStatus('copied')
    setShareStatus('')

    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current)
    }

    copyTimerRef.current = window.setTimeout(() => {
      setCopyStatus('idle')
    }, 1600)
  } catch {
    setCopyStatus('failed')
  }
}

  async function handleShare() {
    if (!displayedCard || !formattedReference) return

    setShareStatus('')

    try {
      if (exportCardRef.current) {
        const dataUrl = await toPng(exportCardRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#f2e7cf',
        })

        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], `${formattedReference}.png`, {
          type: 'image/png',
        })

        if (
          navigator.share &&
          'canShare' in navigator &&
          navigator.canShare &&
          navigator.canShare({ files: [file] })
        ) {
          await navigator.share({ files: [file] })
          setShareStatus('Shared as image')
          setCopyStatus('idle')
          return
        }
      }

      if (navigator.share) {
        await navigator.share({ text: shareText })
        setShareStatus('Shared as text')
        setCopyStatus('idle')
      } else {
        await navigator.clipboard.writeText(shareText)
        setShareStatus('Share unavailable — copied instead')
        setCopyStatus('idle')
      }
    } catch {
      setShareStatus('')
    }
  }

  const copyButtonClass =
    copyStatus === 'copied'
      ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
      : copyStatus === 'failed'
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
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
        {formattedReference || 'Loading...'}
      </h1>
<<div className="mb-4 flex flex-wrap gap-2">
  <button
    type="button"
    onClick={handleShowOriginal}
    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
      appLanguage === 'en'
        ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
    }`}
  >
    English
  </button>

  <button
    type="button"
    onClick={handleTranslateToRussian}
    disabled={translationLoading}
    className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
      appLanguage === 'ru'
        ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
    }`}
  >
    {translationLoading && appLanguage === 'ru' ? 'Translating...' : 'Russian'}
  </button>

  <button
    type="button"
    onClick={handleTranslateToSpanish}
    disabled={translationLoading}
    className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
      appLanguage === 'es'
        ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
    }`}
  >
    {translationLoading && appLanguage === 'es' ? 'Translating...' : 'Spanish'}
  </button>
</div>
  <div className="mb-5 rounded-[28px] border border-stone-200/80 bg-[#fbf6ea] p-5 shadow-[0_8px_24px_rgba(90,72,41,0.08)] backdrop-blur-sm">
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
          className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]"
        >
          {loading ? (
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                Loading insight
              </p>
              <p className="text-[1.08rem] leading-9 text-stone-800">
                Please wait while the insight cards are generated.
              </p>
            </div>
          ) : error ? (
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                Unable to load
              </p>
              <p className="mb-4 text-[1.08rem] leading-9 text-stone-800">{error}</p>

              {rawOutput && (
                <div className="rounded-2xl border border-stone-300/50 bg-[#fffaf0] p-3">
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
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                {formattedReference}
              </p>

              {displayedVerseText && (
                <div className="mb-6 rounded-[22px] border border-stone-300/60 bg-[#fbf6ea]/70 px-5 py-4">
                  <p className="text-[1rem] leading-8 text-stone-700 italic">
                    {displayedVerseText}
                  </p>
                </div>
              )}

              <h2 className="mb-5 text-center text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
                {displayedCard.title}
              </h2>

              <p className="text-[1.08rem] leading-9 text-stone-800">
                {displayedCard.text}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
  <button
    type="button"
    onClick={handleCopy}
    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${copyButtonClass}`}
  >
    {copyStatus === 'copied'
      ? 'Copied'
      : copyStatus === 'failed'
        ? 'Copy failed'
        : 'Copy'}
  </button>

  <button
    type="button"
    onClick={handleShare}
    className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
  >
    Share
  </button>
</div>

              {shareStatus && (
                <p className="mt-3 text-center text-sm text-stone-500">{shareStatus}</p>
              )}

              {translationError && (
                <p className="mt-3 text-center text-sm text-red-700">{translationError}</p>
              )}
            </div>
          ) : (
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                No insight
              </p>
              <p className="text-[1.08rem] leading-9 text-stone-800">
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

      {displayedCard && (
        <div className="pointer-events-none fixed -left-[9999px] top-0 z-[-1]">
          <div
            ref={exportCardRef}
            style={{
              width: 1080,
              background: 'linear-gradient(180deg, #f6ecd6 0%, #efe2bf 100%)',
              padding: '48px',
              borderRadius: '44px',
              color: '#1c1917',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                borderRadius: '34px',
                border: '1px solid rgba(120, 97, 61, 0.14)',
                background: 'radial-gradient(circle at top, #fbf5e8 0%, #f2e7cf 55%, #ead9b6 100%)',
                padding: '64px 72px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#78716c',
                  marginBottom: '34px',
                }}
              >
                {formattedReference}
              </div>

              {displayedVerseText ? (
                <div
                  style={{
                    marginBottom: '38px',
                    padding: '24px 28px',
                    borderRadius: '24px',
                    border: '1px solid rgba(120, 97, 61, 0.18)',
                    background: 'rgba(251, 246, 234, 0.72)',
                    fontSize: '30px',
                    lineHeight: 1.8,
                    color: '#44403c',
                    fontStyle: 'italic',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {displayedVerseText}
                </div>
              ) : null}

              <div
                style={{
                  textAlign: 'center',
                  fontSize: '68px',
                  lineHeight: 1.08,
                  fontWeight: 700,
                  letterSpacing: '-0.03em',
                  color: '#1c1917',
                  marginBottom: '42px',
                }}
              >
                {displayedCard.title}
              </div>

              <div
                style={{
                  fontSize: '42px',
                  lineHeight: 1.75,
                  color: '#292524',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {displayedCard.text}
              </div>

              <div
                style={{
                  marginTop: '44px',
                  textAlign: 'center',
                  fontSize: '24px',
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#78716c',
                }}
              >
                Scriptura+
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
