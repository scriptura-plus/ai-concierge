'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type SavedCard = {
  id: string
  title: string
  text: string
  createdAt: string
}

type RepairOption = {
  title: string
  text: string
}

type RepairBuilderResponse = {
  options?: RepairOption[]
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
  originalCardText: string
  keepText: string
  removeText: string
  directionText: string
  styleMode: RepairStyle
  options: RepairOption[]
  raw: string
}

type RepairStyle = 'neutral' | 'aphoristic' | 'publicistic' | 'analytic'

function normalizeText(value: string) {
  return value.replace(/\r/g, '').trim()
}

function normalizeForCompare(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function containsPreservedText(preservedText: string, candidateText: string) {
  const normalizedPreserved = normalizeForCompare(preservedText)
  if (!normalizedPreserved) return true

  const normalizedCandidate = normalizeForCompare(candidateText)
  return normalizedCandidate.includes(normalizedPreserved)
}

function styleLabel(style: RepairStyle) {
  if (style === 'aphoristic') return 'Афористично'
  if (style === 'publicistic') return 'Публицистично'
  if (style === 'analytic') return 'Аналитично'
  return 'Нейтрально'
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

  const [originalCardText, setOriginalCardText] = useState('')
  const [keepText, setKeepText] = useState('')
  const [removeText, setRemoveText] = useState('')
  const [directionText, setDirectionText] = useState('')
  const [styleMode, setStyleMode] = useState<RepairStyle>('neutral')

  const [options, setOptions] = useState<RepairOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [raw, setRaw] = useState('')

  const [retitlingIndex, setRetitlingIndex] = useState<number | null>(null)
  const [retitleOptionsByIndex, setRetitleOptionsByIndex] = useState<Record<number, string[]>>({})
  const [retitleErrorByIndex, setRetitleErrorByIndex] = useState<Record<number, string>>({})
  const [retitleRawByIndex, setRetitleRawByIndex] = useState<Record<number, string>>({})

  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedIndexes, setSavedIndexes] = useState<number[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [isHydrated, setIsHydrated] = useState(false)

  const normalizedOriginalCardText = useMemo(() => normalizeText(originalCardText), [originalCardText])
  const normalizedKeepText = useMemo(() => normalizeText(keepText), [keepText])
  const normalizedRemoveText = useMemo(() => normalizeText(removeText), [removeText])
  const normalizedDirectionText = useMemo(() => normalizeText(directionText), [directionText])

  const canGenerate = Boolean(
    normalizedOriginalCardText && (normalizedKeepText || normalizedDirectionText || normalizedRemoveText)
  )

  useEffect(() => {
    if (prefillMode) {
      setOriginalCardText(initialExactInput)
      setKeepText('')
      setRemoveText('')
      setDirectionText(initialDirectionInput)
      setStyleMode('neutral')
      setOptions([])
      setRaw('')
      setError('')
      setRetitleOptionsByIndex({})
      setRetitleErrorByIndex({})
      setRetitleRawByIndex({})
      setSaveError('')
      setSavedIndexes([])
      setSaveMessage(
        initialCandidateId
          ? `Материал ${initialCandidateId.slice(0, 8)} загружен в ремонтный режим.`
          : 'Материал загружен в ремонтный режим.'
      )
      setIsHydrated(true)
      return
    }

    try {
      const rawState = sessionStorage.getItem(storageKey)
      if (!rawState) {
        setOriginalCardText('')
        setKeepText('')
        setRemoveText('')
        setDirectionText('')
        setStyleMode('neutral')
        setIsHydrated(true)
        return
      }

      const parsed = JSON.parse(rawState) as Partial<PersistedWorkspaceState>

      setOriginalCardText(typeof parsed.originalCardText === 'string' ? parsed.originalCardText : '')
      setKeepText(typeof parsed.keepText === 'string' ? parsed.keepText : '')
      setRemoveText(typeof parsed.removeText === 'string' ? parsed.removeText : '')
      setDirectionText(typeof parsed.directionText === 'string' ? parsed.directionText : '')
      setStyleMode(
        parsed.styleMode === 'aphoristic' ||
          parsed.styleMode === 'publicistic' ||
          parsed.styleMode === 'analytic'
          ? parsed.styleMode
          : 'neutral'
      )
      setOptions(Array.isArray(parsed.options) ? parsed.options : [])
      setRaw(typeof parsed.raw === 'string' ? parsed.raw : '')
    } catch {
      setOriginalCardText('')
      setKeepText('')
      setRemoveText('')
      setDirectionText('')
      setStyleMode('neutral')
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
      originalCardText,
      keepText,
      removeText,
      directionText,
      styleMode,
      options,
      raw,
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
    originalCardText,
    keepText,
    removeText,
    directionText,
    styleMode,
    options,
    raw,
  ])

  function clearRepairForm() {
    setOriginalCardText('')
    setKeepText('')
    setRemoveText('')
    setDirectionText('')
    setStyleMode('neutral')
    setOptions([])
    setRaw('')
    setError('')
    setRetitleOptionsByIndex({})
    setRetitleErrorByIndex({})
    setRetitleRawByIndex({})
    setSaveError('')
    setSavedIndexes([])
    setSaveMessage('')
  }

  function updateOptionTitle(index: number, value: string) {
    setOptions((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              title: value,
            }
          : item
      )
    )
  }

  function updateOptionText(index: number, value: string) {
    setOptions((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              text: value,
            }
          : item
      )
    )
  }

  async function generateRepairOptions() {
    if (!canGenerate) {
      setError('Нужно вставить текст карточки и указать хотя бы что оставить, что убрать или куда повести мысль.')
      return
    }

    setLoading(true)
    setError('')
    setRaw('')
    setOptions([])
    setRetitleOptionsByIndex({})
    setRetitleErrorByIndex({})
    setRetitleRawByIndex({})
    setSaveError('')
    setSaveMessage('')
    setSavedIndexes([])

    try {
      const res = await fetch('/api/moderator/workspace/repair-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          originalCardText: normalizedOriginalCardText,
          keepText: normalizedKeepText,
          removeText: normalizedRemoveText,
          directionText: normalizedDirectionText,
          styleMode,
        }),
      })

      const data: RepairBuilderResponse = await res.json()

      if (!res.ok || !Array.isArray(data.options) || data.options.length === 0) {
        setError(data.error || 'Не удалось сгенерировать варианты ремонта.')
        setRaw(data.raw || '')
        setOptions([])
        return
      }

      const validOptions = data.options.filter((item) =>
        containsPreservedText(normalizedKeepText, item.text)
      )

      if (normalizedKeepText && validOptions.length === 0) {
        setError('Модель не сохранила указанный фрагмент. Попробуй ещё раз или сократи блок «Что оставить».')
        setRaw(data.raw || '')
        setOptions([])
        return
      }

      setOptions(normalizedKeepText ? validOptions : data.options)
    } catch {
      setError('Не удалось сгенерировать варианты ремонта.')
      setOptions([])
    } finally {
      setLoading(false)
    }
  }

  async function generateNewTitles(option: RepairOption, index: number) {
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
    setOptions((prev) =>
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

  async function saveOption(option: RepairOption, index: number) {
    const normalizedTitle = normalizeText(option.title)
    const normalizedText = normalizeText(option.text)

    if (!normalizedTitle || !normalizedText) {
      setSaveError('Нельзя сохранить пустой заголовок или пустой текст карточки.')
      return
    }

    if (!containsPreservedText(normalizedKeepText, normalizedText)) {
      setSaveError('Эту карточку нельзя сохранить: указанный фрагмент не сохранён.')
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
          titleRu: normalizedTitle,
          textRu: normalizedText,
          mode: 'insights',
          angleNote: normalizedKeepText || normalizedDirectionText || null,
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

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
        <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
              Ремонт карточки
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
              Доработать и пересобрать
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Верх экрана отвечает за отбор. Здесь — ремонт: сохраняем сильное ядро, убираем слабое,
              задаём направление и получаем 3 новых варианта карточки.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Исходная карточка
                </span>
                <textarea
                  value={originalCardText}
                  onChange={(e) => setOriginalCardText(e.target.value)}
                  placeholder="Сюда подставляется текст карточки, которую нужно доработать."
                  className="mt-2 h-56 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] leading-7 text-stone-800 outline-none transition focus:border-stone-500"
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setKeepText(normalizedOriginalCardText)}
                  className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Взять всё в «Что оставить»
                </button>

                <button
                  type="button"
                  onClick={clearRepairForm}
                  className="rounded-full border border-stone-300 bg-[#fffaf1] px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
                >
                  Очистить всё
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Что оставить
                </span>
                <textarea
                  value={keepText}
                  onChange={(e) => setKeepText(e.target.value)}
                  placeholder="Вставь 1–2 сильные фразы, которые нельзя потерять."
                  className="mt-2 h-28 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] leading-7 text-stone-800 outline-none transition focus:border-stone-500"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Что убрать
                </span>
                <textarea
                  value={removeText}
                  onChange={(e) => setRemoveText(e.target.value)}
                  placeholder="Например: убрать слабый хвост, убрать общие слова, не повторять вторую мысль."
                  className="mt-2 h-24 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] leading-7 text-stone-800 outline-none transition focus:border-stone-500"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Куда повести мысль
                </span>
                <textarea
                  value={directionText}
                  onChange={(e) => setDirectionText(e.target.value)}
                  placeholder="Например: сделать акцент на контрасте, усилить мысль о совести, связать сильнее с воскресением."
                  className="mt-2 h-28 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] leading-7 text-stone-800 outline-none transition focus:border-stone-500"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Стиль упаковки
                </span>

                <select
                  value={styleMode}
                  onChange={(e) => setStyleMode(e.target.value as RepairStyle)}
                  className="mt-2 w-full rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-3 text-[0.97rem] text-stone-800 outline-none transition focus:border-stone-500"
                >
                  <option value="neutral">{styleLabel('neutral')}</option>
                  <option value="aphoristic">{styleLabel('aphoristic')}</option>
                  <option value="publicistic">{styleLabel('publicistic')}</option>
                  <option value="analytic">{styleLabel('analytic')}</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void generateRepairOptions()}
              disabled={loading || !canGenerate}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
            >
              {loading ? 'Генерация...' : 'Сгенерировать 3 варианта'}
            </button>
          </div>

          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          {saveError ? <p className="mt-3 text-sm text-red-700">{saveError}</p> : null}
          {saveMessage ? <p className="mt-3 text-sm text-emerald-700">{saveMessage}</p> : null}

          {raw ? (
            <details className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">
                Показать raw output
              </summary>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                {raw}
              </pre>
            </details>
          ) : null}

          {options.length > 0 ? (
            <div className="mt-6 space-y-4">
              {options.map((option, index) => {
                const isSaving = savingIndex === index
                const isSaved = savedIndexes.includes(index)
                const isRetitling = retitlingIndex === index
                const retitleOptions = retitleOptionsByIndex[index] ?? []
                const retitleError = retitleErrorByIndex[index] ?? ''
                const retitleRaw = retitleRawByIndex[index] ?? ''

                return (
                  <article
                    key={`${index}-${option.title}`}
                    className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Вариант {index + 1}
                    </p>

                    <label className="mt-3 block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Заголовок
                      </span>
                      <input
                        type="text"
                        value={option.title}
                        onChange={(e) => updateOptionTitle(index, e.target.value)}
                        className="mt-2 w-full rounded-[14px] border border-stone-300 bg-white px-4 py-3 text-[1rem] font-semibold text-stone-900 outline-none transition focus:border-stone-500"
                      />
                    </label>

                    <label className="mt-4 block">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Текст карточки
                      </span>
                      <textarea
                        value={option.text}
                        onChange={(e) => updateOptionText(index, e.target.value)}
                        className="mt-2 h-64 w-full resize-none rounded-[18px] border border-stone-300 bg-white px-4 py-4 text-[0.98rem] leading-7 text-stone-800 outline-none transition focus:border-stone-500"
                      />
                    </label>

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
                        {isRetitling ? 'Ищем заголовки...' : 'Переделать заголовок'}
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
          ) : savedCards.length > 0 ? (
            <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Уже сохранено по стиху
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Здесь мы ремонтируем только кандидатов. Сохранённые карточки выше остаются ориентиром
                по уже собранному слою.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
