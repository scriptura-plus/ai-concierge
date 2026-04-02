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

type WordLensApiResponse = {
  cards?: InsightItem[]
  error?: string
  raw?: string
}

type AppLanguage = 'en' | 'ru' | 'es'
type TopMode = 'insights' | 'compare' | 'context' | 'another-lens'
type LensKind = 'word' | 'tension' | 'phrase'
type ArticleJobStatus = 'idle' | 'loading' | 'ready' | 'failed'

type ArticleJob = {
  status: ArticleJobStatus
  article?: ArticlePayload
  error?: string
}

export default function VerseDetailPage({ params }: PageProps) {
  const [book, setBook] = useState('')
  const [chapter, setChapter] = useState('')
  const [verse, setVerse] = useState('')

  const [topMode, setTopMode] = useState<TopMode>('insights')
  const [lensSheetOpen, setLensSheetOpen] = useState(false)
  const [selectedLens, setSelectedLens] = useState<LensKind | null>(null)

  const [showFocusInput, setShowFocusInput] = useState(false)
  const [focusWord, setFocusWord] = useState('')
  const [submittedFocusWord, setSubmittedFocusWord] = useState('')

  const [verseText, setVerseText] = useState('')
  const [translatedVerseTexts, setTranslatedVerseTexts] = useState<Record<string, string>>({})

  const [insights, setInsights] = useState<InsightItem[]>([])
  const [wordLensCards, setWordLensCards] = useState<InsightItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rawOutput, setRawOutput] = useState('')

  const [wordLensLoading, setWordLensLoading] = useState(false)
  const [wordLensError, setWordLensError] = useState('')

  const [appLanguage, setAppLanguage] = useState<AppLanguage>('en')
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [translatedCards, setTranslatedCards] = useState<Record<string, InsightItem>>({})

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [shareStatus, setShareStatus] = useState('')

  const [articleJobs, setArticleJobs] = useState<Record<string, ArticleJob>>({})
  const [articleViewOpen, setArticleViewOpen] = useState(false)
  const [activeArticleKey, setActiveArticleKey] = useState('')

  const [articleCopyStatus, setArticleCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [articleShareStatus, setArticleShareStatus] = useState('')

  const copyTimerRef = useRef<number | null>(null)
  const articleCopyTimerRef = useRef<number | null>(null)
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
      if (articleCopyTimerRef.current) {
        window.clearTimeout(articleCopyTimerRef.current)
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
      setWordLensCards([])
      setWordLensError('')
      setCurrentIndex(0)
      setTopMode('insights')
      setSelectedLens(null)
      setLensSheetOpen(false)
      setArticleViewOpen(false)
      setActiveArticleKey('')
      setAppLanguage('en')
      setTranslationLoading(false)
      setTranslationError('')
      setTranslatedCards({})
      setTranslatedVerseTexts({})
      setCopyStatus('idle')
      setShareStatus('')
      setArticleCopyStatus('idle')
      setArticleShareStatus('')

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

  const currentCards = useMemo(() => {
    if (topMode === 'another-lens' && selectedLens === 'word') {
      return wordLensCards
    }
    if (topMode === 'another-lens' && (selectedLens === 'tension' || selectedLens === 'phrase')) {
      return []
    }
    return insights
  }, [topMode, selectedLens, wordLensCards, insights])

  const currentInsight = useMemo(() => {
    return currentCards[currentIndex]
  }, [currentCards, currentIndex])

  const currentModeKey = useMemo(() => {
    if (topMode === 'another-lens') {
      return `another-lens:${selectedLens ?? 'none'}`
    }
    return topMode
  }, [topMode, selectedLens])

  const currentCardKey = useMemo(() => {
    if (!currentInsight) return ''
    return `${currentModeKey}:${currentIndex}:${currentInsight.title}:${currentInsight.text}`
  }, [currentModeKey, currentIndex, currentInsight])

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
    setArticleCopyStatus('idle')
    setArticleShareStatus('')

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
    setArticleCopyStatus('idle')
    setArticleShareStatus('')
  }

  async function goToIndex(nextIndex: number) {
    if (currentCards.length === 0) return

    setCurrentIndex(nextIndex)
    setArticleViewOpen(false)
    setTranslationError('')
    setCopyStatus('idle')
    setShareStatus('')
    setArticleCopyStatus('idle')
    setArticleShareStatus('')

    if (appLanguage === 'en') {
      return
    }

    const nextInsight = currentCards[nextIndex]
    if (!nextInsight) return

    const nextCardKey = `${currentModeKey}:${nextIndex}:${nextInsight.title}:${nextInsight.text}`
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
    if (currentCards.length === 0) return
    const nextIndex = (currentIndex + 1) % currentCards.length
    await goToIndex(nextIndex)
  }

  async function handlePrev() {
    if (currentCards.length === 0) return
    const prevIndex = (currentIndex - 1 + currentCards.length) % currentCards.length
    await goToIndex(prevIndex)
  }

  function handleGenerateFocusInsights() {
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

  const formattedBookName = useMemo(() => {
    if (!book) return ''

    const bookMap: Record<string, string> = {
      genesis: 'Genesis',
      exodus: 'Exodus',
      leviticus: 'Leviticus',
      numbers: 'Numbers',
      deuteronomy: 'Deuteronomy',
      joshua: 'Joshua',
      judges: 'Judges',
      ruth: 'Ruth',
      '1-samuel': '1 Samuel',
      '2-samuel': '2 Samuel',
      '1-kings': '1 Kings',
      '2-kings': '2 Kings',
      '1-chronicles': '1 Chronicles',
      '2-chronicles': '2 Chronicles',
      ezra: 'Ezra',
      nehemiah: 'Nehemiah',
      esther: 'Esther',
      job: 'Job',
      psalms: 'Psalms',
      proverbs: 'Proverbs',
      ecclesiastes: 'Ecclesiastes',
      'song-of-solomon': 'Song of Solomon',
      isaiah: 'Isaiah',
      jeremiah: 'Jeremiah',
      lamentations: 'Lamentations',
      ezekiel: 'Ezekiel',
      daniel: 'Daniel',
      hosea: 'Hosea',
      joel: 'Joel',
      amos: 'Amos',
      obadiah: 'Obadiah',
      jonah: 'Jonah',
      micah: 'Micah',
      nahum: 'Nahum',
      habakkuk: 'Habakkuk',
      zephaniah: 'Zephaniah',
      haggai: 'Haggai',
      zechariah: 'Zechariah',
      malachi: 'Malachi',
      matthew: 'Matthew',
      mark: 'Mark',
      luke: 'Luke',
      john: 'John',
      acts: 'Acts',
      romans: 'Romans',
      '1-corinthians': '1 Corinthians',
      '2-corinthians': '2 Corinthians',
      galatians: 'Galatians',
      ephesians: 'Ephesians',
      philippians: 'Philippians',
      colossians: 'Colossians',
      '1-thessalonians': '1 Thessalonians',
      '2-thessalonians': '2 Thessalonians',
      '1-timothy': '1 Timothy',
      '2-timothy': '2 Timothy',
      titus: 'Titus',
      philemon: 'Philemon',
      hebrews: 'Hebrews',
      james: 'James',
      '1-peter': '1 Peter',
      '2-peter': '2 Peter',
      '1-john': '1 John',
      '2-john': '2 John',
      '3-john': '3 John',
      jude: 'Jude',
      revelation: 'Revelation',
    }

    return (
      bookMap[book] ||
      book
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    )
  }, [book])

  const formattedReference = useMemo(() => {
    if (!formattedBookName || !chapter || !verse) return ''
    return `${formattedBookName} ${chapter}:${verse}`
  }, [formattedBookName, chapter, verse])

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

  function getArticleJob(key: string): ArticleJob {
    return articleJobs[key] || { status: 'idle' }
  }

  const currentArticleJob = useMemo(() => {
    if (!currentCardKey) return { status: 'idle' } as ArticleJob
    return getArticleJob(currentCardKey)
  }, [articleJobs, currentCardKey])

  const activeArticle = useMemo(() => {
    if (!activeArticleKey) return undefined
    return articleJobs[activeArticleKey]?.article
  }, [activeArticleKey, articleJobs])

  const articleText = useMemo(() => {
    if (!activeArticle || !formattedReference) return ''
    const quoteBlock = activeArticle.quote ? `\n\n${activeArticle.quote}` : ''
    return [
      formattedReference,
      '',
      activeArticle.title,
      '',
      activeArticle.lead,
      '',
      ...activeArticle.body,
      quoteBlock,
    ]
      .filter(Boolean)
      .join('\n')
  }, [activeArticle, formattedReference])

  async function handleUnfold() {
    if (!displayedCard || !currentCardKey || !formattedReference) return

    const existing = getArticleJob(currentCardKey)

    if (existing.status === 'ready' && existing.article) {
      setActiveArticleKey(currentCardKey)
      setArticleViewOpen(true)
      return
    }

    setArticleJobs((prev) => ({
      ...prev,
      [currentCardKey]: {
        status: 'loading',
      },
    }))

    try {
      const res = await fetch('/api/unfold', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference: formattedReference,
          verseText: displayedVerseText,
          title: displayedCard.title,
          text: displayedCard.text,
          language: appLanguage,
        }),
      })

      const data: UnfoldApiResponse = await res.json()

      if (!res.ok || !data.article) {
        setArticleJobs((prev) => ({
          ...prev,
          [currentCardKey]: {
            status: 'failed',
            error: data.error || 'Unable to unfold.',
          },
        }))
        return
      }

      setArticleJobs((prev) => ({
        ...prev,
        [currentCardKey]: {
          status: 'ready',
          article: data.article,
        },
      }))

      setActiveArticleKey(currentCardKey)
      setArticleViewOpen(true)
    } catch {
      setArticleJobs((prev) => ({
        ...prev,
        [currentCardKey]: {
          status: 'failed',
          error: 'Unable to unfold.',
        },
      }))
    }
  }

  function handleOpenArticle() {
    if (!currentCardKey) return
    const job = getArticleJob(currentCardKey)
    if (job.status === 'ready' && job.article) {
      setActiveArticleKey(currentCardKey)
      setArticleViewOpen(true)
    }
  }

  function handleBackToCards() {
    setArticleViewOpen(false)
    setArticleCopyStatus('idle')
    setArticleShareStatus('')
  }

  async function handleCopyArticle() {
    if (!articleText) return

    try {
      await navigator.clipboard.writeText(articleText)
      setArticleCopyStatus('copied')
      setArticleShareStatus('')

      if (articleCopyTimerRef.current) {
        window.clearTimeout(articleCopyTimerRef.current)
      }

      articleCopyTimerRef.current = window.setTimeout(() => {
        setArticleCopyStatus('idle')
      }, 1600)
    } catch {
      setArticleCopyStatus('failed')
    }
  }

  async function handleShareArticle() {
    if (!articleText) return

    try {
      if (navigator.share) {
        await navigator.share({ text: articleText })
        setArticleShareStatus('Shared as text')
        setArticleCopyStatus('idle')
      } else {
        await navigator.clipboard.writeText(articleText)
        setArticleShareStatus('Share unavailable — copied instead')
        setArticleCopyStatus('idle')
      }
    } catch {
      setArticleShareStatus('')
    }
  }

  async function loadWordLens(force = false) {
    if (!formattedReference || !verseText) return
    if (!force && wordLensCards.length > 0) return

    setWordLensLoading(true)
    setWordLensError('')
    setCurrentIndex(0)
    setArticleViewOpen(false)

    try {
      const res = await fetch('/api/word-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formattedReference,
          verseText,
          targetLanguage: appLanguage,
        }),
      })

      const data: WordLensApiResponse = await res.json()

      if (!res.ok || !Array.isArray(data.cards) || data.cards.length === 0) {
        setWordLensError(data.error || 'Unable to load Word lens.')
        setWordLensCards([])
        return
      }

      setWordLensCards(data.cards)
    } catch {
      setWordLensError('Unable to load Word lens.')
      setWordLensCards([])
    } finally {
      setWordLensLoading(false)
    }
  }

  async function handleSelectLens(lens: LensKind) {
    setSelectedLens(lens)
    setTopMode('another-lens')
    setLensSheetOpen(false)
    setArticleViewOpen(false)
    setCurrentIndex(0)
    setCopyStatus('idle')
    setShareStatus('')
    setArticleCopyStatus('idle')
    setArticleShareStatus('')
  }

  const currentLensLabel = useMemo(() => {
    if (selectedLens === 'word') return 'Word'
    if (selectedLens === 'tension') return 'Tension'
    if (selectedLens === 'phrase') return 'Why This Phrase'
    return ''
  }, [selectedLens])

  const insightsCountText = useMemo(() => {
    if (loading || currentCards.length === 0) return ''
    return `${currentIndex + 1} / ${currentCards.length}`
  }, [loading, currentCards.length, currentIndex])

  const languageOptions: Array<{
    key: 'en' | 'es' | 'fr' | 'de' | 'ru'
    label: string
    available: boolean
  }> = [
    { key: 'en', label: 'English', available: true },
    { key: 'es', label: 'Spanish', available: true },
    { key: 'fr', label: 'French', available: false },
    { key: 'de', label: 'German', available: false },
    { key: 'ru', label: 'Russian', available: true },
  ]

  function renderModeTabs() {
    const baseClass =
      'rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap'
    const activeClass = 'border-stone-400 bg-[#e8dcc0] text-stone-900'
    const idleClass = 'border-stone-300 bg-[#fffaf1] text-stone-700 hover:bg-[#f8efdc]'

    return (
      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => {
            setTopMode('insights')
            setArticleViewOpen(false)
          }}
          className={`${baseClass} ${topMode === 'insights' ? activeClass : idleClass}`}
        >
          Insights
        </button>

        <button
          type="button"
          onClick={() => {
            setTopMode('compare')
            setArticleViewOpen(false)
          }}
          className={`${baseClass} ${topMode === 'compare' ? activeClass : idleClass}`}
        >
          Compare
        </button>

        <button
          type="button"
          onClick={() => {
            setTopMode('context')
            setArticleViewOpen(false)
          }}
          className={`${baseClass} ${topMode === 'context' ? activeClass : idleClass}`}
        >
          Context
        </button>

        <button
          type="button"
          onClick={() => {
            setLensSheetOpen(true)
            setArticleViewOpen(false)
          }}
          className={`${baseClass} ${topMode === 'another-lens' ? activeClass : idleClass}`}
        >
          Another Lens
        </button>
      </div>
    )
  }

  function renderInsightsToolbar() {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-stone-500">{insightsCountText}</div>

        {topMode === 'insights' && (
          <button
            type="button"
            onClick={() => setShowFocusInput((prev) => !prev)}
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Focus word
          </button>
        )}
      </div>
    )
  }

  function renderFocusWordPanel() {
    if (!showFocusInput || topMode !== 'insights') return null

    return (
      <div className="mt-4 rounded-[24px] border border-stone-200/80 bg-[#fbf6ea] p-4 shadow-[0_8px_20px_rgba(90,72,41,0.06)]">
        <label htmlFor="focusWord" className="mb-2 block text-sm font-medium text-stone-700">
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

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateFocusInsights}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
          >
            Regenerate insights
          </button>

          <button
            type="button"
            onClick={() => setShowFocusInput(false)}
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Close
          </button>
        </div>

        {submittedFocusWord && (
          <p className="mt-3 text-sm text-stone-500">Focus: “{submittedFocusWord}”</p>
        )}
      </div>
    )
  }

  function renderWordLensLoading() {
    return (
      <div className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Word lens
          </p>
          <p className="text-[1.08rem] leading-9 text-stone-800">
            Reading the verse through the hidden weight of its words…
          </p>
        </div>
      </div>
    )
  }

  function renderAnotherLensPlaceholder(title: string, subtitle: string) {
    return (
      <div className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-stone-500">Lens: {title}</p>
            <button
              type="button"
              onClick={() => setLensSheetOpen(true)}
              className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
            >
              Change
            </button>
          </div>

          <p className="text-[1.08rem] leading-9 text-stone-800">{subtitle}</p>
        </div>
      </div>
    )
  }

  function renderCardMode() {
    if (topMode === 'another-lens' && selectedLens === 'word' && wordLensLoading) {
      return renderWordLensLoading()
    }

    if (topMode === 'another-lens' && selectedLens === 'word' && wordLensError) {
      return (
        <div className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
          <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-stone-500">Lens: Word</p>
              <button
                type="button"
                onClick={() => setLensSheetOpen(true)}
                className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
              >
                Change
              </button>
            </div>

            <p className="text-[1.08rem] leading-9 text-stone-800">{wordLensError}</p>

            <button
              type="button"
              onClick={() => loadWordLens(true)}
              className="mt-5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    if (topMode === 'another-lens' && selectedLens === 'tension') {
      return renderAnotherLensPlaceholder(
        'Tension',
        'Tension cards come next. This lens will surface what is surprising, paradoxical, or internally pressured in the verse.'
      )
    }

    if (topMode === 'another-lens' && selectedLens === 'phrase') {
      return renderAnotherLensPlaceholder(
        'Why This Phrase',
        'Why This Phrase comes next. This lens will read the verse as a shaped phrase, not just as a container of words.'
      )
    }

    return (
      <>
        {topMode === 'another-lens' && selectedLens && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-stone-500">Lens: {currentLensLabel}</div>
            <button
              type="button"
              onClick={() => setLensSheetOpen(true)}
              className="text-sm font-medium text-stone-600 underline decoration-stone-300 underline-offset-4"
            >
              Change
            </button>
          </div>
        )}

        {(topMode === 'insights' || (topMode === 'another-lens' && selectedLens === 'word')) &&
          renderInsightsToolbar()}

        {renderFocusWordPanel()}

        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]"
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

              <p className="text-[1.08rem] leading-9 text-stone-800">{displayedCard.text}</p>

              <div className="mt-6 flex flex-wrap justify-center gap-2.5">
                {currentArticleJob.status === 'ready' ? (
                  <button
                    type="button"
                    onClick={handleOpenArticle}
                    className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                  >
                    Open article
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleUnfold}
                    disabled={currentArticleJob.status === 'loading'}
                    className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
                  >
                    {currentArticleJob.status === 'loading' ? 'Unfolding…' : 'Unfold'}
                  </button>
                )}

                <button
                  type="button"
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Comment
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

              {currentArticleJob.status === 'failed' && currentArticleJob.error && (
                <p className="mt-3 text-center text-sm text-red-700">{currentArticleJob.error}</p>
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

        {!loading && currentCards.length > 1 && (
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
    )
  }

  function renderCompareMode() {
    return (
      <div className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Compare
          </p>

          <p className="mt-4 text-[1.02rem] leading-8 text-stone-800">
            This mode will compare translation choices and show where phrasing shifts the reader’s
            attention. The UI shell is ready; the comparison engine comes next.
          </p>

          <div className="mt-6 space-y-4">
            {[
              'A short lead that names the main translation tension',
              '3–5 compact comparison points instead of one heavy text block',
              'A brief takeaway explaining why the differences matter',
            ].map((point, index) => (
              <div
                key={point}
                className="rounded-[20px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Point {index + 1}
                </p>
                <p className="mt-2 text-[0.98rem] leading-7 text-stone-800">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Deepen
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Comment
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Copy
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderContextMode() {
    return (
      <div className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            Context
          </p>

          <p className="mt-4 text-sm font-medium text-stone-500">
            Main context: argument flow
          </p>

          <p className="mt-4 text-[1.02rem] leading-8 text-stone-800">
            This mode will surface only the context that materially changes the reading of the
            verse. The shell is ready; the context engine comes next.
          </p>

          <div className="mt-6 space-y-4">
            {[
              'A short lead explaining why the verse reads differently inside its real context',
              '3–5 compact context points instead of one encyclopedic panel',
              'A brief takeaway that gathers the context into one clear reading shift',
            ].map((point, index) => (
              <div
                key={point}
                className="rounded-[20px] border border-stone-300/60 bg-[#fbf6ea]/70 px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Context point {index + 1}
                </p>
                <p className="mt-2 text-[0.98rem] leading-7 text-stone-800">{point}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Deepen
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Comment
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Copy
            </button>
            <button
              type="button"
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Share
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderArticleView() {
    if (!activeArticle) return null

    return (
      <div className="mt-4 rounded-[34px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-6 shadow-[0_16px_34px_rgba(94,72,37,0.14)]">
        <div className="rounded-[28px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-6 py-7 shadow-inner">
          <div className="mb-6 flex items-start justify-between gap-4">
            <button
              type="button"
              onClick={handleBackToCards}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
            >
              Back to cards
            </button>

            <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
              Article
            </p>
          </div>

          <p className="mb-5 text-center text-[13px] font-semibold uppercase tracking-[0.22em] text-stone-500">
            {formattedReference}
          </p>

          <h2 className="mb-5 text-center text-[2rem] font-semibold leading-tight tracking-tight text-stone-900">
            {activeArticle.title}
          </h2>

          <p className="mb-8 text-[1.08rem] leading-9 text-stone-800">{activeArticle.lead}</p>

          {activeArticle.quote && (
            <blockquote className="mb-8 border-l-2 border-stone-300 pl-5 text-[1.02rem] italic leading-8 text-stone-600">
              {activeArticle.quote}
            </blockquote>
          )}

          <div className="space-y-7">
            {activeArticle.body.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`} className="text-[1.08rem] leading-9 text-stone-800">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleCopyArticle}
              className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-base font-medium text-stone-800 transition hover:bg-[#f8efdc]"
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
              className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-base font-medium text-stone-800 transition hover:bg-[#f8efdc]"
            >
              Share article
            </button>

            <button
              type="button"
              onClick={handleBackToCards}
              className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-base font-medium text-stone-800 transition hover:bg-[#f8efdc]"
            >
              Back to cards
            </button>

            <Link
              href="/"
              className="rounded-[24px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-center text-base font-medium text-stone-800 transition hover:bg-[#f8efdc]"
            >
              Home
            </Link>
          </div>

          {articleShareStatus && (
            <p className="mt-4 text-center text-sm text-stone-500">{articleShareStatus}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4ea_0%,#f3ede0_45%,#f7f3ea_100%)] px-4 py-6 text-neutral-900">
      <div className="mx-auto flex w-full max-w-md flex-col">
        <div className="mb-5 flex items-center gap-4 text-sm text-neutral-500">
          <Link href={`/bible/${book}/${chapter}`} className="transition hover:text-neutral-700">
            ← Back
          </Link>

          <Link href="/" className="transition hover:text-neutral-700">
            Home
          </Link>
        </div>

        <h1 className="text-4xl font-semibold tracking-tight text-stone-900">
          {formattedReference || 'Loading...'}
        </h1>

        <div className="mt-4 flex gap-5 overflow-x-auto pb-1 text-[0.98rem] leading-6">
          {languageOptions.map((option) => {
            const isActive =
              (option.key === 'en' && appLanguage === 'en') ||
              (option.key === 'es' && appLanguage === 'es') ||
              (option.key === 'ru' && appLanguage === 'ru')

            let onClick: (() => void) | undefined

            if (option.available) {
              if (option.key === 'en') onClick = handleShowOriginal
              if (option.key === 'es') onClick = handleTranslateToSpanish
              if (option.key === 'ru') onClick = handleTranslateToRussian
            }

            return (
              <button
                key={option.key}
                type="button"
                onClick={onClick}
                disabled={!option.available || translationLoading}
                className={`whitespace-nowrap border-b bg-transparent pb-1 transition ${
                  isActive
                    ? 'border-stone-500 text-stone-900'
                    : option.available
                      ? 'border-transparent text-stone-500 hover:text-stone-700'
                      : 'border-transparent text-stone-300'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {renderModeTabs()}

        {articleViewOpen && activeArticle ? (
          renderArticleView()
        ) : topMode === 'compare' ? (
          renderCompareMode()
        ) : topMode === 'context' ? (
          renderContextMode()
        ) : (
          renderCardMode()
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

      {lensSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/25 px-4 pb-4 pt-16">
          <div className="mx-auto w-full max-w-md rounded-[28px] border border-stone-300 bg-[#fbf6ea] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.16)]">
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
    </main>
  )
}
