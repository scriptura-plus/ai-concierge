'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type CandidateItem = {
  id: string
  title: string
  text: string
  status: string
  statusClassName: string
  sourceLabel: string
  updatedLabel: string
  angleNote: string | null
  repairHref: string
  promoteAction: string
  rejectAction: string
  returnTo: string
}

type RetitleResponse = {
  titles?: string[]
  error?: string
  raw?: string
}

type UpdateTitleResponse = {
  ok?: boolean
  error?: string
}

type Props = {
  reference: string
  verseText: string
  items: CandidateItem[]
}

export default function NewCandidatesList({ reference, verseText, items }: Props) {
  const router = useRouter()

  const [openRetitleId, setOpenRetitleId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [applyLoadingId, setApplyLoadingId] = useState<string | null>(null)

  const [titlesById, setTitlesById] = useState<Record<string, string[]>>({})
  const [errorById, setErrorById] = useState<Record<string, string>>({})
  const [rawById, setRawById] = useState<Record<string, string>>({})

  async function handleGenerateTitles(item: CandidateItem) {
    const isSameOpen = openRetitleId === item.id
    const existingTitles = titlesById[item.id] ?? []

    if (isSameOpen && existingTitles.length > 0) {
      setOpenRetitleId(null)
      return
    }

    setOpenRetitleId(item.id)
    setLoadingId(item.id)
    setErrorById((prev) => ({ ...prev, [item.id]: '' }))
    setRawById((prev) => ({ ...prev, [item.id]: '' }))

    try {
      const res = await fetch('/api/moderator/workspace/retitle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          verseText,
          currentTitle: item.title,
          cardText: item.text,
        }),
      })

      const data: RetitleResponse = await res.json()

      if (!res.ok || !Array.isArray(data.titles) || data.titles.length === 0) {
        setErrorById((prev) => ({
          ...prev,
          [item.id]: data.error || 'Не удалось предложить новые заголовки.',
        }))
        setRawById((prev) => ({
          ...prev,
          [item.id]: data.raw || '',
        }))
        return
      }

      setTitlesById((prev) => ({
        ...prev,
        [item.id]: data.titles ?? [],
      }))
    } catch {
      setErrorById((prev) => ({
        ...prev,
        [item.id]: 'Не удалось предложить новые заголовки.',
      }))
    } finally {
      setLoadingId(null)
    }
  }

  async function handleApplyTitle(item: CandidateItem, newTitle: string) {
    setApplyLoadingId(item.id)
    setErrorById((prev) => ({ ...prev, [item.id]: '' }))

    try {
      const res = await fetch(`/api/moderator/candidates/${item.id}/update-title`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleRu: newTitle,
          returnTo: item.returnTo,
        }),
      })

      const data: UpdateTitleResponse = await res.json()

      if (!res.ok || !data.ok) {
        setErrorById((prev) => ({
          ...prev,
          [item.id]: data.error || 'Не удалось обновить заголовок.',
        }))
        return
      }

      setOpenRetitleId(null)
      router.refresh()
    } catch {
      setErrorById((prev) => ({
        ...prev,
        [item.id]: 'Не удалось обновить заголовок.',
      }))
    } finally {
      setApplyLoadingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[18px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 text-sm leading-6 text-stone-700">
        Сейчас нет новых кандидатов. Можно сразу работать ниже в мастерской.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const isRetitleOpen = openRetitleId === item.id
        const isLoadingTitles = loadingId === item.id
        const isApplyingTitle = applyLoadingId === item.id
        const retitleOptions = titlesById[item.id] ?? []
        const retitleError = errorById[item.id] ?? ''
        const retitleRaw = rawById[item.id] ?? ''

        return (
          <article
            key={item.id}
            className="rounded-[20px] border border-stone-300/60 bg-[#fffaf1] px-4 py-4 shadow-[0_6px_16px_rgba(94,72,37,0.05)]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${item.statusClassName}`}
              >
                {item.status}
              </span>

              <span className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700">
                Источник: {item.sourceLabel}
              </span>

              <span className="text-xs text-stone-500">{item.updatedLabel}</span>
            </div>

            <h3 className="mt-3 text-[1.45rem] font-semibold leading-tight text-stone-900">
              {item.title}
            </h3>

            <div className="mt-3 whitespace-pre-wrap text-[1rem] leading-8 text-stone-800">
              {item.text}
            </div>

            {item.angleNote ? (
              <div className="mt-4 rounded-[16px] border border-stone-300/50 bg-[#fdf9f1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Комментарий к углу
                </p>
                <p className="mt-2 text-[0.95rem] leading-7 text-stone-800">{item.angleNote}</p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <form action={item.promoteAction} method="POST">
                <input type="hidden" name="returnTo" value={item.returnTo} />
                <button
                  type="submit"
                  className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-50 transition hover:bg-stone-800"
                >
                  Сохранить
                </button>
              </form>

              <button
                type="button"
                onClick={() => void handleGenerateTitles(item)}
                disabled={isLoadingTitles || isApplyingTitle}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc] disabled:opacity-60"
              >
                {isLoadingTitles
                  ? 'Ищем...'
                  : isRetitleOpen && retitleOptions.length > 0
                    ? 'Скрыть заголовки'
                    : 'Переделать заголовок'}
              </button>

              <a
                href={item.repairHref}
                className="rounded-full border border-stone-300 bg-[#fffaf1] px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc]"
              >
                Доработать
              </a>

              <form action={item.rejectAction} method="POST">
                <input type="hidden" name="returnTo" value={item.returnTo} />
                <button
                  type="submit"
                  className="rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                >
                  Отклонить
                </button>
              </form>
            </div>

            {retitleError ? <p className="mt-3 text-sm text-red-700">{retitleError}</p> : null}

            {isRetitleOpen && retitleOptions.length > 0 ? (
              <div className="mt-4 rounded-[16px] border border-stone-300/60 bg-[#fdf9f1] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                  Новые заголовки
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {retitleOptions.map((titleOption) => (
                    <button
                      key={`${item.id}-${titleOption}`}
                      type="button"
                      onClick={() => void handleApplyTitle(item, titleOption)}
                      disabled={isApplyingTitle}
                      className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-[#f8efdc] disabled:opacity-60"
                    >
                      {isApplyingTitle ? 'Сохраняем...' : titleOption}
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
  )
}
