'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

type SourceMode = 'insights' | 'word' | 'tension' | 'why_this_phrase'

type InsightOption = {
  title: string
  text: string
}

type SaveCandidatesResponse = {
  ok?: boolean
  insertedCount?: number
  reviewHref?: string
  error?: string
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

function actionStatusLabel(params: {
  loading: boolean
  savingCandidates: boolean
  optionsCount: number
  selectedPassage: string
}) {
  if (params.savingCandidates) return 'Кандидаты отправляются в review…'
  if (params.loading) return 'Генерируем 3 варианта из выбранного фрагмента…'
  if (params.optionsCount === 3) return 'Варианты готовы. Можно отправить их в review.'
  if (params.selectedPassage.trim()) return 'Фрагмент вставлен. Можно запускать генерацию.'
  return 'Вставь 1–2 сильные фразы из статьи и запусти генерацию.'
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
  const [savingCandidates, setSavingCandidates] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canGenerate = useMemo(() => selectedPassage.trim().length > 0, [selectedPassage])
  const canSendToReview = options.length === 3 && selectedPassage.trim().length > 0

  const actionLabel = actionStatusLabel({
    loading,
    savingCandidates,
    optionsCount: options.length,
    selectedPassage,
  })

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

      if (
        typeof data.normalizedSelectedPassage === 'string' &&
        data.normalizedSelectedPassage.trim()
      ) {
        setSelectedPassage(data.normalizedSelectedPassage.trim())
      }

      setOptions(data.options as InsightOption[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сгенерировать варианты инсайта.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendToReview() {
    if (!canSendToReview) return

    setSavingCandidates(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch(`/api/moderator/unfolds/${unfoldId}/save-candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          sourceMode,
          selectedPassage: selectedPassage.trim(),
          options,
        }),
      })

      const data: SaveCandidatesResponse = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Не удалось отправить кандидатов в review.')
      }

      const insertedCount = Number(data.insertedCount ?? 0)
      const reviewHref = String(data.reviewHref ?? '').trim()

      if (insertedCount > 0) {
        setSuccess(`В review отправлено ${insertedCount} кандидата(ов).`)
      } else {
        setSuccess('Новых кандидатов не добавилось: такие варианты уже были в review.')
      }

      if (reviewHref) {
        router.push(
          `${reviewHref}?flash=success&message=${encodeURIComponent(
            insertedCount > 0
              ? `Из unfold добавлено ${insertedCount} кандидата(ов).`
              : 'Новых кандидатов не добавилось: такие варианты уже были в review.'
          )}`
        )
        return
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить кандидатов в review.')
    } finally {
      setSavingCandidates(false)
    }
  }

  return (
    <section className="mb-6 rounded-[28px] border border-stone-300/70 bg-[linear-gradient(180deg,#f6ecd6_0%,#efe2bf_100%)] p-5 shadow-[0_16px_34px_rgba(94,72,37,0.10)]">
      <div className="rounded-[22px] border border-stone-400/20 bg-[radial-gradient(circle_at_top,#fbf5e8_0%,#f2e7cf_55%,#ead9b6_100%)] px-5 py-5 shadow-inner">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Кандидаты из unfold
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
            Собрать карточки из выбранного фрагмента
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Вставь 1–2 «жемчужные» фразы из unfold. ИИ удержит тот же угол, создаст 3 сильных
            варианта и отправит их в обычный review-поток как новые кандидаты.
          </p>
        </div>

        <div className="mb-4 rounded-[16px] border border-stone-300/60 bg-[#fffaf1] px-4 py-3">
          <p className="text-sm leading-6 text-stone-700">{actionLabel}</p>
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            Выбранный фрагмент
          </span>

          <textarea
            value={selectedPassage}
            onChange={(e) => setSelectedPassage(e.target.value)}
            rows={7}
            placeholder="Вставь сюда 1–2 точные фразы из unfold..."
            className="mt-2 w-full resize-none rounded-[18px] border border-stone-300 bg-[#fffaf1] px-4 py-4 text-[1rem] leading-8 text-stone-900 outline-none transition focus:border-stone-500 focus:bg-white placeholder:text-stone-400"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || loading || savingCandidates}
            className="min-h-[48px] rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-stone-50 shadow-[0_10px_22px_rgba(28,25,23,0.18)] transition active:scale-[0.99] hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Генерация…' : 'Сгенерировать 3 варианта'}
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedPassage('')
              setOptions([])
              setError('')
              setSuccess('')
            }}
            disabled={loading || savingCandidates}
            className="min-h-[48px] rounded-full border border-stone-300 bg-[#fffaf1] px-5 py-3 text-sm font-medium text-stone-700 transition active:scale-[0.99] hover:bg-[#f8efdc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Очистить
          </button>

          {options.length === 3 ? (
            <button
              type="button"
              onClick={handleSendToReview}
              disabled={!canSendToReview || savingCandidates || loading}
              className="min-h-[48px] rounded-full border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-800 shadow-[0_10px_22px_rgba(16,185,129,0.08)] transition active:scale-[0.99] hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingCandidates ? 'Отправляем в review…' : 'Отправить 3 кандидата в review'}
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
            {success}
          </div>
        ) : null}

        {options.length > 0 ? (
          <div className="mt-6 space-y-4">
            {options.map((option, index) => (
              <article
                key={`${option.title}-${index}`}
                className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 shadow-[0_6px_18px_rgba(94,72,37,0.05)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="rounded-full border border-stone-300 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {optionLabel(index)}
                  </p>
                </div>

                <h3 className="mt-3 text-[1.35rem] font-semibold leading-8 text-stone-900">
                  {option.title}
                </h3>

                <p className="mt-3 whitespace-pre-wrap text-[1rem] leading-8 text-stone-800">
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
