'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type SavedCard = {
  id: string
  title: string
  text: string
  createdAt: string
}

type ExactBuilderOption = {
  title: string
  text: string
}

type ExactBuilderResponse = {
  options?: ExactBuilderOption[]
  error?: string
  raw?: string
}

type RetitleResponse = {
  titles?: string[]
  error?: string
  raw?: string
}

type SaveCardResponse = {
  ok?: boolean
  savedId?: string
  error?: string
}

type DirectionArticle = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type DirectionSearchResponse = {
  article?: DirectionArticle
  error?: string
  raw?: string
}

type RepairSourceType = 'candidate' | 'reserve_insight' | 'featured_insight' | ''

type WorkspaceClientProps = {
  reference: string
  verseText: string
  savedCards: SavedCard[]
  book: string
  chapter: number
  verse: number
  initialExactInput?: string
  initialDirectionInput?: string
  prefillMode?: boolean
  initialCandidateId?: string
  repairSourceType?: RepairSourceType
  repairSourceId?: string
}

type PersistedWorkspaceState = {
  exactInput: string
  exactOptions: ExactBuilderOption[]
  exactRaw: string
  directionInput: string
  directionArticle: DirectionArticle | null
  directionRaw: string
}

function normalizeText(value: string) {
  return value.replace(/\r/g, '').trim()
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function containsVerbatimSacredPassage(sacredPassage: string, candidateText: string) {
  const normalizedSacred = normalizeForCompare(sacredPassage)
  const normalizedCandidate = normalizeForCompare(candidateText)
  return normalizedCandidate.includes(normalizedSacred)
}

function buildDirectionArticleText(article: DirectionArticle) {
  return [
    article.title,
    '',
    article.lead,
    '',
    ...article.body,
    ...(article.quote ? ['', `“${article.quote}”`] : []),
  ].join('\n\n')
}

export default function WorkspaceClient({
  reference,
  verseText,
  savedCards,
  book,
  chapter,
  verse,
  initialExactInput = '',
  initialDirectionInput = '',
  prefillMode = false,
  initialCandidateId = '',
  repairSourceType = '',
  repairSourceId = '',
}: WorkspaceClientProps) {
  const router = useRouter()

  const storageKey = useMemo(
    () => `moderator-workspace-state:${book}:${chapter}:${verse}`,
    [book, chapter, verse]
  )

  const [exactInput, setExactInput] = useState('')
  const [exactOptions, setExactOptions] = useState<ExactBuilderOption[]>([])
  const [exactLoading, setExactLoading] = useState(false)
  const [exactError, setExactError] = useState('')
  const [exactRaw, setExactRaw] = useState('')

  const [retitlingIndex, setRetitlingIndex] = useState<number | null>(null)
  const [retitleOptionsByIndex, setRetitleOptionsByIndex] = useState<Record<number, string[]>>({})
  const [retitleErrorByIndex, setRetitleErrorByIndex] = useState<Record<number, string>>({})
  const [retitleRawByIndex, setRetitleRawByIndex] = useState<Record<number, string>>({})

  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedIndexes, setSavedIndexes] = useState<number[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [directionInput, setDirectionInput] = useState('')
  const [directionArticle, setDirectionArticle] = useState<DirectionArticle | null>(null)
  const [directionLoading, setDirectionLoading] = useState(false)
  const [directionError, setDirectionError] = useState('')
  const [directionRaw, setDirectionRaw] = useState('')
  const [directionActionMessage, setDirectionActionMessage] = useState('')

  const [isHydrated, setIsHydrated] = useState(false)

  const sacredPassage = useMemo(() => normalizeText(exactInput), [exactInput])
  const directionRequest = useMemo(() => normalizeText(directionInput), [directionInput])

  useEffect(() => {
    if (prefillMode) {
      setExactInput(initialExactInput)
      setDirectionInput(initialDirectionInput)
      setExactOptions([])
      setExactRaw('')
      setExactError('')
      setRetitleOptionsByIndex({})
      setRetitleErrorByIndex({})
      setRetitleRawByIndex({})
      setSaveError('')
      setSavedIndexes([])
      setDirectionArticle(null)
      setDirectionRaw('')
      setDirectionError('')
      setDirectionActionMessage('')
      setSaveMessage(
        initialCandidateId
          ? `Материал ${initialCandidateId.slice(0, 8)} загружен в режим доработки.`
          : 'Материал загружен в режим доработки.'
      )
      setIsHydrated(true)
      return
    }

    try {
      const raw = sessionStorage.getItem(storageKey)
      if (!raw) {
        setExactInput('')
        setDirectionInput('')
        setIsHydrated(true)
        return
      }

      const parsed = JSON.parse(raw) as Partial<PersistedWorkspaceState>

      setExactInput(typeof parsed.exactInput === 'string' ? parsed.exactInput : '')
      setExactOptions(Array.isArray(parsed.exactOptions) ? parsed.exactOptions : [])
      setExactRaw(typeof parsed.exactRaw === 'string' ? parsed.exactRaw : '')

      setDirectionInput(typeof parsed.directionInput === 'string' ? parsed.directionInput : '')
      setDirectionArticle(parsed.directionArticle ?? null)
      setDirectionRaw(typeof parsed.directionRaw === 'string' ? parsed.directionRaw : '')
    } catch {
      setExactInput('')
      setDirectionInput('')
    } finally {
      setIsHydrated(true)
    }
  }, [
    storageKey,
    prefillMode,
    initialExactInput,
    initialDirectionInput,
    initialCandidateId,
  ])

  useEffect(() => {
    if (!isHydrated || prefillMode) return

    const payload: PersistedWorkspaceState = {
      exactInput,
      exactOptions,
      exactRaw,
      directionInput,
      directionArticle,
      directionRaw,
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify(payload))
    } catch {
      // ignore storage issues
    }
  }, [
    isHydrated,
    prefillMode,
    storageKey,
    exactInput,
    exactOptions,
    exactRaw,
    directionInput,
    directionArticle,
    directionRaw,
  ])

  async function copyDirectionArticle(article: DirectionArticle) {
    try {
      await navigator.clipboard.writeText(buildDirectionArticleText(article))
      setDirectionActionMessage('Исследование скопировано.')
    } catch {
      setDirectionActionMessage('Не удалось скопировать исследование.')
    }
  }

  async function shareDirectionArticle(article: DirectionArticle) {
    const text = buildDirectionArticleText(article)

    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text,
        })
        setDirectionActionMessage('Исследование отправлено в меню «Поделиться».')
        return
      }

      await navigator.clipboard.writeText(text)
      setDirectionActionMessage('Меню «Поделиться» недоступно. Текст скопирован.')
    } catch {
      setDirectionActionMessage('Не удалось поделиться исследованием.')
    }
  }

  async function generateExactBuilder() {
    if (!sacredPassage) {
      setExactError('Вставь 1–2 предложения, которые нужно сохранить дословно.')
      return
    }

    setExactLoading(true)
    setExactError('')
    setExactRaw('')
    setRetitleOptionsByIndex({})
    setRetitleErrorByIndex({})
    setRetitleRawByIndex({})
    setSaveMessage('')
    setSaveError('')
    setSavedIndexes([])
    setDirectionActionMessage('')

    try {
      const res = await fetch('/api/moderator/workspace/exact-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          sacredPassage,
          mode: 'fresh',
        }),
      })

      const data: ExactBuilderResponse = await res.json()

      if (!res.ok || !Array.isArray(data.options) || data.options.length === 0) {
        setExactError(data.error || 'Не удалось сгенерировать варианты.')
        setExactRaw(data.raw || '')
        setExactOptions([])
        return
      }

      const strictlyValid = data.options.filter((item) =>
        containsVerbatimSacredPassage(sacredPassage, item.text)
      )

      if (strictlyValid.length === 0) {
        setExactError('Модель не сохранила вставленный текст дословно. Попробуй ещё раз.')
        setExactRaw(data.raw || '')
        setExactOptions([])
        return
      }

      setExactOptions(strictlyValid)
    } catch {
      setExactError('Не удалось сгенерировать варианты.')
      setExactOptions([])
    } finally {
      setExactLoading(false)
    }
  }

  async function generateNewTitles(option: ExactBuilderOption, index: number) {
    setRetitlingIndex(index)
    setRetitleErrorByIndex((prev) => ({
      ...prev,
      [index]: '',
    }))
    setRetitleRawByIndex((prev) => ({
      ...prev,
      [index]: '',
    }))

    try {
      const res = await fetch('/api/moderator/workspace/retitle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          currentTitle: option.title,
          cardText: option.text,
        }),
      })

      const data: RetitleResponse = await res.json()

      if (!res.ok || !Array.isArray(data.titles) || data.titles.length === 0) {
        setRetitleErrorByIndex((prev) => ({
          ...prev,
          [index]: data.error || 'Не удалось предложить новые заголовки.',
        }))
        setRetitleRawByIndex((prev) => ({
          ...prev,
          [index]: data.raw || '',
        }))
        return
      }

      setRetitleOptionsByIndex((prev) => ({
        ...prev,
        [index]: data.titles ?? [],
      }))
    } catch {
      setRetitleErrorByIndex((prev) => ({
        ...prev,
        [index]: 'Не удалось предложить новые заголовки.',
      }))
    } finally {
      setRetitlingIndex(null)
    }
  }

  function applyRetitle(index: number, newTitle: string) {
    setExactOptions((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              title: newTitle,
            }
          : item
      )
    )

    setRetitleOptionsByIndex((prev) => {
      const next: Record<number, string[]> = { ...prev }
      delete next[index]
      return next
    })

    setRetitleErrorByIndex((prev) => {
      const next: Record<number, string> = { ...prev }
      delete next[index]
      return next
    })

    setRetitleRawByIndex((prev) => {
      const next: Record<number, string> = { ...prev }
      delete next[index]
      return next
    })
  }

  async function saveOption(option: ExactBuilderOption, index: number) {
    if (!containsVerbatimSacredPassage(sacredPassage, option.text)) {
      setSaveError('Эту карточку нельзя сохранить: исходный фрагмент не сохранён дословно.')
      return
    }

    if (savedIndexes.includes(index)) return

    setSavingIndex(index)
    setSaveMessage('')
    setSaveError('')

    try {
      const res = await fetch('/api/moderator/workspace/save-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          book,
          chapter,
          verse,
          titleRu: option.title,
          textRu: option.text,
          mode: 'insights',
          angleNote: sacredPassage || null,
          repairSourceType,
          repairSourceId,
        }),
      })

      const data: SaveCardResponse = await res.json()

      if (!res.ok || !data.ok) {
        setSaveError(data.error || 'Не удалось сохранить карточку.')
        return
      }

      setSavedIndexes((prev) => [...prev, index])
      setSaveMessage(`Карточка ${index + 1} сохранена.`)
      router.refresh()
    } catch {
      setSaveError('Не удалось сохранить карточку.')
    } finally {
      setSavingIndex(null)
    }
  }

  async function generateDirectionArticle() {
    if (!directionRequest) {
      setDirectionError('Опиши, куда именно копать по этому стиху.')
      return
    }

    setDirectionLoading(true)
    setDirectionError('')
    setDirectionRaw('')
    setDirectionArticle(null)
    setDirectionActionMessage('')

    try {
      const res = await fetch('/api/moderator/workspace/direction-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          directionRequest,
        }),
      })

      const data: DirectionSearchResponse = await res.json()

      if (!res.ok || !data.article) {
        setDirectionError(data.error || 'Не удалось сгенерировать исследование.')
        setDirectionRaw(data.raw || '')
        return
      }

      setDirectionArticle(data.article)
    } catch {
      setDirectionError('Не удалось сгенерировать исследование.')
    } finally {
      setDirectionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Поле 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              Точная огранка
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Сюда модератор вставляет 1–2 предложения, которые нельзя менять. AI должен только
              достроить карточку вокруг них и предложить несколько вариантов упаковки.
            </p>
            <p className="mt-2 rounded-[14px] border border-stone-300/60 bg-[#fffaf1] px-3 py-2 text-sm leading-6 text-stone-700">
              Вставленный фрагмент сохраняется дословно. AI не переписывает его, а только достраивает
              карточку вокруг него.
            </p>

            <textarea
              value={exactInput}
              onChange={(e) => setExactInput(e.target.value)}
              placeholder="Вставь 1–2 предложения, которые нужно сохранить дословно."
              className="mt-4 h-40 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] text-stone-800 outline-none transition focus:border-stone-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void generateExactBuilder()}
                disabled={exactLoading}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
              >
                {exactLoading ? 'Генерация...' : 'Сгенерировать 3 варианта'}
              </button>
            </div>

            {exactError ? <p className="mt-3 text-sm text-red-700">{exactError}</p> : null}
            {saveError ? <p className="mt-3 text-sm text-red-700">{saveError}</p> : null}
            {saveMessage ? <p className="mt-3 text-sm text-emerald-700">{saveMessage}</p> : null}

            {exactRaw ? (
              <details className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <summary className="cursor-pointer text-sm font-medium text-stone-700">
                  Показать raw output
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                  {exactRaw}
                </pre>
              </details>
            ) : null}

            {exactOptions.length > 0 ? (
              <div className="mt-5 space-y-4">
                {exactOptions.map((option, index) => {
                  const isSaving = savingIndex === index
                  const isSaved = savedIndexes.includes(index)
                  const isRetitling = retitlingIndex === index
                  const retitleOptions = retitleOptionsByIndex[index] ?? []
                  const retitleError = retitleErrorByIndex[index] ?? ''
                  const retitleRaw = retitleRawByIndex[index] ?? ''

                  return (
                    <article
                      key={`${option.title}-${index}`}
                      className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Вариант {index + 1}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold leading-tight text-stone-900">
                        {option.title}
                      </h3>
                      <p className="mt-3 text-[0.97rem] leading-7 text-stone-800">{option.text}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void saveOption(option, index)}
                          disabled={isSaving || isSaved}
                          className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
                        >
                          {isSaving
                            ? 'Сохранение...'
                            : isSaved
                              ? 'Сохранено'
                              : 'Сохранить как карточку'}
                        </button>

                        <button
                          type="button"
                          onClick={() => void generateNewTitles(option, index)}
                          disabled={isRetitling || isSaved}
                          className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc] disabled:opacity-60"
                        >
                          {isRetitling ? 'Ищем заголовки...' : 'Другой заголовок'}
                        </button>

                        {isSaved ? (
                          <span className="text-sm text-emerald-700">Карточка уже сохранена</span>
                        ) : null}
                      </div>

                      {retitleError ? <p className="mt-3 text-sm text-red-700">{retitleError}</p> : null}

                      {retitleOptions.length > 0 ? (
                        <div className="mt-4 rounded-[16px] border border-stone-300/60 bg-[#fdf9f1] px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                            Новые заголовки
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {retitleOptions.map((titleOption) => (
                              <button
                                key={titleOption}
                                type="button"
                                onClick={() => applyRetitle(index, titleOption)}
                                className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                              >
                                {titleOption}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {retitleRaw ? (
                        <details className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                          <summary className="cursor-pointer text-sm font-medium text-stone-700">
                            Показать raw output заголовков
                          </summary>
                          <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                            {retitleRaw}
                          </pre>
                        </details>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
          <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Поле 2
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              Куда копать
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              При желании опиши, как именно хочешь доработать эту мысль. Это поле остаётся свободным:
              ты сам задаёшь направление, если хочешь углубить или перестроить карточку.
            </p>

            <textarea
              value={directionInput}
              onChange={(e) => setDirectionInput(e.target.value)}
              placeholder="При желании опиши, как именно хочешь доработать эту мысль."
              className="mt-4 h-40 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] text-stone-800 outline-none transition focus:border-stone-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void generateDirectionArticle()}
                disabled={directionLoading}
                className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
              >
                {directionLoading ? 'Генерация...' : 'Сгенерировать исследование'}
              </button>
            </div>

            {directionError ? <p className="mt-3 text-sm text-red-700">{directionError}</p> : null}

            {directionRaw ? (
              <details className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <summary className="cursor-pointer text-sm font-medium text-stone-700">
                  Показать raw output
                </summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                  {directionRaw}
                </pre>
              </details>
            ) : null}

            {directionArticle ? (
              <article className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Исследование
                </p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-stone-900">
                  {directionArticle.title}
                </h3>
                <p className="mt-4 text-[1rem] leading-8 text-stone-900">{directionArticle.lead}</p>

                <div className="mt-5 space-y-5">
                  {directionArticle.body.map((paragraph, index) => (
                    <p
                      key={`${index}-${paragraph.slice(0, 24)}`}
                      className="text-[0.98rem] leading-8 text-stone-800"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {directionArticle.quote ? (
                  <blockquote className="mt-5 border-l-2 border-stone-300 pl-4 text-[0.98rem] italic leading-8 text-stone-700">
                    {directionArticle.quote}
                  </blockquote>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void copyDirectionArticle(directionArticle)}
                    className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                  >
                    Скопировать
                  </button>

                  <button
                    type="button"
                    onClick={() => void shareDirectionArticle(directionArticle)}
                    className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                  >
                    Поделиться
                  </button>
                </div>

                {directionActionMessage ? (
                  <p className="mt-3 text-sm text-stone-700">{directionActionMessage}</p>
                ) : null}
              </article>
            ) : savedCards.length > 0 ? (
              <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Уже сохранено по стиху
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Сначала можно посмотреть, какие формулировки уже существуют, а потом запускать
                  новое исследование по другому углу.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
