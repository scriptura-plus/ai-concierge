'use client'

import { useMemo, useState } from 'react'
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

type WordMapNode = {
  focus_label: string
  original_word: string
  transliteration: string
  core_meaning: string
  why_it_matters: string
  dig_deeper_hint: string
}

type ModeratorWordLensResponse = {
  payload?: WordMapNode[]
  error?: string
  raw?: string
}

type DeepWordArticle = {
  title: string
  lead: string
  body: string[]
  quote?: string
}

type DeepWordArticleResponse = {
  article?: DeepWordArticle
  error?: string
  raw?: string
}

type WorkspaceClientProps = {
  reference: string
  verseText: string
  savedCards: SavedCard[]
  book: string
  chapter: number
  verse: number
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

export default function WorkspaceClient({
  reference,
  verseText,
  savedCards,
  book,
  chapter,
  verse,
}: WorkspaceClientProps) {
  const router = useRouter()

  const [exactInput, setExactInput] = useState('')
  const [exactOptions, setExactOptions] = useState<ExactBuilderOption[]>([])
  const [exactLoading, setExactLoading] = useState(false)
  const [exactError, setExactError] = useState('')
  const [exactRaw, setExactRaw] = useState('')

  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [savedIndexes, setSavedIndexes] = useState<number[]>([])
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const [directionInput, setDirectionInput] = useState('')
  const [directionArticle, setDirectionArticle] = useState<DirectionArticle | null>(null)
  const [directionLoading, setDirectionLoading] = useState(false)
  const [directionError, setDirectionError] = useState('')
  const [directionRaw, setDirectionRaw] = useState('')

  const [wordLensPayload, setWordLensPayload] = useState<WordMapNode[] | null>(null)
  const [wordLensLoading, setWordLensLoading] = useState(false)
  const [wordLensError, setWordLensError] = useState('')
  const [wordLensRaw, setWordLensRaw] = useState('')

  const [deepWordIndex, setDeepWordIndex] = useState<number | null>(null)
  const [deepWordArticle, setDeepWordArticle] = useState<DeepWordArticle | null>(null)
  const [deepWordLoadingIndex, setDeepWordLoadingIndex] = useState<number | null>(null)
  const [deepWordError, setDeepWordError] = useState('')
  const [deepWordRaw, setDeepWordRaw] = useState('')

  const sacredPassage = useMemo(() => normalizeText(exactInput), [exactInput])
  const directionRequest = useMemo(() => normalizeText(directionInput), [directionInput])

  async function generateExactBuilder() {
    if (!sacredPassage) {
      setExactError('Вставь 1–2 предложения, которые нужно сохранить дословно.')
      return
    }

    setExactLoading(true)
    setExactError('')
    setExactRaw('')
    setSaveMessage('')
    setSaveError('')
    setSavedIndexes([])

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

  async function generateWordLens() {
    setWordLensLoading(true)
    setWordLensError('')
    setWordLensRaw('')
    setWordLensPayload(null)
    setDeepWordIndex(null)
    setDeepWordArticle(null)
    setDeepWordError('')
    setDeepWordRaw('')

    try {
      const res = await fetch('/api/moderator/workspace/word-lens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
        }),
      })

      const data: ModeratorWordLensResponse = await res.json()

      if (!res.ok || !data.payload || data.payload.length === 0) {
        setWordLensError(data.error || 'Не удалось сгенерировать линзу «Слово».')
        setWordLensRaw(data.raw || '')
        return
      }

      setWordLensPayload(data.payload)
    } catch {
      setWordLensError('Не удалось сгенерировать линзу «Слово».')
    } finally {
      setWordLensLoading(false)
    }
  }

  async function generateDeepWordArticle(node: WordMapNode, index: number) {
    setDeepWordLoadingIndex(index)
    setDeepWordError('')
    setDeepWordRaw('')
    setDeepWordIndex(index)
    setDeepWordArticle(null)

    try {
      const res = await fetch('/api/moderator/workspace/word-lens/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          focus_label: node.focus_label,
          original_word: node.original_word,
          transliteration: node.transliteration,
          core_meaning: node.core_meaning,
          why_it_matters: node.why_it_matters,
          dig_deeper_hint: node.dig_deeper_hint,
        }),
      })

      const data: DeepWordArticleResponse = await res.json()

      if (!res.ok || !data.article) {
        setDeepWordError(data.error || 'Не удалось сгенерировать глубокое исследование по слову.')
        setDeepWordRaw(data.raw || '')
        return
      }

      setDeepWordArticle(data.article)
    } catch {
      setDeepWordError('Не удалось сгенерировать глубокое исследование по слову.')
    } finally {
      setDeepWordLoadingIndex(null)
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

                      <div className="mt-4 flex items-center gap-3">
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

                        {isSaved ? (
                          <span className="text-sm text-emerald-700">Карточка уже сохранена</span>
                        ) : null}
                      </div>
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
              Сюда модератор формулирует направление поиска: какой угол интересует, что хочется
              найти, какой оттенок мысли нужен. Сейчас это поле генерирует длинный unfold-style
              разворот мысли по заданному направлению.
            </p>

            <textarea
              value={directionInput}
              onChange={(e) => setDirectionInput(e.target.value)}
              placeholder="Опиши, куда именно копать по этому стиху. Например: почему здесь знание связано не с объемом информации, а с типом отношения?"
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
                    <p key={`${index}-${paragraph.slice(0, 24)}`} className="text-[0.98rem] leading-8 text-stone-800">
                      {paragraph}
                    </p>
                  ))}
                </div>

                {directionArticle.quote ? (
                  <blockquote className="mt-5 border-l-2 border-stone-300 pl-4 text-[0.98rem] italic leading-8 text-stone-700">
                    {directionArticle.quote}
                  </blockquote>
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

      <section className="rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
        <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Линза 1
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                Слово
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
                Эта линза строит semantic map стиха и показывает 3–5 ключевых слов или выражений,
                которые реально несут смысловую нагрузку. Из любого узла можно сразу пойти в
                глубокое word-study исследование.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void generateWordLens()}
              disabled={wordLensLoading}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
            >
              {wordLensLoading ? 'Генерация...' : 'Построить карту слов'}
            </button>
          </div>

          {wordLensError ? <p className="mt-3 text-sm text-red-700">{wordLensError}</p> : null}

          {wordLensRaw ? (
            <details className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">
                Показать raw output
              </summary>
              <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                {wordLensRaw}
              </pre>
            </details>
          ) : null}

          {wordLensPayload ? (
            <div className="mt-5 space-y-4">
              {wordLensPayload.map((item, index) => {
                const isDeepLoading = deepWordLoadingIndex === index
                const isDeepOpen = deepWordIndex === index && !!deepWordArticle

                return (
                  <article
                    key={`${item.focus_label}-${index}`}
                    className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                      Узел {index + 1}
                    </p>

                    <div className="mt-3 grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Слово / выражение в стихе
                        </p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-stone-900">
                          {item.focus_label}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Исходное слово
                        </p>
                        <p className="mt-2 text-lg font-semibold leading-7 text-stone-900">
                          {item.original_word}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-stone-700">
                          {item.transliteration}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-[16px] border border-stone-300/50 bg-[#fdf9f1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Semantic core
                        </p>
                        <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                          {item.core_meaning}
                        </p>
                      </div>

                      <div className="rounded-[16px] border border-stone-300/50 bg-[#fdf9f1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Почему это важно
                        </p>
                        <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                          {item.why_it_matters}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[16px] border border-stone-300/50 bg-[#fdf9f1] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                        Куда копать дальше
                      </p>
                      <p className="mt-2 text-[0.97rem] leading-7 text-stone-800">
                        {item.dig_deeper_hint}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void generateDeepWordArticle(item, index)}
                        disabled={isDeepLoading}
                        className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
                      >
                        {isDeepLoading ? 'Генерация...' : 'Копать глубже'}
                      </button>

                      {isDeepOpen ? (
                        <span className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700">
                          Открыто текущее исследование
                        </span>
                      ) : null}
                    </div>

                    {deepWordIndex === index && deepWordError ? (
                      <p className="mt-3 text-sm text-red-700">{deepWordError}</p>
                    ) : null}

                    {deepWordIndex === index && deepWordRaw ? (
                      <details className="mt-3 rounded-[18px] border border-stone-300/60 bg-[#fdf9f1] px-4 py-4">
                        <summary className="cursor-pointer text-sm font-medium text-stone-700">
                          Показать raw output
                        </summary>
                        <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6 text-stone-700">
                          {deepWordRaw}
                        </pre>
                      </details>
                    ) : null}

                    {deepWordIndex === index && deepWordArticle ? (
                      <article className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fdf9f1] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                          Глубокое исследование
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold leading-tight text-stone-900">
                          {deepWordArticle.title}
                        </h3>
                        <p className="mt-4 text-[1rem] leading-8 text-stone-900">
                          {deepWordArticle.lead}
                        </p>

                        <div className="mt-5 space-y-5">
                          {deepWordArticle.body.map((paragraph, paragraphIndex) => (
                            <p
                              key={`${paragraphIndex}-${paragraph.slice(0, 24)}`}
                              className="text-[0.98rem] leading-8 text-stone-800"
                            >
                              {paragraph}
                            </p>
                          ))}
                        </div>

                        {deepWordArticle.quote ? (
                          <blockquote className="mt-5 border-l-2 border-stone-300 pl-4 text-[0.98rem] italic leading-8 text-stone-700">
                            {deepWordArticle.quote}
                          </blockquote>
                        ) : null}
                      </article>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
