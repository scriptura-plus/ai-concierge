'use client'

import { useMemo, useState } from 'react'

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

function looksContainedVerbatim(sacredPassage: string, candidateText: string) {
  const normalizedSacred = sacredPassage.replace(/\s+/g, ' ').trim()
  const normalizedCandidate = candidateText.replace(/\s+/g, ' ').trim()
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
  const [exactInput, setExactInput] = useState('')
  const [exactOptions, setExactOptions] = useState<ExactBuilderOption[]>([])
  const [exactLoading, setExactLoading] = useState(false)
  const [exactError, setExactError] = useState('')
  const [exactRaw, setExactRaw] = useState('')

  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const sacredPassage = useMemo(() => normalizeText(exactInput), [exactInput])

  async function generateExactBuilder(mode: 'fresh' | 'more') {
    if (!sacredPassage) {
      setExactError('Вставь 1–2 предложения, которые нужно сохранить дословно.')
      return
    }

    setExactLoading(true)
    setExactError('')
    setExactRaw('')
    setSaveMessage('')
    setSaveError('')

    try {
      const res = await fetch('/api/moderator/workspace/exact-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          sacredPassage,
          mode,
        }),
      })

      const data: ExactBuilderResponse = await res.json()

      if (!res.ok || !Array.isArray(data.options) || data.options.length === 0) {
        setExactError(data.error || 'Не удалось сгенерировать варианты.')
        setExactRaw(data.raw || '')
        return
      }

      const filtered = data.options.filter((item) =>
        looksContainedVerbatim(sacredPassage, `${item.title} ${item.text}`)
      )

      setExactOptions(filtered.length > 0 ? filtered : data.options)
    } catch {
      setExactError('Не удалось сгенерировать варианты.')
    } finally {
      setExactLoading(false)
    }
  }

  async function saveOption(option: ExactBuilderOption, index: number) {
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

      setSaveMessage(`Карточка ${index + 1} сохранена.`)
    } catch {
      setSaveError('Не удалось сохранить карточку.')
    } finally {
      setSavingIndex(null)
    }
  }

  return (
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

          <textarea
            value={exactInput}
            onChange={(e) => setExactInput(e.target.value)}
            placeholder="Вставь 1–2 предложения, которые нужно сохранить дословно."
            className="mt-4 h-40 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] text-stone-800 outline-none transition focus:border-stone-500"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void generateExactBuilder('fresh')}
              disabled={exactLoading}
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
            >
              {exactLoading ? 'Генерация...' : 'Сгенерировать 3 варианта'}
            </button>

            <button
              type="button"
              onClick={() => void generateExactBuilder('more')}
              disabled={exactLoading || !sacredPassage}
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc] disabled:opacity-60"
            >
              Ещё варианты
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
              {exactOptions.map((option, index) => (
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

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => void saveOption(option, index)}
                      disabled={savingIndex === index}
                      className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:opacity-60"
                    >
                      {savingIndex === index ? 'Сохранение...' : 'Сохранить как карточку'}
                    </button>
                  </div>
                </article>
              ))}
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
            найти, какой оттенок мысли нужен. Это поле будет следующим этапом.
          </p>

          <textarea
            disabled
            placeholder="Скоро здесь будет рабочее поле: опиши, куда именно копать по этому стиху."
            className="mt-4 h-40 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.97rem] text-stone-700 outline-none opacity-80"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled
              className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 opacity-60"
            >
              Сгенерировать идеи
            </button>

            <button
              type="button"
              disabled
              className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 opacity-60"
            >
              Ещё глубже
            </button>
          </div>

          {savedCards.length > 0 ? (
            <div className="mt-5 rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                Уже сохранено по стиху
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-700">
                Сначала можно посмотреть, какие формулировки уже существуют, а потом запускать
                directed search по новым углам.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
