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

type ArticlePayload = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type UnfoldApiResponse = {
  article?: ArticlePayload
  error?: string
  raw?: string
}

type AppLanguage = 'en' | 'ru' | 'es'
type ArticleJobStatus = 'idle' | 'generating' | 'ready' | 'failed'
type TopTab = 'insights' | 'compare' | 'context' | 'another-lens'
type LensKind = 'word' | 'tension' | 'phrase'

type ArticleJob = {
  status: ArticleJobStatus
  article?: ArticlePayload
  error?: string
  title: string
  reference: string
  verseText: string
  language: AppLanguage
  createdAt: number
}

const ARTICLE_STORAGE_KEY = 'scriptura_unfold_articles_v2'

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

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

  const [articleJobs, setArticleJobs] = useState<Record<string, ArticleJob>>({})
  const [activeArticleKey, setActiveArticleKey] = useState('')
  const [articleShareStatus, setArticleShareStatus] = useState('')
  const [articleCopyStatus, setArticleCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const [activeTab, setActiveTab] = useState<TopTab>('insights')
  const [lensSheetOpen, setLensSheetOpen] = useState(false)
  const [selectedLens, setSelectedLens] = useState<LensKind | null>(null)

  const copyTimerRef = useRef<number | null>(null)
  const exportCardRef = useRef<HTMLDivElement | null>(null)
  const articleTopRef = useRef<HTMLDivElement | null>(null)

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
    try {
      const raw = window.localStorage.getItem(ARTICLE_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, ArticleJob>
      if (parsed && typeof parsed === 'object') {
        setArticleJobs(parsed)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      const readyJobs = Object.fromEntries(
        Object.entries(articleJobs).filter(([, job]) => job.status === 'ready' && job.article)
      )
      window.localStorage.setItem(ARTICLE_STORAGE_KEY, JSON.stringify(readyJobs))
    } catch {
      // ignore
    }
  }, [articleJobs])

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
      setActiveArticleKey('')
      setArticleShareStatus('')
      setArticleCopyStatus('idle')
      setActiveTab('insights')
      setSelectedLens(null)
      setLensSheetOpen(false)

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
  }, [book, chapter, verse])

  useEffect(() => {
    if (activeArticleKey && articleTopRef.current) {
      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeArticleKey])

  const currentInsight = useMemo(() => insights[currentIndex], [insights, currentIndex])

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
    if (existingTranslation) return existingTranslation

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
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setActiveArticleKey('')

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
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setActiveArticleKey('')
  }

  async function goToIndex(nextIndex: number) {
    if (insights.length === 0) return

    setCurrentIndex(nextIndex)
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
    setActiveArticleKey('')

    if (appLanguage === 'en') return

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
    if (appLanguage === 'en') return currentInsight
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

  const articleJobKey = useMemo(() => {
    if (!displayedCard || !formattedReference || !displayedVerseText) return ''
    return `${appLanguage}:${formattedReference}:${displayedCard.title}:${displayedCard.text}:${displayedVerseText}`
  }, [appLanguage, formattedReference, displayedCard, displayedVerseText])

  const currentArticleJob = articleJobKey ? articleJobs[articleJobKey] : undefined
  const activeArticleJob = activeArticleKey ? articleJobs[activeArticleKey] : undefined

  async function handleUnfold() {
    if (!displayedCard || !formattedReference || !displayedVerseText || !articleJobKey) return

    const existingJob = articleJobs[articleJobKey]

    if (existingJob?.status === 'ready' && existingJob.article) {
      setActiveArticleKey(articleJobKey)
      setArticleShareStatus('')
      setArticleCopyStatus('idle')
      return
    }

    if (existingJob?.status === 'generating') return

    setArticleJobs((prev) => ({
      ...prev,
      [articleJobKey]: {
        status: 'generating',
        title: displayedCard.title,
        reference: formattedReference,
        verseText: displayedVerseText,
        language: appLanguage,
        createdAt: Date.now(),
      },
    }))

    try {
      const res = await fetch('/api/unfold-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText: displayedVerseText,
          insightTitle: displayedCard.title,
          insightText: displayedCard.text,
          targetLanguage: appLanguage,
        }),
      })

      const data: UnfoldApiResponse = await res.json()

      if (!res.ok || !data.article) {
        throw new Error(data.error || 'Failed to generate article.')
      }

      setArticleJobs((prev) => ({
        ...prev,
        [articleJobKey]: {
          status: 'ready',
          article: data.article,
          title: displayedCard.title,
          reference: formattedReference,
          verseText: displayedVerseText,
          language: appLanguage,
          createdAt: Date.now(),
        },
      }))
    } catch (err) {
      setArticleJobs((prev) => ({
        ...prev,
        [articleJobKey]: {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Failed to generate article.',
          title: displayedCard.title,
          reference: formattedReference,
          verseText: displayedVerseText,
          language: appLanguage,
          createdAt: Date.now(),
        },
      }))
    }
  }

  async function handleCopyArticle() {
    if (!activeArticleJob?.article) return

    const text = [
      activeArticleJob.reference,
      '',
      activeArticleJob.article.title,
      '',
      activeArticleJob.article.lead,
      '',
      ...activeArticleJob.article.body,
      ...(activeArticleJob.article.quote ? ['', `“${activeArticleJob.article.quote}”`] : []),
    ].join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      setArticleCopyStatus('copied')
      setArticleShareStatus('')

      if (copyTimerRef.current) {
        window.clearTimeout(copyTimerRef.current)
      }

      copyTimerRef.current = window.setTimeout(() => {
        setArticleCopyStatus('idle')
      }, 1600)
    } catch {
      setArticleCopyStatus('failed')
    }
  }

  async function handleShareArticle() {
    if (!activeArticleJob?.article) return

    const text = [
      activeArticleJob.reference,
      '',
      activeArticleJob.article.title,
      '',
      activeArticleJob.article.lead,
      '',
      ...activeArticleJob.article.body,
      ...(activeArticleJob.article.quote ? ['', `“${activeArticleJob.article.quote}”`] : []),
    ].join('\n\n')

    try {
      if (navigator.share) {
        await navigator.share({ text })
        setArticleShareStatus('Article shared')
      } else {
        await navigator.clipboard.writeText(text)
        setArticleShareStatus('Share unavailable — article copied')
      }
    } catch {
      setArticleShareStatus('')
    }
  }

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

  function handleSelectLens(lens: LensKind) {
    setSelectedLens(lens)
    setLensSheetOpen(false)
    setActiveTab('another-lens')
    setActiveArticleKey('')
    setArticleShareStatus('')
    setArticleCopyStatus('idle')
  }

  function renderTabButton(label: string, isActive: boolean, onClick: () => void) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap ${
          isActive
            ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
            : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'
        }`}
      >
        {label}
      </button>
    )
  }

  function renderStructuredPanel(
    title: string,
    lead: string,
    labelPrefix: string,
    points: string[],
    takeaway: string,
    extraAction?: React.ReactNode
  ) {
    return (
      <div className="tab-panel-enter rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              {title}
            </p>
            {extraAction}
          </div>

          <p className="text-[1rem] leading-8 text-stone-800">{lead}</p>

          <div className="mt-5 space-y-3">
            {points.map((point, index) => (
              <div
                key={`${title}-${index}`}
                className="rounded-[18px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  {labelPrefix} {index + 1}
                </p>
                <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
              Takeaway
            </p>
            <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">{takeaway}</p>
          </div>
        </div>
      </div>
    )
  }

  const copyButtonClass =
    copyStatus === 'copied'
      ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
      : copyStatus === 'failed'
        ? 'border-red-300 bg-red-50 text-red-700'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'

  const unfoldButtonLabel =
    currentArticleJob?.status === 'generating'
      ? 'Generating...'
      : currentArticleJob?.status === 'ready'
        ? 'Open article'
        : 'Unfold'

  const unfoldButtonClass =
    currentArticleJob?.status === 'ready'
      ? 'border-stone-400 bg-[#e8dcc0] text-stone-900'
      : currentArticleJob?.status === 'generating'
        ? 'border-stone-300 bg-[#f3ebd7] text-stone-600'
        : 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'

  function renderInsightsView() {
    return (
      <div className="tab-panel-enter">
        {!loading && insights.length > 0 && !activeArticleKey && (
          <p className="mb-4 text-sm font-medium text-stone-500">
            {currentIndex + 1} / {insights.length}
          </p>
        )}

        {activeArticleKey && activeArticleJob?.status === 'ready' && activeArticleJob.article ? (
          <div className="rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
            <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
              <div className="mb-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveArticleKey('')
                    setArticleShareStatus('')
                    setArticleCopyStatus('idle')
                    if (articleTopRef.current) {
                      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Back to cards
                </button>

                <span className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Article
                </span>
              </div>

              <p className="mb-3 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                {activeArticleJob.reference}
              </p>

              <h2 className="mb-6 text-center text-[2.15rem] font-semibold leading-tight tracking-tight text-stone-900">
                {activeArticleJob.article.title}
              </h2>

              <p className="mb-8 text-[1.1rem] leading-9 text-stone-900">
                {activeArticleJob.article.lead}
              </p>

              {activeArticleJob.article.quote ? (
                <blockquote className="mb-8 border-l-2 border-stone-300 pl-4 text-[1rem] italic leading-8 text-stone-700">
                  {activeArticleJob.article.quote}
                </blockquote>
              ) : null}

              <div className="space-y-7 text-[0.98rem] leading-8 text-stone-800">
                {activeArticleJob.article.body.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCopyArticle}
                  className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  {articleCopyStatus === 'copied'
                    ? 'Copied'
                    : articleCopyStatus === 'failed'
                      ? 'Copy failed'
                      : 'Copy article'}
                </button>

                <button
                  type="button"
                  onClick={handleShareArticle}
                  className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Share article
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveArticleKey('')
                    setArticleShareStatus('')
                    setArticleCopyStatus('idle')
                    if (articleTopRef.current) {
                      articleTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Back to cards
                </button>

                <Link
                  href="/"
                  className="rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-center text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Home
                </Link>
              </div>

              {articleShareStatus && (
                <p className="mt-3 text-center text-sm text-stone-500">{articleShareStatus}</p>
              )}
            </div>
          </div>
        ) : (
          <>
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
                      onClick={handleUnfold}
                      disabled={currentArticleJob?.status === 'generating'}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${unfoldButtonClass}`}
                    >
                      {unfoldButtonLabel}
                    </button>

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

                  {currentArticleJob?.status === 'failed' && currentArticleJob.error && (
                    <p className="mt-3 text-center text-sm text-red-700">{currentArticleJob.error}</p>
                  )}

                  {currentArticleJob?.status === 'ready' && (
                    <p className="mt-3 text-center text-sm text-stone-500">Article ready</p>
                  )}

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
          </>
        )}
      </div>
    )
  }

  function renderCompareView() {
    return renderStructuredPanel(
      'Compare',
      'This mode will compare translation choices and surface where wording moves the reader’s attention in different directions.',
      'Difference',
      [
        'A short lead will name the main translation tension in the verse.',
        'The final version will show 3–5 compact comparison points instead of one dense block.',
        'A short takeaway will explain why those differences matter for reading the verse.',
      ],
      'Compare should feel like a reading tool, not a raw list of translations.'
    )
  }

  function renderContextView() {
    return renderStructuredPanel(
      'Context',
      'This mode will surface only the context that materially changes the reading of the verse.',
      'Context point',
      [
        'The final version will identify the main context type that matters most here.',
        'It will present 3–5 compact context points, not a heavy encyclopedia panel.',
        'A final takeaway will explain how context changes the force of the verse.',
      ],
      'Context should clarify why the verse sounds the way it does inside its real setting.'
    )
  }

  function renderLensView() {
    const lensLabel =
      selectedLens === 'word'
        ? 'Word'
        : selectedLens === 'tension'
          ? 'Tension'
          : selectedLens === 'phrase'
            ? 'Why This Phrase'
            : 'Another Lens'

    const lead =
      selectedLens === 'word'
        ? 'Word will focus on the hidden weight of words, terms, and small textual units.'
        : selectedLens === 'tension'
          ? 'Tension will look for what is surprising, pressured, or internally contrasted in the verse.'
          : selectedLens === 'phrase'
            ? 'Why This Phrase will ask why the verse is said in this exact way, and what is gained by that form.'
            : 'Choose a focused lens to read this verse through one angle.'

    const points =
      selectedLens === 'word'
        ? [
            'This lens will stay close to words and textual units, not generic reflections.',
            'It will highlight hidden weight, verbal force, and meaningful small shifts.',
            'It should feel like close reading, not dictionary trivia.',
          ]
        : selectedLens === 'tension'
          ? [
              'This lens will localize where the tension actually lives in the verse.',
              'It will avoid vague “pseudo-depth” and stay anchored in the text.',
              'It should surface the most surprising pressure point in the wording.',
            ]
          : selectedLens === 'phrase'
            ? [
                'This lens will treat the phrase as a shaped form, not just a container of words.',
                'It will ask what would be lost if the verse were said more simply.',
                'It should feel like disciplined close reading, not airy rhetoric.',
              ]
            : [
                'Choose Word, Tension, or Why This Phrase.',
                'Each lens will become a focused reading mode.',
                'This screen is ready; the lens content comes next.',
              ]

    const takeaway =
      selectedLens === 'word'
        ? 'Word should reveal hidden textual weight without turning into a dry lexicon.'
        : selectedLens === 'tension'
          ? 'Tension should surface real internal pressure in the verse, not invented drama.'
          : selectedLens === 'phrase'
            ? 'Why This Phrase should explain why the wording itself carries meaning.'
            : 'Another Lens is the focused-reading family, not just a reroll button.'

    return renderStructuredPanel(
      `Lens: ${lensLabel}`,
      lead,
      'Lens point',
      points,
      takeaway,
      <button
        type="button"
        onClick={() => setLensSheetOpen(true)}
        className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
      >
        Change
      </button>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-neutral-900">
      <div ref={articleTopRef} className="mx-auto flex w-full max-w-md flex-col">
        <div className="mb-6 flex items-center gap-3 text-sm">
          <Link
            href={`/bible/${book}/${chapter}`}
            className="text-neutral-500 transition hover:text-neutral-700"
          >
            ← Back
          </Link>

          <Link href="/" className="text-neutral-500 transition hover:text-neutral-700">
            Home
          </Link>
        </div>

        <h1 className="mb-2 text-4xl font-semibold tracking-tight text-stone-900">
          {formattedReference || 'Loading...'}
        </h1>

        <div className="mb-5 flex gap-5 overflow-x-auto pb-1 text-[0.98rem] leading-6">
          <button
            type="button"
            onClick={handleShowOriginal}
            className={`whitespace-nowrap border-b bg-transparent pb-1 transition ${
              appLanguage === 'en'
                ? 'border-stone-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            English
          </button>

          <button
            type="button"
            onClick={handleTranslateToSpanish}
            disabled={translationLoading}
            className={`whitespace-nowrap border-b bg-transparent pb-1 transition disabled:opacity-50 ${
              appLanguage === 'es'
                ? 'border-stone-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {translationLoading && appLanguage === 'es' ? 'Translating...' : 'Spanish'}
          </button>

          <button
            type="button"
            disabled
            className="whitespace-nowrap border-b border-transparent bg-transparent pb-1 text-stone-300"
          >
            French
          </button>

          <button
            type="button"
            disabled
            className="whitespace-nowrap border-b border-transparent bg-transparent pb-1 text-stone-300"
          >
            German
          </button>

          <button
            type="button"
            onClick={handleTranslateToRussian}
            disabled={translationLoading}
            className={`whitespace-nowrap border-b bg-transparent pb-1 transition disabled:opacity-50 ${
              appLanguage === 'ru'
                ? 'border-stone-500 text-stone-900'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {translationLoading && appLanguage === 'ru' ? 'Translating...' : 'Russian'}
          </button>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {renderTabButton('Insights', activeTab === 'insights', () => {
            setActiveTab('insights')
            setLensSheetOpen(false)
          })}
          {renderTabButton('Compare', activeTab === 'compare', () => {
            setActiveTab('compare')
            setLensSheetOpen(false)
            setActiveArticleKey('')
          })}
          {renderTabButton('Context', activeTab === 'context', () => {
            setActiveTab('context')
            setLensSheetOpen(false)
            setActiveArticleKey('')
          })}
          {renderTabButton('Another Lens', activeTab === 'another-lens', () => {
            setLensSheetOpen(true)
            setActiveArticleKey('')
          })}
        </div>

        {activeTab === 'insights' && renderInsightsView()}
        {activeTab === 'compare' && renderCompareView()}
        {activeTab === 'context' && renderContextView()}
        {activeTab === 'another-lens' && renderLensView()}
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

      {lensSheetOpen && (
        <div className="sheet-overlay fixed inset-0 z-50 flex items-end bg-black/25 px-4 pb-4 pt-16">
          <div className="sheet-panel mx-auto w-full max-w-md rounded-[28px] border border-stone-300 bg-[#fbf6ea] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-stone-900">Another Lens</p>
                <p className="mt-1 text-sm text-stone-500">Choose a focused lens</p>
                <p className="text-sm text-stone-500">Read this verse through one angle.</p>
              </div>

              <button
                type="button"
                onClick={() => setLensSheetOpen(false)}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-1.5 text-sm font-medium text-stone-700"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => handleSelectLens('word')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">Word</p>
                <p className="mt-1 text-sm text-stone-500">Hidden weight of words</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLens('tension')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">Tension</p>
                <p className="mt-1 text-sm text-stone-500">What’s surprising here</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectLens('phrase')}
                className="w-full rounded-[22px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-left transition hover:bg-[#f8efdc]"
              >
                <p className="text-base font-semibold text-stone-900">Why This Phrase</p>
                <p className="mt-1 text-sm text-stone-500">Why it is said this way</p>
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scriptura-fade-slide-up {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scriptura-sheet-overlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scriptura-sheet-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tab-panel-enter {
          animation: scriptura-fade-slide-up 220ms ease;
        }

        .sheet-overlay {
          animation: scriptura-sheet-overlay 180ms ease;
        }

        .sheet-panel {
          animation: scriptura-sheet-up 220ms ease;
        }
      `}</style>
    </main>
  )
}
