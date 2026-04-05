'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type InsightOption = {
  title: string
  text: string
}

type Props = {
  unfoldId: string
  reference: string
  sourceMode: SourceMode
  sourceTitle: string
  sourceText: string
  unfoldText: string
}

function optionLabel(index: number) {
  if (index === 0) return 'Вариант 1'
  if (index === 1) return 'Вариант 2'
  return 'Вариант 3'
}

export default function InsightBuilder({
  unfoldId,
  reference,
  sourceMode,
  sourceTitle,
  sourceText,
  unfoldText,
}: Props) {
  const router = useRouter()

  const [selectedPassage, setSelectedPassage] = useState('')
  const [options, setOptions] = useState<InsightOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [promotingIndex, setPromotingIndex] = useState<number | null>(null)

  const canGenerate = useMemo(() => selectedPassage.trim().length > 0, [selectedPassage])

  async function handleGenerate() {
    if (!canGenerate) return

    setLoading(true)
    setError('')
    setSuccess('')
    setOptions([])

    try {
      const res = await fetch(`/api/moderator/unfolds/${unfoldId}/insight-options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          sourceMode,
          sourceTitle,
          sourceText,
          unfoldText,
          selectedPassage: selectedPassage.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !Array.isArray(data.options)) {
        throw new Error(data.error || 'Не удалось сгенерировать варианты инсайта.')
      }

      if (typeof data.normalizedSelectedPassage === 'string' && data.normalizedSelectedPassage.trim()) {
        setSelectedPassage(data.normalizedSelectedPassage.trim())
      }

      setOptions(data.options as InsightOption[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сгенерировать варианты инсайта.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePromote(option: InsightOption, index: number) {
    setPromotingIndex(index)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/moderator/unfolds/${unfoldId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          sourceMode,
          selectedPassage: selectedPassage.trim(),
          title: option.title,
          text: option.text,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось сохранить выбранный инсайт.')
      }

      setSuccess('Карточка сохранена в curated insights.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить выбранный инсайт.')
    } finally {
      setPromotingIndex(null)
    }
  }

  return (
    <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
      <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Конструктор инсайта по фрагменту
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
            Собрать карточку из выбранного фрагмента
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Вставь 1–2 «жемчужные» фразы из unfold. Выбранный фрагмент должен сохраниться дословно.
            ИИ удержит тот же угол и предложит ровно 3 полноразмерных варианта карточки.
          </p>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Выбранный фрагмент
          </span>
          <textarea
            value={selectedPassage}
            onChange={(e) => setSelectedPassage(e.target.value)}
            rows={6}
            placeholder="Вставь сюда 1–2 точные фразы из unfold..."
            className="mt-2 w-full rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[0.98rem] leading-7 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || loading}
            className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Генерация...' : 'Сгенерировать 3 варианта'}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedPassage('')
              setOptions([])
              setError('')
              setSuccess('')
            }}
            className="rounded-full border border-stone-300 bg-[#fffaf1] px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
          >
            Очистить
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}

        {options.length > 0 ? (
          <div className="mt-6 space-y-4">
            {options.map((option, index) => (
              <article
                key={`${option.title}-${index}`}
                className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {optionLabel(index)}
                  </p>

                  <button
                    type="button"
                    onClick={() => handlePromote(option, index)}
                    disabled={promotingIndex !== null}
                    className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {promotingIndex === index ? 'Сохранение...' : 'Использовать'}
                  </button>
                </div>

                <h3 className="mt-3 text-xl font-semibold leading-8 text-stone-900">
                  {option.title}
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-[0.98rem] leading-8 text-stone-800">
                  {option.text}
                </p>
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
